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
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 shrink-0">
        <BrandLockup compact />
        <Link href="/login" className="btn-ghost text-sm py-2 px-3">
          Panel
        </Link>
      </header>
      <div className="flex-1 min-h-0 p-3 sm:p-6 sm:max-w-3xl sm:mx-auto sm:w-full">
        {businesses.length ? (
          <ReceptionistChat businesses={businesses} />
        ) : (
          <p className="card">Aún no hay negocios con IA activa.</p>
        )}
      </div>
    </main>
  );
}
