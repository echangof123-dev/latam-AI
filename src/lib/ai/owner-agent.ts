import { ownerBriefing, ownerFallback, runOwnerTool } from "./owner-crm";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const tools = [
  {
    type: "function" as const,
    function: {
      name: "resumen",
      description: "Resumen actual del CRM: citas de hoy, clientes, ventas, horarios.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "agenda",
      description: "Citas del CRM en una fecha o la semana. Vacío no es cerrado.",
      parameters: {
        type: "object",
        properties: {
          fecha: {
            type: "string",
            description: "hoy, mañana, semana, 16 de septiembre, 2026-09-16",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "buscar_cliente",
      description: "Busca un cliente de este negocio por nombre o teléfono, con su historial.",
      parameters: {
        type: "object",
        properties: { busqueda: { type: "string" } },
        required: ["busqueda"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "catalogo",
      description: "Servicios, precios, personal, sedes y horarios parametrizados.",
      parameters: {
        type: "object",
        properties: { que: { type: "string", description: "todo, servicios, personal, horarios" } },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "inventario",
      description: "Stock del CRM de este negocio.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "ventas",
      description: "Facturas, ingresos y citas por estado.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "metricas",
      description: "Resultados de Sofía (chats, reservas, cancelaciones).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "huecos",
      description: "Huecos libres reales según horario y citas ocupadas.",
      parameters: {
        type: "object",
        properties: { servicio: { type: "string" } },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "avisos",
      description: "Notificaciones del dueño (reservas, cancelaciones).",
      parameters: { type: "object", properties: {} },
    },
  },
];

async function openaiFetch(url: string, init: RequestInit, ms = 18000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function generateOwnerReply(opts: {
  tenantId: string;
  tenantName: string;
  ownerName: string;
  history: { role: string; body: string }[];
  question: string;
}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return ownerFallback(opts.tenantId, opts.question);

  try {
    const briefing = await ownerBriefing(opts.tenantId);
    const messages: Array<Record<string, unknown>> = [
      {
        role: "system",
        content: `Eres Elena, asistente interno del DUEÑO de ${opts.tenantName}. El dueño se llama ${opts.ownerName}.
No eres Sofía: Sofía atiende clientes y no les muestra el CRM completo. Tú SÍ ves todo este negocio: agenda, clientes, dinero, inventario, horarios, equipo y métricas de Sofía.
SOLO este tenant. Nunca inventes cifras ni citas: usa herramientas si el dato no está claro en la ficha o si piden una fecha/cliente concreto.
Un día “sin reservas” está vacío (se puede agendar), no cerrado, salvo que el calendario diga CERRADO.
Responde en español, clara, con números, como si se lo estuvieras contando en voz alta: frases cortas, sin tablas ni markdown. Si hay muchas citas, di el total y las más próximas. Si no hay dato, dilo y sugiere dónde cargarlo (Parametrización, Agenda, Clientes).
Ficha CRM (puede estar un poco desfasada; las herramientas están al minuto):\n${briefing}`,
      },
      ...opts.history.slice(-16).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.body,
      })),
      { role: "user", content: opts.question },
    ];

    for (let i = 0; i < 4; i++) {
      const res = await openaiFetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.35,
          messages,
          tools,
          tool_choice: "auto",
        }),
      });
      if (!res.ok) {
        console.error("OpenAI owner", res.status, await res.text());
        return ownerFallback(opts.tenantId, opts.question);
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
      if (!msg) return ownerFallback(opts.tenantId, opts.question);
      if (msg.tool_calls?.length) {
        messages.push(msg as Record<string, unknown>);
        for (const call of msg.tool_calls) {
          let args: Record<string, string> = {};
          try {
            args = JSON.parse(call.function.arguments || "{}") as Record<string, string>;
          } catch {
            args = {};
          }
          const result = await runOwnerTool(opts.tenantId, call.function.name, args);
          messages.push({ role: "tool", tool_call_id: call.id, content: result });
        }
        continue;
      }
      const text = (msg.content || "").trim();
      return text || ownerFallback(opts.tenantId, opts.question);
    }
    return ownerFallback(opts.tenantId, opts.question);
  } catch (err) {
    console.error("generateOwnerReply", err);
    return ownerFallback(opts.tenantId, opts.question);
  }
}
