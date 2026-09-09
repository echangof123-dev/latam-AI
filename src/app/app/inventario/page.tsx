import { prisma } from "@/lib/db";
import { requireModule } from "@/lib/guards";
import { upsertInventory } from "../actions";

export default async function InventarioPage() {
  const { tenantId } = await requireModule("inventario");
  const rows = await prisma.inventoryItem.findMany({ where: { tenantId } });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Inventario</h1>
      <form action={upsertInventory} className="card grid md:grid-cols-4 gap-3">
        <input name="name" placeholder="Artículo" required />
        <input name="sku" placeholder="SKU" required />
        <input name="qty" type="number" defaultValue={0} />
        <button className="rounded-lg bg-gold-500 text-ink-950 font-semibold">Guardar</button>
      </form>
      <ul className="card divide-y divide-ink-800">
        {rows.map((i) => (
          <li key={i.id} className="py-3 flex justify-between">
            <span>
              {i.name} <span className="text-slate-500">· {i.sku}</span>
            </span>
            <span>{i.qty}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
