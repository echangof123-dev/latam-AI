import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/guards";
import { createCustomer } from "../actions";

export default async function ClientesPage() {
  const { tenantId } = await requireOwner();
  const rows = await prisma.customer.findMany({
    where: { tenantId },
    include: { _count: { select: { appointments: true } } },
    orderBy: { name: "asc" },
  });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Clientes</h1>
      <form action={createCustomer} className="card grid md:grid-cols-3 gap-3">
        <input name="name" placeholder="Nombre" required />
        <input name="phone" placeholder="+57..." required />
        <button className="rounded-lg bg-gold-500 text-ink-950 font-semibold">Guardar</button>
      </form>
      <ul className="card divide-y divide-ink-800">
        {rows.map((c) => (
          <li key={c.id} className="py-3 flex justify-between">
            <span>
              {c.name} <span className="text-slate-500 text-sm">{c.phone}</span>
            </span>
            <span className="text-slate-400 text-sm">{c._count.appointments} citas</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
