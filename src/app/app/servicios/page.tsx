import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/guards";
import { money } from "@/lib/auth";
import { createService } from "../actions";

export default async function ServiciosPage() {
  const { tenantId } = await requireOwner();
  const rows = await prisma.service.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Servicios y precios</h1>
      <form action={createService} className="card grid md:grid-cols-4 gap-3">
        <input name="name" placeholder="Nombre" required />
        <input name="durationMin" type="number" defaultValue={30} />
        <input name="priceCents" type="number" placeholder="Precio (COP)" required />
        <button className="rounded-lg bg-gold-500 text-ink-950 font-semibold">Añadir</button>
      </form>
      <ul className="card divide-y divide-ink-800">
        {rows.map((s) => (
          <li key={s.id} className="py-3 flex justify-between">
            <span>
              {s.name} <span className="text-slate-500">· {s.durationMin} min</span>
            </span>
            <span>{money(s.priceCents)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
