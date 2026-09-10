import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/guards";
import {
  STATUS_LABEL,
  addDaysYmd,
  availableSlotsAnyStaff,
  bogotaParts,
  fmtRange,
  fromBogotaLocal,
  parseHours,
  startOfWeekBogota,
  toBogotaInput,
} from "@/lib/reservations";
import { PageHeader } from "@/components/nav";
import { createReservation, rescheduleReservation, setReservationStatus } from "./actions";

const DAY_TITLE = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const TONE: Record<string, string> = {
  CONFIRMED: "border-gold-500/40 bg-gold-500/10",
  PENDING: "border-sky-400/40 bg-sky-400/10",
  RESCHEDULED: "border-violet-400/40 bg-violet-400/10",
  CANCELLED: "border-white/10 bg-white/5 opacity-60",
  COMPLETED: "border-emerald-400/40 bg-emerald-400/10",
  NO_SHOW: "border-rose-400/40 bg-rose-400/10",
};

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; staff?: string }>;
}) {
  const { tenantId } = await requireOwner();
  const q = await searchParams;
  const week = /^\d{4}-\d{2}-\d{2}$/.test(q.week || "") ? q.week! : startOfWeekBogota();
  const staffFilter = q.staff || "";
  const weekEnd = addDaysYmd(week, 7);
  const rangeStart = fromBogotaLocal(`${week}T00:00`);
  const rangeEnd = fromBogotaLocal(`${weekEnd}T00:00`);

  const [rows, customers, services, staff, branches] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        tenantId,
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
        ...(staffFilter ? { staffId: staffFilter } : {}),
      },
      include: { customer: true, service: true, staff: true, branch: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.customer.findMany({ where: { tenantId }, orderBy: { name: "asc" }, take: 200 }),
    prisma.service.findMany({ where: { tenantId, active: true }, orderBy: { name: "asc" } }),
    prisma.staffMember.findMany({ where: { tenantId, active: true }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ where: { tenantId } }),
  ]);

  const live = rows.filter((r) => ["CONFIRMED", "PENDING", "RESCHEDULED"].includes(r.status));
  const hours = parseHours(branches[0]?.hoursJson || "");
  const today = bogotaParts(new Date()).ymd;
  const nextSlots =
    services[0] &&
    (await availableSlotsAnyStaff({
      tenantId,
      serviceId: services[0].id,
      branchId: branches[0]?.id,
      days: 7,
    }));

  const days = DAY_TITLE.map((title, i) => {
    const ymd = addDaysYmd(week, i);
    const weekKey = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"][i];
    return {
      title,
      ymd,
      hoursLabel: (hours[weekKey] || []).join(" ") || "Cerrado",
      items: rows.filter((r) => bogotaParts(r.startsAt).ymd === ymd),
    };
  });

  const prev = addDaysYmd(week, -7);
  const next = addDaysYmd(week, 7);
  const qs = staffFilter ? `&staff=${staffFilter}` : "";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          kicker="Reservas"
          title="Agenda"
          hint="Calendario semanal, huecos según horario de sede y reprogramación sin solapes."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/app/agenda?week=${prev}${qs}`} className="btn-ghost text-sm">
            Semana anterior
          </Link>
          <Link href={`/app/agenda?week=${startOfWeekBogota()}${qs}`} className="btn-ghost text-sm">
            Hoy
          </Link>
          <Link href={`/app/agenda?week=${next}${qs}`} className="btn-ghost text-sm">
            Semana siguiente
          </Link>
        </div>
      </header>

      <div className="grid sm:grid-cols-4 gap-3">
        <div className="card py-4">
          <p className="text-xs text-slate-500">Citas de la semana</p>
          <p className="text-2xl mt-1">{live.length}</p>
        </div>
        <div className="card py-4">
          <p className="text-xs text-slate-500">Confirmadas</p>
          <p className="text-2xl mt-1">{rows.filter((r) => r.status === "CONFIRMED").length}</p>
        </div>
        <div className="card py-4">
          <p className="text-xs text-slate-500">Pendientes / movidas</p>
          <p className="text-2xl mt-1">
            {rows.filter((r) => r.status === "PENDING" || r.status === "RESCHEDULED").length}
          </p>
        </div>
        <div className="card py-4">
          <p className="text-xs text-slate-500">Huecos próximos ({services[0]?.name || "servicio"})</p>
          <p className="text-sm mt-2 text-slate-300 leading-relaxed">
            {nextSlots && nextSlots.length
              ? nextSlots.slice(0, 3).map((s) => fmtRange(s.start)).join(" · ")
              : "Sin huecos o falta servicio"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center text-sm">
        <span className="text-slate-500">Profesional:</span>
        <Link
          href={`/app/agenda?week=${week}`}
          className={`rounded-full px-3 py-1 border ${!staffFilter ? "border-gold-500 text-gold-400" : "border-white/10"}`}
        >
          Todos
        </Link>
        {staff.map((s) => (
          <Link
            key={s.id}
            href={`/app/agenda?week=${week}&staff=${s.id}`}
            className={`rounded-full px-3 py-1 border ${staffFilter === s.id ? "border-gold-500 text-gold-400" : "border-white/10"}`}
          >
            {s.name}
          </Link>
        ))}
        <Link href="/app/sucursales" className="ml-auto text-gold-400 text-xs">
          Editar horarios de sede →
        </Link>
      </div>

      <div className="grid xl:grid-cols-[1fr_320px] gap-6">
        <div className="overflow-x-auto">
          <div className="min-w-[980px] grid grid-cols-7 gap-2">
            {days.map((d) => (
              <section
                key={d.ymd}
                className={`rounded-2xl border p-3 min-h-[420px] ${
                  d.ymd === today ? "border-gold-500/50 bg-gold-500/5" : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <header className="mb-3">
                  <p className="text-xs text-slate-500">{d.title}</p>
                  <p className="font-medium">{d.ymd.slice(8, 10)}/{d.ymd.slice(5, 7)}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{d.hoursLabel}</p>
                </header>
                <div className="space-y-2">
                  {d.items.length === 0 ? (
                    <p className="text-xs text-slate-600">Sin reservas</p>
                  ) : null}
                  {d.items.map((r) => (
                    <article
                      key={r.id}
                      className={`rounded-xl border p-2.5 text-xs space-y-2 ${TONE[r.status] || "border-white/10"}`}
                    >
                      <p className="font-semibold text-sm">
                        {bogotaParts(r.startsAt).hour.toString().padStart(2, "0")}:
                        {bogotaParts(r.startsAt).minute.toString().padStart(2, "0")}
                        <span className="text-slate-400 font-normal">
                          {" "}
                          – {bogotaParts(r.endsAt).hour.toString().padStart(2, "0")}:
                          {bogotaParts(r.endsAt).minute.toString().padStart(2, "0")}
                        </span>
                      </p>
                      <p>{r.customer.name}</p>
                      <p className="text-slate-400">{r.service.name}</p>
                      <p className="text-slate-500">
                        {r.staff?.name || "Sin asignar"} · {STATUS_LABEL[r.status] || r.status}
                      </p>
                      {["CONFIRMED", "PENDING", "RESCHEDULED"].includes(r.status) ? (
                        <>
                          <form action={rescheduleReservation} className="space-y-1">
                            <input type="hidden" name="id" value={r.id} />
                            <input
                              type="datetime-local"
                              name="startsAt"
                              defaultValue={toBogotaInput(r.startsAt)}
                              className="w-full text-[11px] py-1.5"
                            />
                            <button className="w-full rounded-lg bg-white/10 py-1.5">Reprogramar</button>
                          </form>
                          <div className="grid grid-cols-2 gap-1">
                            <form action={setReservationStatus}>
                              <input type="hidden" name="id" value={r.id} />
                              <input type="hidden" name="status" value="COMPLETED" />
                              <button className="w-full rounded-lg bg-emerald-500/20 py-1.5">Hecha</button>
                            </form>
                            <form action={setReservationStatus}>
                              <input type="hidden" name="id" value={r.id} />
                              <input type="hidden" name="status" value="CANCELLED" />
                              <button className="w-full rounded-lg bg-rose-500/20 py-1.5">Cancelar</button>
                            </form>
                            <form action={setReservationStatus} className="col-span-2">
                              <input type="hidden" name="id" value={r.id} />
                              <input type="hidden" name="status" value="NO_SHOW" />
                              <button className="w-full rounded-lg bg-white/5 py-1.5">No asistió</button>
                            </form>
                          </div>
                        </>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <aside className="card h-fit space-y-4">
          <h2 className="font-semibold">Nueva reserva</h2>
          <form action={createReservation} className="space-y-3">
            <label className="block space-y-1">
              <span>Cliente existente</span>
              <select name="customerId" defaultValue="">
                <option value="">Nuevo cliente…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.phone}
                  </option>
                ))}
              </select>
            </label>
            <input name="newName" placeholder="Nombre (si es nuevo)" />
            <input name="newPhone" placeholder="Teléfono (si es nuevo)" />
            <label className="block space-y-1">
              <span>Servicio</span>
              <select name="serviceId" required>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.durationMin} min
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span>Profesional</span>
              <select name="staffId" defaultValue="">
                <option value="">Sin asignar</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span>Sede</span>
              <select name="branchId" defaultValue={branches[0]?.id || ""}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span>Inicio (hora Bogotá)</span>
              <input type="datetime-local" name="startsAt" required />
            </label>
            <textarea name="notes" placeholder="Notas internas" rows={2} />
            <button className="btn-gold w-full">Confirmar reserva</button>
            <p className="text-[11px] text-slate-500">
              El sistema rechaza solapes con el mismo profesional y respeta el horario de la sede al
              ofrecer huecos a Sofía.
            </p>
          </form>
        </aside>
      </div>
    </div>
  );
}
