import { prisma } from "@/lib/db";
import { ReceptionistChat } from "@/components/receptionist-chat";
import Link from "next/link";

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
      const meta = t.phones.find((p) => p.e164.includes("555")) || t.phones[0];
      return { name: t.name, phone: meta.e164 };
    })
    .sort((a, b) => Number(b.phone.includes("555")) - Number(a.phone.includes("555")));

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6 space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-gold-400 font-semibold">Eje Uno</p>
          <h1 className="font-display text-4xl mt-1">Habla con Sofía</h1>
          <p className="text-slate-400 mt-2">Texto, voz y avatar. Sin WhatsApp. Prueba ahora.</p>
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
    </main>
  );
}
