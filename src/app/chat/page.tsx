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
    <main className="min-h-screen">
      <div className="site-wrap py-8 space-y-6 max-w-3xl">
        <header className="flex items-end justify-between gap-4">
          <div>
            <BrandLockup compact />
            <h1 className="font-display text-4xl mt-4">Recepción</h1>
            <p className="text-slate-400 mt-2 max-w-lg">
              Cada negocio tiene su recepcionista. Voz de mujer. Usa el catálogo y la agenda reales.
            </p>
          </div>
          <Link href="/login" className="btn-ghost text-sm">
            Entrar al panel
          </Link>
        </header>
        {businesses.length ? (
          <ReceptionistChat businesses={businesses} />
        ) : (
          <p className="card">Aún no hay negocios con IA activa.</p>
        )}
      </div>
    </main>
  );
}
