import { prisma } from "./db";

const WEEK = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"] as const;
export const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  RESCHEDULED: "Reprogramada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  NO_SHOW: "No asistió",
};

export type HoursMap = Record<string, string[]>;

export function parseHours(hoursJson: string): HoursMap {
  try {
    const raw = JSON.parse(hoursJson) as HoursMap;
    return raw && typeof raw === "object" ? raw : defaultHours();
  } catch {
    return defaultHours();
  }
}

function defaultHours(): HoursMap {
  return {
    lun: ["09:00-18:00"],
    mar: ["09:00-18:00"],
    mie: ["09:00-18:00"],
    jue: ["09:00-18:00"],
    vie: ["09:00-18:00"],
    sab: ["09:00-14:00"],
    dom: [],
  };
}

export function bogotaParts(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  const weekday = (map.weekday || "mon").toLowerCase().slice(0, 3);
  const keyMap: Record<string, string> = {
    sun: "dom",
    mon: "lun",
    tue: "mar",
    wed: "mie",
    thu: "jue",
    fri: "vie",
    sat: "sab",
  };
  return {
    ymd: `${map.year}-${map.month}-${map.day}`,
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekKey: keyMap[weekday] || WEEK[d.getUTCDay()],
  };
}

/** Interpreta datetime-local como hora de Bogotá (UTC-5). */
export function fromBogotaLocal(value: string) {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return new Date(value);
  return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00-05:00`);
}

export function toBogotaInput(d: Date) {
  const p = bogotaParts(d);
  return `${p.ymd}T${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

function parseRange(range: string) {
  const [a, b] = range.split("-");
  const [ah, am] = (a || "09:00").split(":").map(Number);
  const [bh, bm] = (b || "18:00").split(":").map(Number);
  return { startMin: ah * 60 + am, endMin: bh * 60 + bm };
}

export function fitsHours(start: Date, end: Date, hours: HoursMap) {
  const p = bogotaParts(start);
  const pe = bogotaParts(end);
  if (p.ymd !== pe.ymd) return false;
  const startMin = p.hour * 60 + p.minute;
  const endMin = pe.hour * 60 + pe.minute;
  return (hours[p.weekKey] || []).some((w) => {
    const r = parseRange(w);
    return startMin >= r.startMin && endMin <= r.endMin;
  });
}

function atBogota(ymd: string, minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return fromBogotaLocal(`${ymd}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

const BUSY = ["CONFIRMED", "PENDING", "RESCHEDULED"] as const;

export async function loadBusy(tenantId: string, from: Date, to: Date, staffId?: string | null) {
  return prisma.appointment.findMany({
    where: {
      tenantId,
      status: { in: [...BUSY] },
      startsAt: { lt: to },
      endsAt: { gt: from },
      ...(staffId ? { staffId } : {}),
    },
    select: { id: true, startsAt: true, endsAt: true, staffId: true },
  });
}

export function listSlotsForDay(opts: {
  ymd: string;
  weekKey: string;
  hours: HoursMap;
  durationMin: number;
  stepMin?: number;
  busy: { startsAt: Date; endsAt: Date }[];
  ignoreId?: string;
}) {
  const step = opts.stepMin || 15;
  const windows = opts.hours[opts.weekKey] || [];
  const out: { start: Date; end: Date }[] = [];
  for (const w of windows) {
    const { startMin, endMin } = parseRange(w);
    for (let m = startMin; m + opts.durationMin <= endMin; m += step) {
      const start = atBogota(opts.ymd, m);
      const end = atBogota(opts.ymd, m + opts.durationMin);
      if (start < new Date()) continue;
      const taken = opts.busy.some(
        (b) => b && overlaps(start, end, b.startsAt, b.endsAt),
      );
      if (!taken) out.push({ start, end });
    }
  }
  return out;
}

export async function availableSlots(opts: {
  tenantId: string;
  serviceId: string;
  staffId?: string;
  branchId?: string;
  days?: number;
  ignoreId?: string;
}) {
  const service = await prisma.service.findFirst({
    where: { id: opts.serviceId, tenantId: opts.tenantId },
  });
  if (!service) return [];
  const branch = opts.branchId
    ? await prisma.branch.findFirst({ where: { id: opts.branchId, tenantId: opts.tenantId } })
    : await prisma.branch.findFirst({ where: { tenantId: opts.tenantId } });
  const hours = parseHours(branch?.hoursJson || "");
  const days = Math.min(opts.days || 14, 21);
  const from = new Date();
  const to = new Date(from.getTime() + days * 86400000);
  const busyRaw = await loadBusy(opts.tenantId, from, to, opts.staffId);
  const busy = busyRaw.filter((b) => b.id !== opts.ignoreId);
  const slots: { start: Date; end: Date }[] = [];
  for (let i = 0; i < days; i++) {
    const probe = new Date(from.getTime() + i * 86400000);
    const p = bogotaParts(probe);
    slots.push(
      ...listSlotsForDay({
        ymd: p.ymd,
        weekKey: p.weekKey,
        hours,
        durationMin: service.durationMin,
        busy,
        ignoreId: opts.ignoreId,
      }),
    );
  }
  return slots.slice(0, 40);
}

export async function availableSlotsAnyStaff(opts: {
  tenantId: string;
  serviceId: string;
  branchId?: string;
  days?: number;
}) {
  const staff = await prisma.staffMember.findMany({
    where: { tenantId: opts.tenantId, active: true },
    select: { id: true },
  });
  if (!staff.length) return availableSlots(opts);
  const map = new Map<number, { start: Date; end: Date }>();
  for (const s of staff) {
    const slots = await availableSlots({ ...opts, staffId: s.id });
    for (const slot of slots) map.set(slot.start.getTime(), slot);
  }
  return [...map.values()].sort((a, b) => a.start.getTime() - b.start.getTime()).slice(0, 40);
}

export async function nextOpenSlot(opts: {
  tenantId: string;
  serviceId: string;
  staffId?: string;
  branchId?: string;
  when?: Date;
  ignoreId?: string;
  durationMin: number;
}) {
  const staffRows = opts.staffId
    ? [{ id: opts.staffId }]
    : await prisma.staffMember.findMany({
        where: { tenantId: opts.tenantId, active: true },
        select: { id: true },
      });
  const candidates = staffRows.length ? staffRows : [{ id: undefined as string | undefined }];

  if (opts.when) {
    const start = opts.when;
    const end = new Date(start.getTime() + opts.durationMin * 60000);
    if (start < new Date()) return null;
    const branch = opts.branchId
      ? await prisma.branch.findFirst({ where: { id: opts.branchId, tenantId: opts.tenantId } })
      : await prisma.branch.findFirst({ where: { tenantId: opts.tenantId } });
    if (!fitsHours(start, end, parseHours(branch?.hoursJson || ""))) return null;
    for (const s of candidates) {
      const free = await assertSlotFree({
        tenantId: opts.tenantId,
        start,
        end,
        staffId: s.id,
        ignoreId: opts.ignoreId,
      });
      if (free) return { start, end, staffId: s.id || null };
    }
    return null;
  }

  for (const s of candidates) {
    const slots = await availableSlots({
      tenantId: opts.tenantId,
      serviceId: opts.serviceId,
      staffId: s.id,
      branchId: opts.branchId,
      ignoreId: opts.ignoreId,
    });
    if (slots[0]) return { start: slots[0].start, end: slots[0].end, staffId: s.id || null };
  }
  return null;
}

export function parseWhenHint(raw?: string | null) {
  if (!raw) return null;
  const t = raw.trim();
  if (!t || /pr[oó]ximo|cuando sea|primer hueco|antes posible/i.test(t)) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t)) return fromBogotaLocal(t);
  const parsed = Date.parse(t);
  if (!Number.isNaN(parsed)) return new Date(parsed);
  return null;
}

export function fmtSlots(slots: { start: Date; end: Date }[], limit = 8) {
  return slots.slice(0, limit).map((s) => fmtRange(s.start)).join("; ") || "sin huecos en los próximos días";
}

export function fmtRange(d: Date) {
  return d.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function assertSlotFree(opts: {
  tenantId: string;
  start: Date;
  end: Date;
  staffId?: string | null;
  ignoreId?: string;
}) {
  const clash = await prisma.appointment.findFirst({
    where: {
      tenantId: opts.tenantId,
      status: { in: [...BUSY] },
      id: opts.ignoreId ? { not: opts.ignoreId } : undefined,
      staffId: opts.staffId || undefined,
      startsAt: { lt: opts.end },
      endsAt: { gt: opts.start },
    },
  });
  return !clash;
}

const WEEK_ORDER = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];

export function startOfWeekBogota(d = new Date()) {
  const p = bogotaParts(d);
  const idx = Math.max(0, WEEK_ORDER.indexOf(p.weekKey));
  return addDaysYmd(p.ymd, -idx);
}

export function addDaysYmd(ymd: string, days: number) {
  const d = new Date(`${ymd}T12:00:00-05:00`);
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
