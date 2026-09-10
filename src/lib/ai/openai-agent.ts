import { prisma } from "../db";
import type { Channel } from "@prisma/client";
import { businessKnowledge } from "./knowledge";
import { bookAppointment, cancelAppointment, ensureCustomer, rescheduleAppointment } from "./booking";

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
      name: "agendar",
      description: "Crea una cita. Usa un servicio del catálogo.",
      parameters: {
        type: "object",
        properties: {
          servicio: { type: "string" },
          nombre: { type: "string" },
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
      description: "Mueve la cita activa al siguiente hueco.",
      parameters: { type: "object", properties: {} },
    },
  },
];

export async function synthesizeVoice(text: string) {
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
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:audio/mpeg;base64,${buf.toString("base64")}`;
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
Puedes agendar, cancelar y reprogramar con las herramientas. El dueño no ve este chat.
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
  if (name === "agendar") {
    return bookAppointment({
      tenant: opts.tenant,
      from: opts.from,
      channel: opts.channel,
      serviceHint: args.servicio || "",
      customerName: args.nombre,
    });
  }
  if (name === "cancelar_cita") return cancelAppointment(opts.tenant.id, opts.from);
  if (name === "reprogramar_cita") return rescheduleAppointment(opts.tenant, opts.from);
  return "Herramienta desconocida.";
}
