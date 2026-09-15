const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const NAME = "Clínica Bienestar";
const SLUG = "clinica-bienestar";
const PHONE = "+593986899878";
const MODULES = [
  "agenda",
  "clientes",
  "servicios",
  "personal",
  "sucursales",
  "ia",
  "inventario",
  "facturacion",
  "reportes",
];
const hours = JSON.stringify({
  lun: ["09:00-18:00"],
  mar: ["09:00-18:00"],
  mie: ["09:00-18:00"],
  jue: ["09:00-18:00"],
  vie: ["09:00-18:00"],
  sab: ["09:00-13:00"],
  dom: [],
});

async function main() {
  let tenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ slug: SLUG }, { name: { contains: "Bienestar", mode: "insensitive" } }],
    },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        slug: SLUG,
        name: NAME,
        vertical: "CLINIC",
        timezone: "America/Guayaquil",
      },
    });
  } else {
    tenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: { name: NAME, vertical: "CLINIC", timezone: "America/Guayaquil" },
    });
  }

  for (const key of MODULES) {
    await prisma.tenantModule.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key } },
      update: { enabled: true },
      create: { tenantId: tenant.id, key, enabled: true },
    });
  }

  const taken = await prisma.phoneNumber.findUnique({ where: { e164: PHONE } });
  if (taken) {
    await prisma.phoneNumber.update({
      where: { e164: PHONE },
      data: { tenantId: tenant.id, label: "WhatsApp", whatsappPhoneNumberId: "gupshup" },
    });
  } else {
    await prisma.phoneNumber.create({
      data: {
        e164: PHONE,
        tenantId: tenant.id,
        label: "WhatsApp",
        whatsappPhoneNumberId: "gupshup",
      },
    });
  }

  const branchCount = await prisma.branch.count({ where: { tenantId: tenant.id } });
  if (!branchCount) {
    await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: "Sede principal",
        address: "Guayaquil",
        hoursJson: hours,
      },
    });
  }

  const serviceCount = await prisma.service.count({ where: { tenantId: tenant.id } });
  if (!serviceCount) {
    await prisma.service.create({
      data: {
        tenantId: tenant.id,
        name: "Consulta general",
        durationMin: 30,
        priceCents: 25000,
      },
    });
  }

  console.log("Clínica Bienestar OK", PHONE);
}

main()
  .catch((e) => {
    console.error("ensure-clinica-bienestar", e);
  })
  .finally(() => prisma.$disconnect());
