import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/guards";
import { createBranch } from "../actions";

export default async function SucursalesPage() {
  const { tenantId } = await requireOwner();
  const rows = await prisma.branch.findMany({ where: { tenantId } });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Sucursales</h1>
      <form action={createBranch} className="card grid md:grid-cols-3 gap-3">
        <input name="name" placeholder="Sede" required />
        <input name="address" placeholder="Dirección" />
        <button className="rounded-lg bg-gold-500 text-ink-950 font-semibold">Añadir</button>
      </form>
      <ul className="card space-y-4">
        {rows.map((b) => (
          <li key={b.id}>
            <p className="font-medium">{b.name}</p>
            <p className="text-sm text-slate-400">{b.address}</p>
            <p className="text-xs text-slate-500 mt-1">{b.hoursJson}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
