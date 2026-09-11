import { prisma } from "../db";
import { VERTICAL_LABEL } from "../modules";
import { availableSlotsAnyStaff, fmtRange, formatHoursHuman } from "../reservations";
import { fmt } from "./booking";

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

  const customer = await prisma.customer.findUnique({
    where: { tenantId_phone: { tenantId, phone: customerPhone } },
    include: {
      appointments: {
        where: { status: { in: ["CONFIRMED", "PENDING", "RESCHEDULED"] } },
        include: { service: true, staff: true },
        orderBy: { startsAt: "asc" },
        take: 5,
      },
    },
  });

  const lines = [
    `Trabajas SOLO para este negocio: ${tenant.name}.`,
    `Ahora mismo: ${now} (${tenant.timezone}).`,
    `Rubro: ${VERTICAL_LABEL[tenant.vertical] || tenant.vertical}`,
    `Teléfonos: ${tenant.phones.map((p) => `${p.e164} (${p.label})`).join("; ") || "—"}`,
    "Sucursales y horarios de atención:",
    ...tenant.branches.map(
      (b) => `- ${b.name}, ${b.address}. ${formatHoursHuman(b.hoursJson)}`,
    ),
    "Servicios, duración y precios en pesos colombianos:",
    ...tenant.services.map(
      (s) => `- ${s.name}: $${s.priceCents.toLocaleString("es-CO")} · ${s.durationMin} minutos`,
    ),
    "Equipo que atiende:",
    ...tenant.staff.map((s) => `- ${s.name} (${s.roleTitle})`),
    "Políticas:",
    ...tenant.policies.map((p) => `- ${p.key}: ${p.value}`),
    tenant.inventory.length ? "Inventario (si preguntan):" : "",
    ...tenant.inventory.slice(0, 20).map((i) => `- ${i.name}: ${i.qty} uds`),
    customer
      ? `Cliente de este chat: ${customer.name}, ${customer.phone}${customer.notes ? `. Notas: ${customer.notes}` : ""}`
      : "Aún no tienes el nombre de esta persona.",
    customer?.appointments.length
      ? "Citas vigentes de esta persona: " +
        customer.appointments
          .map((a) => `${a.service.name} el ${fmt(a.startsAt)} con ${a.staff?.name || "el equipo"}`)
          .join("; ")
      : "Esta persona no tiene cita vigente.",
  ];

  for (const s of tenant.services.slice(0, 4)) {
    const slots = await availableSlotsAnyStaff({
      tenantId,
      serviceId: s.id,
      days: 5,
    });
    lines.push(
      `Huecos próximos para ${s.name}: ` +
        (slots.length ? slots.slice(0, 6).map((x) => fmtRange(x.start)).join("; ") : "sin huecos"),
    );
  }

  return lines.filter(Boolean).join("\n");
}
