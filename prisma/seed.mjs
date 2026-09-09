import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const MODULES = [
  "agenda",
  "clientes",
  "servicios",
  "personal",
  "sucursales",
  "ia",
  "inventario",
  "facturacion",
  "ventas",
  "reportes",
];

const hours = JSON.stringify({
  lun: ["09:00-18:00"],
  mar: ["09:00-18:00"],
  mie: ["09:00-18:00"],
  jue: ["09:00-18:00"],
  vie: ["09:00-18:00"],
  sab: ["09:00-14:00"],
  dom: [],
});

async function ensureModules(tenantId, extraOff = []) {
  for (const key of MODULES) {
    await prisma.tenantModule.upsert({
      where: { tenantId_key: { tenantId, key } },
      update: { enabled: !extraOff.includes(key) },
      create: { tenantId, key, enabled: !extraOff.includes(key) },
    });
  }
}

async function main() {
  const passwordHash = bcrypt.hashSync("ejeuno123", 10);

  const superadmin = await prisma.user.upsert({
    where: { email: "nathan.k@example.net" },
    update: { passwordHash, role: "SUPERADMIN", name: "Superadmin Eje Uno" },
    create: {
      email: "nathan.k@example.net",
      passwordHash,
      name: "Superadmin Eje Uno",
      role: "SUPERADMIN",
    },
  });

  const barber = await prisma.tenant.upsert({
    where: { slug: "barberia-norte" },
    update: {},
    create: {
      slug: "barberia-norte",
      name: "Barbería Norte",
      vertical: "BARBERSHOP",
    },
  });

  const clinic = await prisma.tenant.upsert({
    where: { slug: "clinica-alma" },
    update: {},
    create: {
      slug: "clinica-alma",
      name: "Clínica Alma",
      vertical: "CLINIC",
    },
  });

  await ensureModules(barber.id, ["inventario"]);
  await ensureModules(clinic.id, []);

  const ownerBarber = await prisma.user.upsert({
    where: { email: "tina.r@example.net" },
    update: { passwordHash },
    create: {
      email: "tina.r@example.net",
      passwordHash,
      name: "Dueño Barbería",
      role: "OWNER",
    },
  });
  const ownerClinic = await prisma.user.upsert({
    where: { email: "iris.p@example.org" },
    update: { passwordHash },
    create: {
      email: "iris.p@example.org",
      passwordHash,
      name: "Dueña Clínica",
      role: "OWNER",
    },
  });

  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: ownerBarber.id, tenantId: barber.id } },
    update: {},
    create: { userId: ownerBarber.id, tenantId: barber.id, role: "OWNER" },
  });
  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: ownerClinic.id, tenantId: clinic.id } },
    update: {},
    create: { userId: ownerClinic.id, tenantId: clinic.id, role: "OWNER" },
  });

  await prisma.phoneNumber.upsert({
    where: { e164: "+573001110001" },
    update: { tenantId: barber.id },
    create: {
      e164: "+573001110001",
      label: "WhatsApp / voz principal",
      tenantId: barber.id,
    },
  });
  await prisma.phoneNumber.upsert({
    where: { e164: "+573001110002" },
    update: { tenantId: clinic.id },
    create: {
      e164: "+573001110002",
      label: "Línea de citas",
      tenantId: clinic.id,
    },
  });

  const b1 = await prisma.branch.upsert({
    where: { id: "branch_barber_1" },
    update: {},
    create: {
      id: "branch_barber_1",
      tenantId: barber.id,
      name: "Sede Centro",
      address: "Calle 10 #4-20",
      hoursJson: hours,
    },
  });
  const c1 = await prisma.branch.upsert({
    where: { id: "branch_clinic_1" },
    update: {},
    create: {
      id: "branch_clinic_1",
      tenantId: clinic.id,
      name: "Sede Principal",
      address: "Av. Salud 120",
      hoursJson: hours,
    },
  });

  const corte = await prisma.service.upsert({
    where: { id: "svc_corte" },
    update: {},
    create: {
      id: "svc_corte",
      tenantId: barber.id,
      name: "Corte clásico",
      durationMin: 40,
      priceCents: 35000,
    },
  });

  const barba = await prisma.service.upsert({
    where: { id: "svc_barba" },
    update: { priceCents: 18000 },
    create: {
      id: "svc_barba",
      tenantId: barber.id,
      name: "Arreglo de barba",
      durationMin: 25,
      priceCents: 18000,
    },
  });

  const consulta = await prisma.service.upsert({
    where: { id: "svc_consulta" },
    update: { priceCents: 80000 },
    create: {
      id: "svc_consulta",
      tenantId: clinic.id,
      name: "Consulta general",
      durationMin: 30,
      priceCents: 80000,
    },
  });

  const staffB = await prisma.staffMember.upsert({
    where: { id: "staff_andres" },
    update: {},
    create: {
      id: "staff_andres",
      tenantId: barber.id,
      name: "Andrés Peña",
      roleTitle: "Barbero",
    },
  });
  const staffC = await prisma.staffMember.upsert({
    where: { id: "staff_luisa" },
    update: {},
    create: {
      id: "staff_luisa",
      tenantId: clinic.id,
      name: "Dra. Luisa Mora",
      roleTitle: "Médica",
    },
  });

  const custB = await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId: barber.id, phone: "+573109998877" } },
    update: {},
    create: {
      tenantId: barber.id,
      name: "Carlos Ruiz",
      phone: "+573109998877",
    },
  });
  const custC = await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId: clinic.id, phone: "+573108887766" } },
    update: {},
    create: {
      tenantId: clinic.id,
      name: "María López",
      phone: "+573108887766",
    },
  });

  await prisma.policy.upsert({
    where: { tenantId_key: { tenantId: barber.id, key: "cancelacion" } },
    update: {},
    create: {
      tenantId: barber.id,
      key: "cancelacion",
      value: "Cancelar con 2 horas de anticipación.",
    },
  });
  await prisma.policy.upsert({
    where: { tenantId_key: { tenantId: clinic.id, key: "cancelacion" } },
    update: {},
    create: {
      tenantId: clinic.id,
      key: "cancelacion",
      value: "Cancelar con 12 horas de anticipación.",
    },
  });

  await prisma.inventoryItem.upsert({
    where: { tenantId_sku: { tenantId: clinic.id, sku: "GASAS-10" } },
    update: {},
    create: {
      tenantId: clinic.id,
      name: "Gasas estériles",
      sku: "GASAS-10",
      qty: 40,
      costCents: 12000,
    },
  });

  await prisma.invoice.upsert({
    where: { tenantId_number: { tenantId: barber.id, number: "F-1001" } },
    update: {},
    create: {
      tenantId: barber.id,
      number: "F-1001",
      totalCents: 35000,
      status: "paid",
    },
  });

  const start = new Date();
  start.setHours(11, 0, 0, 0);
  const end = new Date(start.getTime() + 40 * 60000);
  const existing = await prisma.appointment.findFirst({
    where: { tenantId: barber.id, customerId: custB.id },
  });
  if (!existing) {
    await prisma.appointment.create({
      data: {
        tenantId: barber.id,
        customerId: custB.id,
        serviceId: corte.id,
        staffId: staffB.id,
        branchId: b1.id,
        startsAt: start,
        endsAt: end,
        status: "CONFIRMED",
        source: "WHATSAPP",
      },
    });
  }

  await prisma.ownerNotification.createMany({
    data: [
      {
        tenantId: barber.id,
        kind: "DAILY_SUMMARY",
        title: "Resumen del día",
        body: "La IA atendió 12 conversaciones y confirmó 4 cortes.",
      },
      {
        tenantId: clinic.id,
        kind: "BOOKING_CONFIRMED",
        title: "Cita confirmada",
        body: "María López — Consulta general mañana 09:00.",
      },
    ],
    skipDuplicates: true,
  });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  await prisma.aiDailyMetric.upsert({
    where: { tenantId_day: { tenantId: barber.id, day: today } },
    update: { conversations: 12, bookings: 4, cancellations: 1, handoffs: 0 },
    create: {
      tenantId: barber.id,
      day: today,
      conversations: 12,
      bookings: 4,
      cancellations: 1,
      handoffs: 0,
    },
  });

  console.log("Seed OK");
  console.log("Superadmin:", superadmin.email, "/ ejeuno123");
  console.log("Barbería:", ownerBarber.email, "tel +573001110001");
  console.log("Clínica:", ownerClinic.email, "tel +573001110002");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
