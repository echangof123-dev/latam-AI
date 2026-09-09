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
        Sofía atiende por chat, voz y WhatsApp. Aquí no ves las charlas: solo números y resultados.
      </p>
      <Link href="/chat" className="btn-gold inline-block">
        Hablar con Sofía ahora
      </Link>
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
