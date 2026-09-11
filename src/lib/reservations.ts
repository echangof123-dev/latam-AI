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

export function formatHoursHuman(hoursJson: string) {
  const hours = parseHours(hoursJson);
  const names: Record<string, string> = {
    lun: "Lunes",
    mar: "Martes",
    mie: "Miércoles",
    jue: "Jueves",
    vie: "Viernes",
    sab: "Sábado",
    dom: "Domingo",
  };
  return (["lun", "mar", "mie", "jue", "vie", "sab", "dom"] as const)
    .map((k) => {
      const w = hours[k] || [];
      return `${names[k]}: ${w.length ? w.join(" y ") : "cerrado"}`;
    })
    .join("; ");
}

const DAY_ALIAS: Record<string, (typeof WEEK)[number]> = {
  lun: "lun",
  lunes: "lun",
  mon: "lun",
  monday: "lun",
  mar: "mar",
  martes: "mar",
  tue: "mar",
  tuesday: "mar",
  mie: "mie",
  mié: "mie",
  miercoles: "mie",
  miércoles: "mie",
  wed: "mie",
  wednesday: "mie",
  jue: "jue",
  jueves: "jue",
  thu: "jue",
  thursday: "jue",
  vie: "vie",
  viernes: "vie",
  fri: "vie",
  friday: "vie",
  sab: "sab",
  sabado: "sab",
  sábado: "sab",
  sat: "sab",
  saturday: "sab",
  dom: "dom",
  domingo: "dom",
  sun: "dom",
  sunday: "dom",
};

function asWindows(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(asWindows);
  if (typeof value !== "string") return [];
  return value
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseHours(hoursJson: string): HoursMap {
  const empty: HoursMap = { lun: [], mar: [], mie: [], jue: [], vie: [], sab: [], dom: [] };
  try {
    const raw = JSON.parse(hoursJson) as Record<string, unknown>;
    if (!raw || typeof raw !== "object") return defaultHours();
    const out: HoursMap = { ...empty };
    for (const [k, v] of Object.entries(raw)) {
      const key = DAY_ALIAS[k.toLowerCase().trim()];
      if (!key) continue;
      out[key] = asWindows(v);
    }
    return out;
  } catch {
    return defaultHours();
  }
}

export function windowsForYmd(hours: HoursMap, ymd: string) {
  return hours[weekKeyFromYmd(ymd)] || [];
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
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  const ymd = `${map.year}-${map.month}-${map.day}`;
  return {
    ymd,
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekKey: weekKeyFromYmd(ymd),
  };
}

export function weekKeyFromYmd(ymd: string) {
  const d = new Date(`${ymd}T12:00:00-05:00`);
  return WEEK[d.getUTCDay()];
}

export function humanYmd(ymd: string) {
  return new Date(`${ymd}T12:00:00-05:00`).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  });
}

export function upcomingCalendar(hoursJson: string, days = 14) {
  const hours = parseHours(hoursJson);
  const names: Record<string, string> = {
    lun: "lunes",
    mar: "martes",
    mie: "miércoles",
    jue: "jueves",
    vie: "viernes",
    sab: "sábado",
    dom: "domingo",
  };
  let ymd = bogotaParts(new Date()).ymd;
  const lines: string[] = [];
  for (let i = 0; i < days; i++) {
    const key = weekKeyFromYmd(ymd);
    const w = hours[key] || [];
    lines.push(`${ymd} ${names[key]}: ${w.length ? `ABIERTO ${w.join(" y ")}` : "CERRADO"}`);
    ymd = addDaysYmd(ymd, 1);
  }
  return lines.join("; ");
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
  const tenant = await prisma.tenant.findUnique({
    where: { id: opts.tenantId },
    select: { slotMin: true },
  });
  const stepMin = Math.max(5, branch?.slotMin || tenant?.slotMin || 15);
  const days = Math.min(Math.max(opts.days || 14, 1), 42);
  const from = new Date();
  const to = new Date(from.getTime() + days * 86400000);
  const busyRaw = await loadBusy(opts.tenantId, from, to, opts.staffId);
  const busy = busyRaw.filter((b) => b.id !== opts.ignoreId);
  const slots: { start: Date; end: Date }[] = [];
  let ymd = bogotaParts(from).ymd;
  for (let i = 0; i < days; i++) {
    slots.push(
      ...listSlotsForDay({
        ymd,
        weekKey: weekKeyFromYmd(ymd),
        hours,
        durationMin: service.durationMin,
        stepMin,
        busy,
        ignoreId: opts.ignoreId,
      }),
    );
    ymd = addDaysYmd(ymd, 1);
  }
  return slots;
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
  return [...map.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
}

export async function nextOpenSlot(opts: {
  tenantId: string;
  serviceId: string;
  staffId?: string;
  branchId?: string;
  when?: Date;
  hasDate?: boolean;
  hasTime?: boolean;
  ignoreId?: string;
  durationMin: number;
  preferStaffId?: string | null;
}) {
  const staffRows = await prisma.staffMember.findMany({
    where: { tenantId: opts.tenantId, active: true },
    select: { id: true },
  });
  const preferred = staffRows.find((s) => s.id === opts.staffId || s.id === opts.preferStaffId)?.id;
  const ordered = preferred
    ? [{ id: preferred }, ...staffRows.filter((s) => s.id !== preferred)]
    : staffRows.length
      ? staffRows
      : [{ id: undefined as string | undefined }];

  const spanDays = opts.hasDate && opts.when
    ? Math.min(42, Math.max(14, daysUntil(bogotaParts(opts.when).ymd) + 2))
    : 16;

  const collected: { start: Date; end: Date; staffId: string | null }[] = [];
  for (const s of ordered) {
    const slots = await availableSlots({
      tenantId: opts.tenantId,
      serviceId: opts.serviceId,
      staffId: s.id,
      branchId: opts.branchId,
      ignoreId: opts.ignoreId,
      days: spanDays,
    });
    for (const slot of slots) {
      collected.push({ start: slot.start, end: slot.end, staffId: s.id || null });
    }
  }
  collected.sort((a, b) => a.start.getTime() - b.start.getTime());

  if (!opts.when) return collected[0] || null;

  const want = bogotaParts(opts.when);
  const wantMin = want.hour * 60 + want.minute;
  const sameDay = collected.filter((s) => bogotaParts(s.start).ymd === want.ymd);

  if (opts.hasDate && !opts.hasTime) return sameDay[0] || null;

  if (opts.hasDate) {
    const exact = sameDay.find((s) => {
      const p = bogotaParts(s.start);
      return p.hour * 60 + p.minute === wantMin;
    });
    if (exact) return exact;
    const near = sameDay.find((s) => {
      const p = bogotaParts(s.start);
      return Math.abs(p.hour * 60 + p.minute - wantMin) <= 15;
    });
    return near || null;
  }

  const sameClock = collected.filter((s) => {
    const p = bogotaParts(s.start);
    return p.hour * 60 + p.minute === wantMin;
  });
  return sameClock[0] || null;
}

function daysUntil(ymd: string) {
  const today = bogotaParts(new Date()).ymd;
  const a = new Date(`${today}T12:00:00-05:00`).getTime();
  const b = new Date(`${ymd}T12:00:00-05:00`).getTime();
  return Math.ceil((b - a) / 86400000);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function nextClock(hour: number, minute: number, after = new Date()) {
  const p = bogotaParts(after);
  let ymd = p.ymd;
  let at = fromBogotaLocal(`${ymd}T${pad2(hour)}:${pad2(minute)}`);
  if (at.getTime() <= after.getTime() + 60_000) {
    ymd = addDaysYmd(ymd, 1);
    at = fromBogotaLocal(`${ymd}T${pad2(hour)}:${pad2(minute)}`);
  }
  return at;
}

export type WhenHint = {
  at: Date;
  hasDate: boolean;
  hasTime: boolean;
};

const MONTHS: Record<string, number> = {
  enero: 1,
  ene: 1,
  febrero: 2,
  feb: 2,
  marzo: 3,
  abril: 4,
  abr: 4,
  mayo: 5,
  junio: 6,
  jun: 6,
  julio: 7,
  jul: 7,
  agosto: 8,
  ago: 8,
  septiembre: 9,
  setiembre: 9,
  sept: 9,
  sep: 9,
  octubre: 10,
  oct: 10,
  noviembre: 11,
  nov: 11,
  diciembre: 12,
  dic: 12,
};

const WEEKDAY_INDEX: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  sábado: 6,
};

function normalizeClock(hour: number, minute: number, merRaw: string) {
  let h = hour;
  const mer = merRaw.toLowerCase().replace(/\s/g, "");
  if (mer.startsWith("p") && h < 12) h += 12;
  if (mer.startsWith("a") && h === 12) h = 0;
  return { hour: h, minute };
}

function extractClock(t: string): { hour: number; minute: number } | null {
  const iso = t.match(/\d{4}-\d{2}-\d{2}[T\s](\d{1,2}):(\d{2})/);
  if (iso) return normalizeClock(Number(iso[1]), Number(iso[2]), "");

  const las = t.match(
    /a\s+las\s+(\d{1,2})(?:\s*[:.h]\s*(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?/i,
  );
  if (las) return normalizeClock(Number(las[1]), las[2] ? Number(las[2]) : 0, las[3] || "");

  const ampm = t.match(/(\d{1,2})\s*[:.h]\s*(\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)/i);
  if (ampm) return normalizeClock(Number(ampm[1]), Number(ampm[2]), ampm[3] || "");

  const clock = t.match(/(?:^|[^\d/])(\d{1,2})\s*[:.h]\s*(\d{2})(?!\d)/);
  if (clock) return normalizeClock(Number(clock[1]), Number(clock[2]), "");

  return null;
}

function ymdFromParts(year: number, month: number, day: number, todayYmd: string, rollYear: boolean) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  let ymd = `${year}-${pad2(month)}-${pad2(day)}`;
  if (rollYear && ymd < todayYmd) ymd = `${year + 1}-${pad2(month)}-${pad2(day)}`;
  return ymd;
}

function nextWeekdayYmd(todayYmd: string, name: string) {
  const folded = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const want = WEEKDAY_INDEX[name.toLowerCase()] ?? WEEKDAY_INDEX[folded];
  if (want == null) return null;
  const cur = new Date(`${todayYmd}T12:00:00-05:00`).getUTCDay();
  const delta = (want - cur + 7) % 7;
  return addDaysYmd(todayYmd, delta);
}

function extractYmd(t: string, todayYmd: string): string | null {
  const iso = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const named = t.match(
    /\b(\d{1,2})\s+(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|ene|feb|abr|jun|jul|ago|sept|sep|oct|nov|dic)\b(?:\s+(?:de\s+)?(\d{4}))?/i,
  );
  if (named) {
    const month = MONTHS[named[2].toLowerCase()];
    const year = named[3] ? Number(named[3]) : Number(todayYmd.slice(0, 4));
    return ymdFromParts(year, month, Number(named[1]), todayYmd, !named[3]);
  }

  const dmy = t.match(/\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\b/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    if (month <= 12) {
      const year = dmy[3]
        ? dmy[3].length === 2
          ? 2000 + Number(dmy[3])
          : Number(dmy[3])
        : Number(todayYmd.slice(0, 4));
      return ymdFromParts(year, month, day, todayYmd, !dmy[3]);
    }
  }

  if (/\bhoy\b/.test(t)) return todayYmd;
  if (/\bpasado\s+ma[ñn]ana\b/.test(t)) return addDaysYmd(todayYmd, 2);
  if (/\bma[ñn]ana\b/.test(t)) return addDaysYmd(todayYmd, 1);

  const wd = t.match(
    /\b(?:este|el|para\s+el)\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/i,
  ) || t.match(/\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/i);
  if (wd) return nextWeekdayYmd(todayYmd, wd[1]);

  return null;
}

export function parseWhenHint(raw?: string | null): WhenHint | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t || /pr[oó]ximo|cuando sea|primer hueco|antes posible/i.test(t)) return null;

  const todayYmd = bogotaParts(new Date()).ymd;
  const ymd = extractYmd(t, todayYmd);
  const clock = extractClock(t);

  if (ymd && clock) {
    return {
      at: fromBogotaLocal(`${ymd}T${pad2(clock.hour)}:${pad2(clock.minute)}`),
      hasDate: true,
      hasTime: true,
    };
  }
  if (ymd) {
    return {
      at: fromBogotaLocal(`${ymd}T12:00`),
      hasDate: true,
      hasTime: false,
    };
  }
  if (clock) {
    return {
      at: nextClock(clock.hour, clock.minute),
      hasDate: false,
      hasTime: true,
    };
  }
  return null;
}

export function fmtSlotsByDay(slots: { start: Date; end: Date }[], perDay = 4, maxDays = 8) {
  const groups = new Map<string, Date[]>();
  for (const s of slots) {
    const ymd = bogotaParts(s.start).ymd;
    const arr = groups.get(ymd) || [];
    if (arr.length < perDay) arr.push(s.start);
    groups.set(ymd, arr);
  }
  const lines = [...groups.entries()].slice(0, maxDays).map(([ymd, times]) => {
    return `${humanYmd(ymd)} ABIERTO: ${times.map((d) => fmtSlotLine(d)).join(", ")}`;
  });
  return lines.join(" · ") || "sin huecos en los próximos días";
}

export function fmtSlotLine(d: Date) {
  const p = bogotaParts(d);
  return `${fmtRange(d)} [cuando=${p.ymd}T${pad2(p.hour)}:${pad2(p.minute)}]`;
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
