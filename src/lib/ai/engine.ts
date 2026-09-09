import { prisma } from "../db";
import { resolveTenantByNumber, moduleOn } from "../tenant";
import type { Channel, Tenant } from "@prisma/client";

type Inbound = {
  to: string;
  from: string;
  text: string;
  channel?: Channel;
};

function nextSlot(from = new Date(), minutes = 40) {
  const d = new Date(from);
  d.setMinutes(d.getMinutes() + 90, 0, 0);
  if (d.getHours() < 9) d.setHours(9, 0, 0, 0);
  if (d.getHours() >= 18) {
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
  }
  const end = new Date(d.getTime() + minutes * 60000);
  return { start: d, end };
}

function fmt(d: Date) {
  return d.toLocaleString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function notify(
  tenantId: string,
  kind: "BOOKING_CONFIRMED" | "RESCHEDULED" | "CANCELLED" | "AI_ESCALATION",
  title: string,
  body: string,
) {
  await prisma.ownerNotification.create({
    data: { tenantId, kind, title, body },
  });
}

async function bump(tenantId: string, field: "conversations" | "bookings" | "cancellations") {
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  await prisma.aiDailyMetric.upsert({
    where: { tenantId_day: { tenantId, day } },
    update: { [field]: { increment: 1 } },
    create: {
      tenantId,
      day,
      conversations: field === "conversations" ? 1 : 0,
      bookings: field === "bookings" ? 1 : 0,
      cancellations: field === "cancellations" ? 1 : 0,
    },
  });
}

function pickService(tenant: { services: { id: string; name: string; durationMin: number; priceCents: number }[] }, text: string) {
  const t = text.toLowerCase();
  const found = tenant.services.find((s) => t.includes(s.name.toLowerCase().split(" ")[0] || ""));
  return found || tenant.services[0];
}

export async function handleInbound(input: Inbound) {
  const resolved = await resolveTenantByNumber(input.to);
  if (!resolved) {
    return {
      reply:
        "Este número no está asignado a ningún negocio en Eje Uno. Un superadministrador debe vincularlo.",
      tenantName: null,
    };
  }

  const { tenant } = resolved;
  if (!moduleOn(tenant.modules, "ia")) {
    return {
      reply: `${tenant.name} no tiene el módulo de IA activo.`,
      tenantName: tenant.name,
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

  const reply = await decide({ tenant, text, customer, from: input.from, channel });

  await prisma.message.create({
    data: { conversationId: conversation.id, role: "assistant", body: reply },
  });

  return { reply, tenantName: tenant.name, tenantId: tenant.id };
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
      customer = await prisma.customer.create({
        data: {
          tenantId: tenant.id,
          name: named[1].trim(),
          phone: from,
        },
      });
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

  if (/política|cancel/.test(low) && /política|anticip/.test(low)) {
    const p = tenant.policies.find((x) => x.key === "cancelacion");
    return p ? `${greeting} ${p.value}` : `${greeting} Puedes cancelar avisando con anticipación.`;
  }

  if (/cancel/.test(low)) {
    const appt = customer
      ? await prisma.appointment.findFirst({
          where: {
            tenantId: tenant.id,
            customerId: customer.id,
            status: { in: ["CONFIRMED", "PENDING", "RESCHEDULED"] },
          },
          orderBy: { startsAt: "desc" },
          include: { service: true },
        })
      : null;
    if (!appt) return `${greeting} No encuentro una cita activa en este número.`;
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { status: "CANCELLED" },
    });
    await notify(
      tenant.id,
      "CANCELLED",
      "Cita cancelada",
      `${customer?.name || from} canceló ${appt.service.name} (${fmt(appt.startsAt)}).`,
    );
    await bump(tenant.id, "cancellations");
    return `${greeting} Listo, cancelé tu ${appt.service.name} del ${fmt(appt.startsAt)}.`;
  }

  if (/reprogram|cambiar cita|mover/.test(low)) {
    const appt = customer
      ? await prisma.appointment.findFirst({
          where: {
            tenantId: tenant.id,
            customerId: customer.id,
            status: { in: ["CONFIRMED", "PENDING", "RESCHEDULED"] },
          },
          include: { service: true },
        })
      : null;
    if (!appt) return `${greeting} No hay una cita vigente para reprogramar.`;
    const slot = nextSlot(new Date(), appt.service.durationMin);
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { startsAt: slot.start, endsAt: slot.end, status: "RESCHEDULED" },
    });
    await notify(
      tenant.id,
      "RESCHEDULED",
      "Cita reprogramada",
      `${customer?.name || from}: ${appt.service.name} ahora ${fmt(slot.start)}.`,
    );
    return `${greeting} Reprogramé tu ${appt.service.name} para ${fmt(slot.start)}.`;
  }

  if (/agend|reserv|cita|turno|quiero un|necesito/.test(low)) {
    if (!customer) {
      return `${greeting} Con gusto. ¿Cómo te llamas para dejar la reserva?`;
    }
    const service = pickService(tenant, low);
    if (!service) return `${greeting} Aún no hay servicios cargados en este negocio.`;
    const clash = await prisma.appointment.findFirst({
      where: {
        tenantId: tenant.id,
        status: { in: ["CONFIRMED", "PENDING", "RESCHEDULED"] },
        startsAt: { gte: new Date() },
      },
      orderBy: { startsAt: "desc" },
    });
    const base = clash ? new Date(clash.endsAt) : new Date();
    const slot = nextSlot(base, service.durationMin);
    await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        serviceId: service.id,
        staffId: tenant.staff[0]?.id,
        branchId: tenant.branches[0]?.id,
        startsAt: slot.start,
        endsAt: slot.end,
        status: "CONFIRMED",
        source: channel,
      },
    });
    await notify(
      tenant.id,
      "BOOKING_CONFIRMED",
      "Reserva confirmada",
      `${customer.name} — ${service.name} el ${fmt(slot.start)}.`,
    );
    await bump(tenant.id, "bookings");
    return `${greeting} Confirmado, ${customer.name.split(" ")[0]}. ${service.name} el ${fmt(slot.start)} con ${tenant.staff[0]?.name || "el equipo"}. Te esperamos.`;
  }

  if (customer) {
    const next = await prisma.appointment.findFirst({
      where: {
        tenantId: tenant.id,
        customerId: customer.id,
        status: { in: ["CONFIRMED", "RESCHEDULED"] },
        startsAt: { gte: new Date() },
      },
      include: { service: true },
      orderBy: { startsAt: "asc" },
    });
    if (next) {
      return `${greeting} ${customer.name.split(" ")[0]}, tu próxima cita es ${next.service.name} el ${fmt(next.startsAt)}. ¿Quieres cambiarla o cancelarla?`;
    }
    return `${greeting} Hola ${customer.name.split(" ")[0]}, no tienes citas pendientes. ¿Agendamos?`;
  }

  return `${greeting} Puedo informar precios, horarios y agendar. Dime tu nombre y qué necesitas.`;
}
