const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "whatsappPhoneNumberId" TEXT',
  );
  console.log("Columna WhatsApp OK");
}

main()
  .catch((e) => {
    console.error("ensure-column", e);
  })
  .finally(() => prisma.$disconnect());
