import { prisma } from "@/lib/db";
import { requireSuperadmin } from "@/lib/guards";
import { ReceptionistChat } from "@/components/receptionist-chat";
import { agentsFor } from "@/lib/brand";

export default async function CanalPage() {
  await requireSuperadmin();
  const phones = await prisma.phoneNumber.findMany({
    include: { tenant: true },
    orderBy: { e164: "asc" },
  });
  const businesses = phones.map((p) => ({
    name: `${p.tenant.name} (${p.label || p.e164})`,
    phone: p.e164,
    clientName: agentsFor(p.tenant.vertical, p.tenant.name).client.name,
  }));

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-4xl">Probar recepción</h1>
        <p className="text-slate-300 mt-2 text-lg">
          Cada negocio tiene su recepcionista. Voz de mujer. No hace falta WhatsApp.
        </p>
      </header>
      {businesses.length ? <ReceptionistChat businesses={businesses} /> : <p className="card">No hay teléfonos todavía.</p>}
    </div>
  );
}
