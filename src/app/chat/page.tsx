import { prisma } from "@/lib/db";
import { ReceptionistChat } from "@/components/receptionist-chat";
import Link from "next/link";
import { BrandLockup } from "@/components/mark";
import { agentsFor } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const tenants = await prisma.tenant.findMany({
    where: { active: true },
    include: { phones: true, modules: true },
    orderBy: { name: "asc" },
  });
  const businesses = tenants
    .filter((t) => t.modules.some((m) => m.key === "ia" && m.enabled) && t.phones[0])
    .map((t) => {
      const meta =
        t.phones.find((p) => p.whatsappPhoneNumberId) ||
        t.phones.find((p) => p.e164.includes("555")) ||
        t.phones[0];
      const agent = agentsFor(t.vertical, t.name).client;
      return { name: t.name, phone: meta.e164, clientName: agent.name };
    })
    .sort((a, b) => Number(b.phone.includes("555")) - Number(a.phone.includes("555")));

  return (
    <main className="h-dvh flex flex-col overflow-hidden">
      <header className="shrink-0 h-14 flex items-center justify-between gap-3 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        <BrandLockup compact />
        <Link href="/login" className="text-sm font-medium text-[#0b57d0] px-3 py-2 rounded-full hover:bg-[#e8f0fe]">
          Panel
        </Link>
      </header>
      <div className="flex-1 min-h-0">
        {businesses.length ? (
          <ReceptionistChat businesses={businesses} />
        ) : (
          <p className="card max-w-lg mx-auto mt-10">Aún no hay negocios con IA activa.</p>
        )}
      </div>
    </main>
  );
}
