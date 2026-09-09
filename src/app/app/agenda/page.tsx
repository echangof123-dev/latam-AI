import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/guards";

export default async function AgendaPage() {
  const { tenantId } = await requireOwner();
  const rows = await prisma.appointment.findMany({
    where: { tenantId },
    include: { customer: true, service: true, staff: true, branch: true },
    orderBy: { startsAt: "asc" },
    take: 80,
  });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Agenda</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="text-left py-2">Cuando</th>
              <th className="text-left">Cliente</th>
              <th className="text-left">Servicio</th>
              <th className="text-left">Quién</th>
              <th className="text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-ink-800">
                <td className="py-2">{r.startsAt.toLocaleString("es-CO")}</td>
                <td>{r.customer.name}</td>
                <td>{r.service.name}</td>
                <td>{r.staff?.name || "—"}</td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="text-slate-500">Sin citas.</p> : null}
      </div>
    </div>
  );
}
