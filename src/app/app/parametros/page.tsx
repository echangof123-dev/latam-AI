import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/guards";
import { parseHours } from "@/lib/reservations";
import { money } from "@/lib/auth";
import { updateBranchHours, updateService, updateTenantInterval } from "../actions";

const DAYS = [
  ["lun", "Lunes"],
  ["mar", "Martes"],
  ["mie", "Miércoles"],
  ["jue", "Jueves"],
  ["vie", "Viernes"],
  ["sab", "Sábado"],
  ["dom", "Domingo"],
] as const;

export default async function ParametrosPage() {
  const { tenantId } = await requireOwner();
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    include: { branches: true, services: { orderBy: { name: "asc" } } },
  });
  const slot = tenant.slotMin || 15;

  return (
    <div className="space-y-8 max-w-4xl">
      <header>
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold-500/80">CRM</p>
        <h1 className="font-display text-4xl">Parametrización</h1>
        <p className="text-slate-400 text-sm mt-2">
          Horario e intervalo de {tenant.name}. Sofía y la agenda leen estos datos y no pisan citas ya
          guardadas en el CRM.
        </p>
      </header>

      <form action={updateTenantInterval} className="card space-y-4">
        <h2 className="font-semibold">Intervalo de atención</h2>
        <p className="text-sm text-slate-400">
          Cada cuántos minutos se puede empezar una cita (15, 20, 30…). La duración de cada servicio se
          edita abajo.
        </p>
        <label className="block space-y-1 max-w-xs">
          <span>Minutos entre inicios</span>
          <input name="slotMin" type="number" min={5} max={120} defaultValue={slot} required />
        </label>
        <button className="btn-gold">Guardar intervalo</button>
      </form>

      {tenant.branches.map((b) => {
        const hours = parseHours(b.hoursJson);
        return (
          <form key={b.id} action={updateBranchHours} className="card space-y-4">
            <input type="hidden" name="id" value={b.id} />
            <h2 className="font-semibold">Horario · {b.name}</h2>
            <p className="text-sm text-slate-400">{b.address || "Sede"}</p>
            <label className="block space-y-1 max-w-xs">
              <span>Intervalo de esta sede (min)</span>
              <input name="slotMin" type="number" min={5} defaultValue={b.slotMin || slot} />
            </label>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {DAYS.map(([key, label]) => (
                <label key={key} className="block space-y-1">
                  <span>{label}</span>
                  <input
                    name={key}
                    defaultValue={(hours[key] || []).join(", ")}
                    placeholder="09:00-18:00 o vacío"
                  />
                </label>
              ))}
            </div>
            <button className="btn-gold">Guardar horario</button>
          </form>
        );
      })}

      <section className="card space-y-4">
        <h2 className="font-semibold">Duración de cada servicio</h2>
        {tenant.services.map((s) => (
          <form key={s.id} action={updateService} className="grid md:grid-cols-4 gap-3 items-end border-b border-white/10 pb-3">
            <input type="hidden" name="id" value={s.id} />
            <label className="block space-y-1">
              <span>Servicio</span>
              <input name="name" defaultValue={s.name} />
            </label>
            <label className="block space-y-1">
              <span>Duración (min)</span>
              <input name="durationMin" type="number" min={5} defaultValue={s.durationMin} />
            </label>
            <label className="block space-y-1">
              <span>Precio (COP)</span>
              <input name="priceCents" type="number" defaultValue={s.priceCents} />
            </label>
            <button className="btn-gold">Guardar</button>
          </form>
        ))}
        {tenant.services.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay servicios. Cárgalos en Servicios.</p>
        ) : null}
        <p className="text-xs text-slate-500">
          Precio actual de ejemplo: corte {tenant.services[0] ? money(tenant.services[0].priceCents) : "—"}.
        </p>
      </section>
    </div>
  );
}
