import { prisma } from "@/lib/db";
import { requireModule } from "@/lib/guards";
import { money } from "@/lib/auth";

export default async function VentasPage() {
  const { tenantId } = await requireModule("ventas");
  const paid = await prisma.invoice.aggregate({
    where: { tenantId, status: "paid" },
    _sum: { totalCents: true },
    _count: true,
  });
  const services = await prisma.appointment.groupBy({
    by: ["status"],
    where: { tenantId },
    _count: true,
  });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Ventas</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card">
          <p className="text-xs text-slate-500">Tickets cobrados</p>
          <p className="text-3xl">{paid._count}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500">Ingresos</p>
          <p className="text-3xl">{money(paid._sum.totalCents || 0)}</p>
        </div>
      </div>
      <div className="card">
        <p className="text-sm text-slate-400 mb-2">Citas por estado</p>
        <ul className="text-sm space-y-1">
          {services.map((s) => (
            <li key={s.status}>
              {s.status}: {s._count}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
