import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireModule } from "@/lib/guards";

export default async function IaPage() {
  const { tenantId } = await requireModule("ia");
  const phones = await prisma.phoneNumber.findMany({ where: { tenantId } });
  const metrics = await prisma.aiDailyMetric.findMany({
    where: { tenantId },
    orderBy: { day: "desc" },
    take: 14,
  });
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="font-display text-4xl">Atención IA</h1>
      <p className="text-slate-400">
        Sofía atiende a tus clientes por chat, voz y WhatsApp. Elena es tu asistente interno: le
        preguntas al CRM de este negocio (citas, clientes, ventas) sin ver las charlas de Sofía.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/app/asistente" className="btn-gold inline-block">
          Asistente del negocio
        </Link>
        <Link href="/chat" className="btn-ghost inline-block">
          Probar a Sofía (clientes)
        </Link>
        <Link href="/app/parametros" className="btn-ghost inline-block">
          Parametrizar horario
        </Link>
      </div>
      <div className="card">
        <h2 className="font-semibold mb-2">Números asignados</h2>
        <ul className="text-sm space-y-1">
          {phones.map((p) => (
            <li key={p.id}>
              <span className="text-gold-400">{p.e164}</span> — {p.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="card overflow-x-auto">
        <h2 className="font-semibold mb-2">Resultados diarios</h2>
        <table className="w-full text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="text-left">Día</th>
              <th>Conversaciones</th>
              <th>Reservas</th>
              <th>Cancelaciones</th>
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
      </div>
    </div>
  );
}
