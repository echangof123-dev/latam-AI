import { prisma } from "../db";
import { VERTICAL_LABEL } from "../modules";
import { formatHoursHuman, fmtRange, upcomingCalendar } from "../reservations";
import { fmt } from "./booking";

export async function crmBusyWindow(tenantId: string, days = 3) {
  const from = new Date();
  const to = new Date(from.getTime() + days * 86400000);
  return prisma.appointment.findMany({
    where: {
      tenantId,
      status: { in: ["CONFIRMED", "PENDING", "RESCHEDULED"] },
      startsAt: { lt: to },
      endsAt: { gt: from },
    },
    include: { customer: true, service: true, staff: true },
    orderBy: { startsAt: "asc" },
    take: 30,
  });
}

export async function businessKnowledge(tenantId: string, customerPhone: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      branches: true,
      services: { where: { active: true } },
      staff: { where: { active: true } },
      policies: true,
      inventory: true,
      phones: true,
    },
  });
  if (!tenant) return "";

  const now = new Date().toLocaleString("es-CO", {
    timeZone: tenant.timezone || "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const [customer, busy] = await Promise.all([
    prisma.customer.findUnique({
      where: { tenantId_phone: { tenantId, phone: customerPhone } },
      include: {
        appointments: {
          where: { status: { in: ["CONFIRMED", "PENDING", "RESCHEDULED"] } },
          include: { service: true, staff: true },
          orderBy: { startsAt: "asc" },
          take: 5,
        },
      },
    }),
    crmBusyWindow(tenantId, 3),
  ]);

  const slot = tenant.slotMin || tenant.branches[0]?.slotMin || 15;

  const lines = [
    `Trabajas SOLO para este negocio (CRM): ${tenant.name}.`,
    `Ahora mismo: ${now} (${tenant.timezone}).`,
    `Intervalo de atención (grilla de agenda): cada ${slot} minutos.`,
    `Rubro: ${VERTICAL_LABEL[tenant.vertical] || tenant.vertical}`,
    "Sucursales y horarios (parametrizados):",
    ...tenant.branches.map(
      (b) =>
        `- ${b.name}, ${b.address}. Intervalo ${b.slotMin || slot} min. ${formatHoursHuman(b.hoursJson)}`,
    ),
    "Calendario real de los próximos 14 días (ABIERTO/CERRADO; un día sin citas sigue ABIERTO):",
    upcomingCalendar(tenant.branches[0]?.hoursJson || "", 14),
    "Servicios del catálogo CRM:",
    ...tenant.services.map(
      (s) => `- ${s.name}: $${s.priceCents.toLocaleString("es-CO")} · dura ${s.durationMin} min`,
    ),
    "Equipo:",
    ...tenant.staff.map((s) => `- ${s.name} (${s.roleTitle})`),
    "Políticas:",
    ...tenant.policies.map((p) => `- ${p.key}: ${p.value}`),
    "Citas YA agendadas (ocupan agenda, no las pises):",
    busy.length
      ? busy
          .map(
            (a) =>
              `- ${fmt(a.startsAt)}–${fmtRange(a.endsAt)} ${a.customer.name} · ${a.service.name} · ${a.staff?.name || "sin asignar"}`,
          )
          .join("\n")
      : "- ninguna vigente en los próximos días",
    customer
      ? `Cliente de este chat en CRM: ${customer.name}, ${customer.phone}${customer.notes ? `. Notas: ${customer.notes}` : ""}`
      : "Este teléfono aún no está en el CRM de clientes.",
    customer?.appointments.length
      ? "Citas de ESTA persona: " +
        customer.appointments
          .map((a) => `${a.service.name} el ${fmt(a.startsAt)} con ${a.staff?.name || "el equipo"}`)
          .join("; ")
      : "Esta persona no tiene cita vigente en el CRM.",
  ];

  return lines.filter(Boolean).join("\n");
}
