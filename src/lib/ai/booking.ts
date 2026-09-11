import { prisma } from "../db";
import type { Channel } from "@prisma/client";
import { availableSlotsAnyStaff, fmtRange, fmtSlotLine, nextOpenSlot, parseWhenHint } from "../reservations";

export function fmt(d: Date) {
  return fmtRange(d);
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

export async function listAvailability(tenant: TenantBundle, serviceHint: string) {
  const service = pickService(tenant, serviceHint);
  if (!service) return "Aún no hay servicios cargados.";
  const slots = await availableSlotsAnyStaff({
    tenantId: tenant.id,
    serviceId: service.id,
    days: 10,
  });
  if (!slots.length) {
    return `No hay huecos libres para ${service.name} en los próximos 10 días (horario de sede y profesionales ocupados).`;
  }
  const lines = slots.slice(0, 12).map((s) => fmtSlotLine(s.start)).join(" · ");
  return `Huecos LIBRES para ${service.name} (${service.durationMin} min). No están ocupados. Usa el valor cuando= al agendar o reprogramar: ${lines}.`;
}

export async function bookAppointment(opts: {
  tenant: TenantBundle;
  from: string;
  channel: Channel;
  serviceHint: string;
  customerName?: string;
  whenHint?: string;
  staffHint?: string;
}) {
  const customer = await ensureCustomer(opts.tenant.id, opts.from, opts.customerName);
  if (!customer) return "Necesito el nombre del cliente para agendar.";
  const service = pickService(opts.tenant, opts.serviceHint);
  if (!service) return "Aún no hay servicios cargados.";
  const staff = opts.staffHint
    ? opts.tenant.staff.find((s) => opts.staffHint && s.name.toLowerCase().includes(opts.staffHint.toLowerCase()))
    : undefined;
  const when = parseWhenHint(opts.whenHint);
  const slot = await nextOpenSlot({
    tenantId: opts.tenant.id,
    serviceId: service.id,
    preferStaffId: staff?.id,
    branchId: opts.tenant.branches[0]?.id,
    when: when || undefined,
    durationMin: service.durationMin,
  });
  if (!slot) {
    const alt = await listAvailability(opts.tenant, service.name);
    return when
      ? `No pude dejar esa hora exacta. Estos SÍ están libres: ${alt}`
      : `No encontré un hueco libre. ${alt}`;
  }
  const staffRow = opts.tenant.staff.find((s) => s.id === slot.staffId) || opts.tenant.staff[0];
  await prisma.appointment.create({
    data: {
      tenantId: opts.tenant.id,
      customerId: customer.id,
      serviceId: service.id,
      staffId: slot.staffId || staffRow?.id,
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
  return `Confirmado: ${service.name} el ${fmt(slot.start)} con ${staffRow?.name || "el equipo"} a nombre de ${customer.name}.`;
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
          endsAt: { gte: new Date() },
        },
        orderBy: { startsAt: "asc" },
        include: { service: true },
      })
    : null;
  if (!appt) return "No hay una cita activa en este número.";
  await prisma.appointment.update({ where: { id: appt.id }, data: { status: "CANCELLED" } });
  await notify(tenantId, "CANCELLED", "Cita cancelada", `${customer?.name || from} canceló ${appt.service.name} (${fmt(appt.startsAt)}).`);
  await bump(tenantId, "cancellations");
  return `Cancelé ${appt.service.name} del ${fmt(appt.startsAt)}.`;
}

export async function rescheduleAppointment(tenant: TenantBundle, from: string, whenHint?: string) {
  const customer = await prisma.customer.findUnique({
    where: { tenantId_phone: { tenantId: tenant.id, phone: from } },
  });
  const appt = customer
    ? await prisma.appointment.findFirst({
        where: {
          tenantId: tenant.id,
          customerId: customer.id,
          status: { in: ["CONFIRMED", "PENDING", "RESCHEDULED"] },
          endsAt: { gte: new Date() },
        },
        orderBy: { startsAt: "asc" },
        include: { service: true },
      })
    : null;
  if (!appt) return "No hay cita vigente para reprogramar. Puedo agendar una nueva si me dices el servicio.";
  const when = parseWhenHint(whenHint);
  const slot = await nextOpenSlot({
    tenantId: tenant.id,
    serviceId: appt.serviceId,
    preferStaffId: appt.staffId,
    branchId: appt.branchId || undefined,
    when: when || undefined,
    ignoreId: appt.id,
    durationMin: appt.service.durationMin,
  });
  if (!slot) {
    const alt = await listAvailability(tenant, appt.service.name);
    return `No pude moverla a esa hora. Huecos LIBRES: ${alt}`;
  }
  await prisma.appointment.update({
    where: { id: appt.id },
    data: { startsAt: slot.start, endsAt: slot.end, status: "RESCHEDULED", staffId: slot.staffId || appt.staffId },
  });
  await notify(tenant.id, "RESCHEDULED", "Cita reprogramada", `${customer?.name || from}: ${appt.service.name} ahora ${fmt(slot.start)}.`);
  return `Reprogramé ${appt.service.name} para ${fmt(slot.start)}.`;
}
