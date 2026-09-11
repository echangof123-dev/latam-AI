import { prisma } from "../db";
import type { Channel } from "@prisma/client";
import { businessKnowledge } from "./knowledge";
import {
  bookAppointment,
  cancelAppointment,
  ensureCustomer,
  listAvailability,
  rescheduleAppointment,
} from "./booking";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

type ToolTenant = {
  id: string;
  name: string;
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
      name: "ver_disponibilidad",
      description: "Lista huecos libres según horario de sede y citas ya ocupadas.",
      parameters: {
        type: "object",
        properties: { servicio: { type: "string" } },
        required: ["servicio"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "agendar",
      description:
        "Crea una reserva en un hueco libre. cuando puede ser 09:15 o 2026-09-11T09:15 (Bogotá). Si el cliente elige un hueco que listaste, usa ese cuando y confirma solo si la herramienta dice Confirmado.",
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

export async function synthesizeVoiceMp3(text: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1-hd",
      voice: process.env.OPENAI_TTS_VOICE || "nova",
      input: text.slice(0, 4000),
      speed: 1,
    }),
  });
  if (!res.ok) {
    console.error("OpenAI TTS", res.status, await res.text());
    return null;
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function synthesizeVoice(text: string) {
  const buf = await synthesizeVoiceMp3(text);
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

  const knowledge = await businessKnowledge(opts.tenant.id, opts.from);
  const history = await prisma.message.findMany({
    where: { conversationId: opts.conversationId },
    orderBy: { createdAt: "desc" },
    take: 16,
  });
  const chronological = history.reverse();

  const messages: Array<Record<string, unknown>> = [
    {
      role: "system",
      content: `Eres Sofía, recepcionista de ${opts.tenant.name}. Hablas español latino, cálida y breve (2 a 6 frases).
Solo usas la información del negocio. Si no está en los datos, dilo y no inventes precios ni horarios.
Para agendar o cambiar cita SIEMPRE usa las herramientas. Los huecos que devuelve ver_disponibilidad están LIBRES: no los marques ocupados.
Si el cliente dice una hora (ej. 09:15), llama reprogramar_cita o agendar con cuando= esa hora; no hace falta el día si no lo dijo.
Si la herramienta dice Confirmado o Reprogramé, confirma esa fecha/hora al cliente (incluye el día).
Nunca confirmes un horario si la herramienta no lo confirmó. El dueño no ve este chat.
Datos actuales del negocio:\n${knowledge}`,
    },
    ...chronological.map((m) => ({
      role: (m.role === "customer" ? "user" : "assistant") as "user" | "assistant",
      content: m.body,
    })),
  ];

  for (let i = 0; i < 4; i++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.5,
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
  if (name === "ver_disponibilidad") return listAvailability(opts.tenant, args.servicio || "");
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
