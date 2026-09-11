import { prisma } from "../db";
import type { Channel } from "@prisma/client";
import { businessKnowledge, crmBusyWindow } from "./knowledge";
import {
  bookAppointment,
  cancelAppointment,
  ensureCustomer,
  fmt,
  listAvailability,
  rescheduleAppointment,
} from "./booking";

import { agentsFor, CLIENT_VOICE } from "../brand";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

type ToolTenant = {
  id: string;
  name: string;
  vertical?: string;
  services: { id: string; name: string; durationMin: number; priceCents: number }[];
  staff: { id: string; name: string }[];
  branches: { id: string; name: string }[];
};

const tools = [
  {
    type: "function" as const,
    function: {
      name: "guardar_cliente",
      description: "Guarda o actualiza el nombre del cliente de este teléfono.",
      parameters: {
        type: "object",
        properties: { nombre: { type: "string" } },
        required: ["nombre"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_crm",
      description: "Consulta el CRM: cliente por nombre/teléfono o citas ya agendadas que ocupan la agenda.",
      parameters: {
        type: "object",
        properties: {
          busqueda: { type: "string", description: "nombre, teléfono o la palabra agenda" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "ver_disponibilidad",
      description:
        "Lista huecos libres según horario de sede y citas ya ocupadas en el CRM. Si el cliente pide un día concreto (ej. 16 de septiembre), pásalo en cuando para no inventar que está cerrado.",
      parameters: {
        type: "object",
        properties: {
          servicio: { type: "string" },
          cuando: {
            type: "string",
            description: "Fecha u hora pedida, ej. 16 de septiembre, 2026-09-16, viernes, 10:00",
          },
        },
        required: ["servicio"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "agendar",
      description:
        "Crea una reserva en un hueco libre. cuando puede ser 16 de septiembre, 2026-09-16, 2026-09-16T10:00 o 09:15 (Bogotá). Si el cliente elige un hueco que listaste, usa ese cuando y confirma solo si la herramienta dice Confirmado.",
      parameters: {
        type: "object",
        properties: {
          servicio: { type: "string" },
          nombre: { type: "string" },
          cuando: { type: "string" },
          profesional: { type: "string" },
        },
        required: ["servicio"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "cancelar_cita",
      description: "Cancela la cita activa de este teléfono.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "reprogramar_cita",
      description:
        "Mueve la cita activa. cuando puede ser 09:15 o 2026-09-11T09:15. Si el cliente elige un hueco listado, reprograma con esa hora. No digas ocupado si la herramienta devolvió Reprogramé o una lista de huecos LIBRES.",
      parameters: {
        type: "object",
        properties: { cuando: { type: "string" } },
      },
    },
  },
];

async function openaiFetch(url: string, init: RequestInit, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function synthesizeVoiceMp3(text: string, voice?: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const res = await openaiFetch(
    "https://api.openai.com/v1/audio/speech",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: voice || CLIENT_VOICE,
        input: text.slice(0, 1200),
        speed: 0.97,
      }),
    },
    15000,
  );
  if (!res.ok) {
    console.error("OpenAI TTS", res.status, await res.text());
    return null;
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function synthesizeVoice(text: string, voice?: string) {
  const buf = await synthesizeVoiceMp3(text, voice);
  if (!buf) return null;
  return `data:audio/mpeg;base64,${buf.toString("base64")}`;
}

export async function transcribeAudio(buf: Buffer, filename = "audio.ogg", mime = "audio/ogg") {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buf)], { type: mime }), filename);
  form.append("model", "whisper-1");
  form.append("language", "es");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) {
    console.error("OpenAI Whisper", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as { text?: string };
  return (data.text || "").trim() || null;
}

export async function generateReply(opts: {
  tenant: ToolTenant;
  from: string;
  channel: Channel;
  conversationId: string;
}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  try {
    const knowledge = await businessKnowledge(opts.tenant.id, opts.from);
    const agent = agentsFor(opts.tenant.vertical, opts.tenant.name).client;
    const history = await prisma.message.findMany({
      where: { conversationId: opts.conversationId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    const chronological = history.reverse();

    const messages: Array<Record<string, unknown>> = [
      {
        role: "system",
        content: `Eres ${agent.name}, recepcionista de ${opts.tenant.name}. Eres una mujer, profesional y cálida, de Latinoamérica. No eres un bot rígido: hablas como alguien en el mostrador.
Tratas a la gente de usted o tú según el tono de ellos. Usas el nombre si lo conoces. Una idea por frase, 2 a 5 frases. Puedes empatizar un segundo (“claro”, “con gusto”) y luego ir al grano.
SOLO usas la ficha CRM de ESTE negocio (horarios, intervalo, servicios, clientes y citas ya agendadas). Nunca pises una cita ocupada: usa ver_disponibilidad y consultar_crm.
Cerrado SOLO si el calendario o ver_disponibilidad dicen CERRADO. “Sin reservas” o un día vacío en la agenda significa LIBRE, no cerrado. Nunca digas que un miércoles u otra fecha está cerrada si el calendario marca ABIERTO.
Si piden un día concreto, llama ver_disponibilidad con cuando=esa fecha (ej. 16 de septiembre) y responde con ese resultado. No ofrezcas otro día como si el pedido estuviera cerrado.
Si te preguntan de otro local o un dato que no esté en el CRM, di que no lo tienes. Nunca inventes.
Cuando hablen de citas, usa las herramientas. Si listan huecos, esos están libres. Si confirman una hora, agéndala o reprogramala.
No enumeres la ficha completa: responde lo que preguntaron, como lo haría alguien en el mostrador.
El dueño no ve este chat.
Ficha del negocio (fuente de verdad):\n${knowledge}`,
      },
      ...chronological.map((m) => ({
        role: (m.role === "customer" ? "user" : "assistant") as "user" | "assistant",
        content: m.body,
      })),
    ];

    for (let i = 0; i < 3; i++) {
      const res = await openaiFetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.75,
          messages,
          tools,
          tool_choice: "auto",
        }),
      });
      if (!res.ok) {
        console.error("OpenAI chat", res.status, await res.text());
        return null;
      }
      const data = (await res.json()) as {
        choices?: Array<{
          message?: {
            content?: string | null;
            tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
          };
        }>;
      };
      const msg = data.choices?.[0]?.message;
      if (!msg) return null;
      if (msg.tool_calls?.length) {
        messages.push(msg as Record<string, unknown>);
        for (const call of msg.tool_calls) {
          let args: Record<string, string> = {};
          try {
            args = JSON.parse(call.function.arguments || "{}") as Record<string, string>;
          } catch {
            args = {};
          }
          const result = await runTool(call.function.name, args, opts);
          messages.push({ role: "tool", tool_call_id: call.id, content: result });
        }
        continue;
      }
      return (msg.content || "").trim() || null;
    }
    return null;
  } catch (err) {
    console.error("generateReply", err);
    return null;
  }
}

async function runTool(
  name: string,
  args: Record<string, string>,
  opts: { tenant: ToolTenant; from: string; channel: Channel },
) {
  if (name === "guardar_cliente") {
    const c = await ensureCustomer(opts.tenant.id, opts.from, args.nombre);
    return c ? `Cliente guardado: ${c.name}` : "Falta el nombre.";
  }
  if (name === "consultar_crm") {
    const q = (args.busqueda || "").trim().toLowerCase();
    if (!q || q === "agenda") {
      const busy = await crmBusyWindow(opts.tenant.id, 4);
      if (!busy.length) return "CRM: no hay citas vigentes en los próximos días.";
      return (
        "Citas ya agendadas en CRM (ocupadas): " +
        busy
          .map((a) => `${fmt(a.startsAt)} ${a.customer.name} · ${a.service.name} · ${a.staff?.name || "—"}`)
          .join(" | ")
      );
    }
    const rows = await prisma.customer.findMany({
      where: {
        tenantId: opts.tenant.id,
        OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q.replace(/\D/g, "") } }],
      },
      include: {
        appointments: {
          where: { status: { in: ["CONFIRMED", "PENDING", "RESCHEDULED"] } },
          include: { service: true },
          orderBy: { startsAt: "asc" },
          take: 5,
        },
      },
      take: 8,
    });
    if (!rows.length) return `CRM: no encontré cliente con “${args.busqueda}”.`;
    return rows
      .map(
        (c) =>
          `${c.name} ${c.phone}` +
          (c.appointments.length
            ? " · citas: " + c.appointments.map((a) => `${a.service.name} ${fmt(a.startsAt)}`).join(", ")
            : " · sin cita vigente"),
      )
      .join(" | ");
  }
  if (name === "ver_disponibilidad") {
    return listAvailability(opts.tenant, args.servicio || "", args.cuando || args.fecha);
  }
  if (name === "agendar") {
    return bookAppointment({
      tenant: opts.tenant,
      from: opts.from,
      channel: opts.channel,
      serviceHint: args.servicio || "",
      customerName: args.nombre,
      whenHint: args.cuando,
      staffHint: args.profesional,
    });
  }
  if (name === "cancelar_cita") return cancelAppointment(opts.tenant.id, opts.from);
  if (name === "reprogramar_cita") return rescheduleAppointment(opts.tenant, opts.from, args.cuando);
  return "Herramienta desconocida.";
}
