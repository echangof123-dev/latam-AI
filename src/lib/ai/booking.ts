import { prisma } from "../db";
import type { Channel } from "@prisma/client";

export function nextSlot(from = new Date(), minutes = 40) {
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

export function fmt(d: Date) {
  return d.toLocaleString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function notify(
  tenantId: string,
  kind: "BOOKING_CONFIRMED" | "RESCHEDULED" | "CANCELLED" | "AI_ESCALATION",
  title: string,
  body: string,
) {
  await prisma.ownerNotification.create({
    data: { tenantId, kind, title, body },
  });
}

export async function bump(tenantId: string, field: "conversations" | "bookings" | "cancellations") {
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

export function pickService(
  tenant: { services: { id: string; name: string; durationMin: number; priceCents: number }[] },
  text: string,
) {
  const t = text.toLowerCase();
  const found = tenant.services.find((s) => t.includes(s.name.toLowerCase().split(" ")[0] || ""));
  return found || tenant.services[0];
}

type TenantBundle = {
  id: string;
  name: string;
  services: { id: string; name: string; durationMin: number; priceCents: number }[];
  staff: { id: string; name: string }[];
  branches: { id: string; name: string }[];
};

export async function ensureCustomer(tenantId: string, phone: string, name?: string) {
  const existing = await prisma.customer.findUnique({
    where: { tenantId_phone: { tenantId, phone } },
  });
  if (existing) {
    if (name && existing.name !== name) {
      return prisma.customer.update({ where: { id: existing.id }, data: { name } });
    }
    return existing;
  }
  if (!name) return null;
  return prisma.customer.create({ data: { tenantId, name, phone } });
}

export async function bookAppointment(opts: {
  tenant: TenantBundle;
  from: string;
  channel: Channel;
  serviceHint: string;
  customerName?: string;
}) {
  const customer = await ensureCustomer(opts.tenant.id, opts.from, opts.customerName);
  if (!customer) return "Necesito el nombre del cliente para agendar.";
  const service = pickService(opts.tenant, opts.serviceHint);
  if (!service) return "Aún no hay servicios cargados.";
  const clash = await prisma.appointment.findFirst({
    where: {
      tenantId: opts.tenant.id,
      status: { in: ["CONFIRMED", "PENDING", "RESCHEDULED"] },
      startsAt: { gte: new Date() },
    },
    orderBy: { startsAt: "desc" },
  });
  const base = clash ? new Date(clash.endsAt) : new Date();
  const slot = nextSlot(base, service.durationMin);
  await prisma.appointment.create({
    data: {
      tenantId: opts.tenant.id,
      customerId: customer.id,
      serviceId: service.id,
      staffId: opts.tenant.staff[0]?.id,
      branchId: opts.tenant.branches[0]?.id,
      startsAt: slot.start,
      endsAt: slot.end,
      status: "CONFIRMED",
      source: opts.channel,
    },
  });
  await notify(
    opts.tenant.id,
    "BOOKING_CONFIRMED",
    "Reserva confirmada",
    `${customer.name} — ${service.name} el ${fmt(slot.start)}.`,
  );
  await bump(opts.tenant.id, "bookings");
  return `Confirmado: ${service.name} el ${fmt(slot.start)} con ${opts.tenant.staff[0]?.name || "el equipo"} a nombre de ${customer.name}.`;
}

export async function cancelAppointment(tenantId: string, from: string) {
  const customer = await prisma.customer.findUnique({
    where: { tenantId_phone: { tenantId, phone: from } },
  });
  const appt = customer
    ? await prisma.appointment.findFirst({
        where: {
          tenantId,
          customerId: customer.id,
          status: { in: ["CONFIRMED", "PENDING", "RESCHEDULED"] },
        },
        orderBy: { startsAt: "desc" },
        include: { service: true },
      })
    : null;
  if (!appt) return "No hay una cita activa en este número.";
  await prisma.appointment.update({ where: { id: appt.id }, data: { status: "CANCELLED" } });
  await notify(tenantId, "CANCELLED", "Cita cancelada", `${customer?.name || from} canceló ${appt.service.name} (${fmt(appt.startsAt)}).`);
  await bump(tenantId, "cancellations");
  return `Cancelé ${appt.service.name} del ${fmt(appt.startsAt)}.`;
}

export async function rescheduleAppointment(tenant: TenantBundle, from: string) {
  const customer = await prisma.customer.findUnique({
    where: { tenantId_phone: { tenantId: tenant.id, phone: from } },
  });
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
  if (!appt) return "No hay cita vigente para reprogramar.";
  const slot = nextSlot(new Date(), appt.service.durationMin);
  await prisma.appointment.update({
    where: { id: appt.id },
    data: { startsAt: slot.start, endsAt: slot.end, status: "RESCHEDULED" },
  });
  await notify(tenant.id, "RESCHEDULED", "Cita reprogramada", `${customer?.name || from}: ${appt.service.name} ahora ${fmt(slot.start)}.`);
  return `Reprogramé ${appt.service.name} para ${fmt(slot.start)}.`;
}
