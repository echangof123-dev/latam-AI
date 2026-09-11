import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/guards";
import { money } from "@/lib/auth";
import { markNotificationRead } from "./actions";
import Link from "next/link";
import { agentsFor } from "@/lib/brand";

export default async function OwnerHome() {
  const { tenantId } = await requireOwner();
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const agents = agentsFor(tenant.vertical, tenant.name);
  const [appts, customers, invoices, notes, metrics] = await Promise.all([
    prisma.appointment.count({
      where: { tenantId, status: { in: ["CONFIRMED", "PENDING", "RESCHEDULED"] } },
    }),
    prisma.customer.count({ where: { tenantId } }),
    prisma.invoice.aggregate({ where: { tenantId }, _sum: { totalCents: true } }),
    prisma.ownerNotification.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.aiDailyMetric.findMany({
      where: { tenantId },
      orderBy: { day: "desc" },
      take: 7,
    }),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl">{tenant.name}</h1>
        <p className="text-slate-400 mt-2 max-w-2xl leading-relaxed">
          Reservas, pagos y resúmenes de {tenant.name}. {agents.owner.name} consulta el CRM (voz de hombre).{" "}
          {agents.client.name} atiende a tus clientes (voz de mujer).
        </p>
        <Link href="/app/asistente" className="btn-gold inline-block mt-4">
          Hablar con {agents.owner.name}
        </Link>
      </header>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-xs text-slate-500">Citas activas</p>
          <p className="text-3xl mt-1">{appts}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500">Clientes</p>
          <p className="text-3xl mt-1">{customers}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500">Facturado</p>
          <p className="text-3xl mt-1">{money(invoices._sum.totalCents || 0)}</p>
        </div>
      </div>
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="card space-y-3">
          <h2 className="font-semibold">Avisos importantes</h2>
          {notes.length === 0 ? <p className="text-slate-500 text-sm">Sin avisos.</p> : null}
          {notes.map((n) => (
            <form key={n.id} action={markNotificationRead} className="border-b border-ink-800 pb-3">
              <input type="hidden" name="id" value={n.id} />
              <p className="text-sm font-medium">
                {n.title} {n.read ? "" : <span className="text-gold-400">· nuevo</span>}
              </p>
              <p className="text-sm text-slate-400">{n.body}</p>
              {!n.read ? (
                <button className="text-xs text-gold-400 mt-1">Marcar leído</button>
              ) : null}
            </form>
          ))}
        </div>
        <div className="card">
          <h2 className="font-semibold mb-3">Rendimiento IA (7 días)</h2>
          <table className="w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="text-left font-normal">Día</th>
                <th>Chats</th>
                <th>Reservas</th>
                <th>Cancel.</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.id} className="border-t border-ink-800">
                  <td className="py-2">{m.day.toISOString().slice(0, 10)}</td>
                  <td className="text-center">{m.conversations}</td>
                  <td className="text-center">{m.bookings}</td>
                  <td className="text-center">{m.cancellations}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {metrics.length === 0 ? <p className="text-slate-500 text-sm">Aún no hay métricas.</p> : null}
        </div>
      </section>
    </div>
  );
}
