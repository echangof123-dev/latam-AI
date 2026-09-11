import { prisma } from "../db";
import { resolveTenantByNumber, moduleOn } from "../tenant";
import type { Channel, Tenant } from "@prisma/client";
import { bump, bookAppointment, cancelAppointment, ensureCustomer, rescheduleAppointment } from "./booking";
import { generateReply, synthesizeVoice } from "./openai-agent";

type Inbound = {
  to: string;
  from: string;
  text: string;
  channel?: Channel;
  wantAudio?: boolean;
};

export async function handleInbound(input: Inbound) {
  const resolved = await resolveTenantByNumber(input.to);
  if (!resolved) {
    return {
      reply:
        "Este número no está asignado a ningún negocio en Eje Uno. Un superadministrador debe vincularlo.",
      tenantName: null,
      audio: null as string | null,
    };
  }

  const { tenant } = resolved;
  if (!moduleOn(tenant.modules, "ia")) {
    return {
      reply: `${tenant.name} no tiene el módulo de IA activo.`,
      tenantName: tenant.name,
      audio: null as string | null,
    };
  }

  const text = (input.text || "").trim();
  const channel = input.channel || "WHATSAPP";

  let conversation = await prisma.conversation.findFirst({
    where: { tenantId: tenant.id, customerPhone: input.from },
    orderBy: { createdAt: "desc" },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { tenantId: tenant.id, customerPhone: input.from, channel },
    });
    await bump(tenant.id, "conversations");
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, role: "customer", body: text },
  });

  const customer = await prisma.customer.findUnique({
    where: { tenantId_phone: { tenantId: tenant.id, phone: input.from } },
  });

  let reply =
    (await generateReply({
      tenant,
      from: input.from,
      channel,
      conversationId: conversation.id,
    })) || (await decide({ tenant, text, customer, from: input.from, channel }));

  await prisma.message.create({
    data: { conversationId: conversation.id, role: "assistant", body: reply },
  });

  const audio = input.wantAudio ? await synthesizeVoice(reply) : null;

  return { reply, tenantName: tenant.name, tenantId: tenant.id, audio };
}

async function decide(opts: {
  tenant: Tenant & {
    services: { id: string; name: string; durationMin: number; priceCents: number }[];
    staff: { id: string; name: string }[];
    branches: { id: string; name: string; hoursJson: string }[];
    policies: { key: string; value: string }[];
  };
  text: string;
  customer: { id: string; name: string; phone: string } | null;
  from: string;
  channel: Channel;
}) {
  const { tenant, text, from, channel } = opts;
  let customer = opts.customer;
  const low = text.toLowerCase();
  const greeting = `Soy la recepción de ${tenant.name}.`;

  if (!customer) {
    const named = text.match(/(?:me llamo|soy)\s+([a-záéíóúñ\s]{2,40})/i);
    if (named) {
      customer = await ensureCustomer(tenant.id, from, named[1].trim());
    }
  }

  if (/h+o+l+[ao]|hoka|holi|buenas|buenos d[ií]as|buenas tardes|\bhi\b|\bhey\b/.test(low) && low.length < 50) {
    const who = customer ? `Hola ${customer.name.split(" ")[0]}.` : "Hola.";
    const list = tenant.services.map((s) => s.name).join(", ");
    return `${who} ${greeting} ¿En qué te ayudo? Puedo agendar, cambiar o cancelar. Servicios: ${list}.`;
  }

  if (/horario|abren|cierran/.test(low)) {
    const hours = tenant.branches[0]?.hoursJson || "Lun-Vie 9 a 18";
    return `${greeting} Horario de ${tenant.branches[0]?.name || "la sede"}: ${hours}`;
  }

  if (/precio|cuánto|cuesta|vale/.test(low)) {
    const lines = tenant.services
      .map((s) => `${s.name}: $${s.priceCents.toLocaleString("es-CO")} (${s.durationMin} min)`)
      .join(". ");
    return `${greeting} ${lines}`;
  }

  if (/cancel/.test(low)) return cancelAppointment(tenant.id, from);
  if (/reprogram|cambiar cita|mover/.test(low)) return rescheduleAppointment(tenant, from);

  if (/agend|reserv|cita|turno|quiero un|necesito/.test(low)) {
    if (!customer) return `${greeting} Con gusto. ¿Cómo te llamas para dejar la reserva?`;
    return bookAppointment({
      tenant,
      from,
      channel,
      serviceHint: low,
      customerName: customer.name,
    });
  }

  return `${greeting} Puedo informar precios, horarios y agendar. Dime tu nombre y qué necesitas.`;
}
