import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/guards";
import { parseHours } from "@/lib/reservations";
import { createBranch, updateBranchHours } from "../actions";

const DAYS = [
  ["lun", "Lunes"],
  ["mar", "Martes"],
  ["mie", "Miércoles"],
  ["jue", "Jueves"],
  ["vie", "Viernes"],
  ["sab", "Sábado"],
  ["dom", "Domingo"],
] as const;

export default async function SucursalesPage() {
  const { tenantId } = await requireOwner();
  const rows = await prisma.branch.findMany({ where: { tenantId } });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Sucursales y horarios</h1>
      <p className="text-slate-400 text-sm">
        El calendario y Sofía usan estos horarios. También puedes editarlos en Parametrización.
      </p>
      <form action={createBranch} className="card grid md:grid-cols-4 gap-3">
        <input name="name" placeholder="Sede" required />
        <input name="address" placeholder="Dirección" />
        <input name="slotMin" type="number" min={5} defaultValue={15} placeholder="Intervalo min" />
        <button className="rounded-lg bg-gold-500 text-ink-950 font-semibold">Añadir</button>
      </form>
      <div className="space-y-4">
        {rows.map((b) => {
          const hours = parseHours(b.hoursJson);
          return (
            <form key={b.id} action={updateBranchHours} className="card space-y-4">
              <input type="hidden" name="id" value={b.id} />
              <div>
                <p className="font-medium">{b.name}</p>
                <p className="text-sm text-slate-400">{b.address}</p>
              </div>
              <label className="block space-y-1 max-w-xs">
                <span>Intervalo (min)</span>
                <input name="slotMin" type="number" min={5} defaultValue={b.slotMin || 15} />
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
      </div>
    </div>
  );
}
