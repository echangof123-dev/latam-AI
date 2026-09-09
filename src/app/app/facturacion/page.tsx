import { prisma } from "@/lib/db";
import { requireModule } from "@/lib/guards";
import { money } from "@/lib/auth";

export default async function FacturacionPage() {
  const { tenantId } = await requireModule("facturacion");
  const rows = await prisma.invoice.findMany({
    where: { tenantId },
    orderBy: { issuedAt: "desc" },
  });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Facturación</h1>
      <ul className="card divide-y divide-ink-800">
        {rows.map((i) => (
          <li key={i.id} className="py-3 flex justify-between">
            <span>
              {i.number} <span className="text-slate-500">· {i.status}</span>
            </span>
            <span>{money(i.totalCents)}</span>
          </li>
        ))}
        {rows.length === 0 ? <li className="py-3 text-slate-500">Sin facturas.</li> : null}
      </ul>
    </div>
  );
}
