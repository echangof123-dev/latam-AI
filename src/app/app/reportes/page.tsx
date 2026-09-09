import { prisma } from "@/lib/db";
import { requireModule } from "@/lib/guards";

export default async function ReportesPage() {
  const { tenantId } = await requireModule("reportes");
  const [customers, staff, services, ai] = await Promise.all([
    prisma.customer.count({ where: { tenantId } }),
    prisma.staffMember.count({ where: { tenantId } }),
    prisma.service.count({ where: { tenantId } }),
    prisma.aiDailyMetric.aggregate({
      where: { tenantId },
      _sum: { conversations: true, bookings: true, cancellations: true },
    }),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Reportes</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          ["Clientes", customers],
          ["Personal", staff],
          ["Servicios", services],
          ["Chats IA", ai._sum.conversations || 0],
          ["Reservas IA", ai._sum.bookings || 0],
          ["Cancelaciones IA", ai._sum.cancellations || 0],
        ].map(([k, v]) => (
          <div key={String(k)} className="card">
            <p className="text-xs text-slate-500">{k}</p>
            <p className="text-3xl mt-1">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
