import { prisma } from "../db";
import { VERTICAL_LABEL } from "../modules";
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

  const customer = await prisma.customer.findUnique({
    where: { tenantId_phone: { tenantId, phone: customerPhone } },
    include: {
      appointments: {
        where: { status: { in: ["CONFIRMED", "PENDING", "RESCHEDULED"] } },
        include: { service: true },
        orderBy: { startsAt: "asc" },
        take: 5,
      },
    },
  });

  const lines = [
    `Negocio: ${tenant.name}`,
    `Rubro: ${VERTICAL_LABEL[tenant.vertical] || tenant.vertical}`,
    `Zona horaria: ${tenant.timezone}`,
    `Teléfonos: ${tenant.phones.map((p) => `${p.e164} (${p.label})`).join("; ") || "—"}`,
    "Sucursales:",
    ...tenant.branches.map((b) => `- ${b.name}, ${b.address}. Horario: ${b.hoursJson}`),
    "Servicios y precios (COP):",
    ...tenant.services.map(
      (s) => `- ${s.name}: $${s.priceCents.toLocaleString("es-CO")} · ${s.durationMin} min · id:${s.id}`,
    ),
    "Equipo:",
    ...tenant.staff.map((s) => `- ${s.name} (${s.roleTitle})`),
    "Políticas:",
    ...tenant.policies.map((p) => `- ${p.key}: ${p.value}`),
    tenant.inventory.length ? "Inventario:" : "",
    ...tenant.inventory.slice(0, 30).map((i) => `- ${i.name} (${i.sku}): ${i.qty} uds`),
    customer
      ? `Cliente conocido: ${customer.name}, tel ${customer.phone}${customer.notes ? `, notas: ${customer.notes}` : ""}`
      : "Este teléfono aún no está en la ficha de clientes.",
    customer?.appointments.length
      ? "Citas activas: " +
        customer.appointments.map((a) => `${a.service.name} el ${fmt(a.startsAt)} (${a.status})`).join("; ")
      : "Sin citas activas para este teléfono.",
  ];

  return lines.filter(Boolean).join("\n");
}
