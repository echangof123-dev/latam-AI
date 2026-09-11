const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "whatsappPhoneNumberId" TEXT',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "slotMin" INTEGER NOT NULL DEFAULT 15',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "slotMin" INTEGER NOT NULL DEFAULT 15',
  );
  console.log("Columnas CRM / intervalo OK");
}

main()
  .catch((e) => {
    console.error("ensure-column", e);
  })
  .finally(() => prisma.$disconnect());
