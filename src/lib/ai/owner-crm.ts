import { prisma } from "../db";
import { money } from "../auth";
import { VERTICAL_LABEL } from "../modules";
import {
  STATUS_LABEL,
  addDaysYmd,
  availableSlotsAnyStaff,
  bogotaParts,
  fmtRange,
  fmtSlotLine,
  formatHoursHuman,
  fromBogotaLocal,
  parseWhenHint,
  upcomingCalendar,
} from "../reservations";

function dayRange(ymd: string) {
  return {
    from: fromBogotaLocal(`${ymd}T00:00`),
    to: fromBogotaLocal(`${addDaysYmd(ymd, 1)}T00:00`),
  };
}

function wantedYmd(raw?: string) {
  const hint = parseWhenHint(raw);
  if (hint?.hasDate) return bogotaParts(hint.at).ymd;
  return bogotaParts(new Date()).ymd;
}

function hhmm(d: Date) {
  const p = bogotaParts(d);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

function lineAppt(a: {
  startsAt: Date;
  endsAt: Date;
  status: string;
  customer: { name: string; phone: string };
  service: { name: string };
  staff: { name: string } | null;
}) {
  return `${fmtRange(a.startsAt)}–${hhmm(a.endsAt)} · ${a.customer.name} (${a.customer.phone}) · ${a.service.name} · ${a.staff?.name || "sin asignar"} · ${STATUS_LABEL[a.status] || a.status}`;
}

export async function ownerBriefing(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      branches: true,
      services: { where: { active: true } },
      staff: { where: { active: true } },
      policies: true,
      phones: true,
    },
  });
  if (!tenant) return "Sin negocio.";

  const today = bogotaParts(new Date()).ymd;
  const weekEnd = addDaysYmd(today, 7);
  const { from: dayFrom, to: dayTo } = dayRange(today);
  const weekFrom = fromBogotaLocal(`${today}T00:00`);
  const weekTo = fromBogotaLocal(`${weekEnd}T00:00`);
  const monthStart = `${today.slice(0, 8)}01`;
  const monthFrom = fromBogotaLocal(`${monthStart}T00:00`);

  const [
    customers,
    todayAppts,
    weekAppts,
    invoicesMonth,
    invoicesAll,
    inventory,
    metrics,
    unread,
    byStatus,
  ] = await Promise.all([
    prisma.customer.count({ where: { tenantId } }),
    prisma.appointment.findMany({
      where: { tenantId, startsAt: { lt: dayTo }, endsAt: { gt: dayFrom } },
      include: { customer: true, service: true, staff: true },
      orderBy: { startsAt: "asc" },
      take: 20,
    }),
    prisma.appointment.count({
      where: {
        tenantId,
        startsAt: { gte: weekFrom, lt: weekTo },
        status: { in: ["CONFIRMED", "PENDING", "RESCHEDULED"] },
      },
    }),
    prisma.invoice.aggregate({
      where: { tenantId, issuedAt: { gte: monthFrom } },
      _sum: { totalCents: true },
      _count: true,
    }),
    prisma.invoice.aggregate({
      where: { tenantId },
      _sum: { totalCents: true },
      _count: true,
    }),
    prisma.inventoryItem.findMany({ where: { tenantId }, take: 30 }),
    prisma.aiDailyMetric.findMany({
      where: { tenantId },
      orderBy: { day: "desc" },
      take: 7,
    }),
    prisma.ownerNotification.count({ where: { tenantId, read: false } }),
    prisma.appointment.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: true,
    }),
  ]);

  const liveToday = todayAppts.filter((a) =>
    ["CONFIRMED", "PENDING", "RESCHEDULED"].includes(a.status),
  );

  return [
    `Negocio CRM: ${tenant.name}. Rubro: ${VERTICAL_LABEL[tenant.vertical] || tenant.vertical}. Zona: ${tenant.timezone}. Intervalo ${tenant.slotMin || 15} min.`,
    `Hoy (${today}): ${liveToday.length} citas vigentes de ${todayAppts.length} en el día. Esta semana (vigentes): ${weekAppts}. Clientes en CRM: ${customers}. Avisos sin leer: ${unread}.`,
    `Citas de hoy: ${liveToday.length ? liveToday.map(lineAppt).join(" | ") : "ninguna vigente"}`,
    `Estados históricos de citas: ${byStatus.map((s) => `${STATUS_LABEL[s.status] || s.status} ${s._count}`).join(", ") || "sin citas"}`,
    `Facturación del mes: ${invoicesMonth._count} tickets · ${money(invoicesMonth._sum.totalCents || 0)}. Acumulado: ${invoicesAll._count} · ${money(invoicesAll._sum.totalCents || 0)}.`,
    "Sucursales y horarios:",
    ...tenant.branches.map(
      (b) => `- ${b.name}, ${b.address}. ${formatHoursHuman(b.hoursJson)}`,
    ),
    `Calendario 7 días: ${upcomingCalendar(tenant.branches[0]?.hoursJson || "", 7)}`,
    "Servicios:",
    ...tenant.services.map(
      (s) => `- ${s.name}: ${money(s.priceCents)} · ${s.durationMin} min`,
    ),
    "Equipo:",
    ...tenant.staff.map((s) => `- ${s.name} (${s.roleTitle})`),
    tenant.phones.length
      ? `Números: ${tenant.phones.map((p) => `${p.e164} ${p.label}`).join("; ")}`
      : "Sin números asignados.",
    tenant.policies.length
      ? `Políticas: ${tenant.policies.map((p) => `${p.key}=${p.value}`).join("; ")}`
      : "",
    inventory.length
      ? `Inventario: ${inventory.map((i) => `${i.name} SKU ${i.sku} qty ${i.qty}`).join(" | ")}`
      : "Sin inventario cargado.",
    metrics.length
      ? `Sofía (7 días): ${metrics
          .map(
            (m) =>
              `${m.day.toISOString().slice(0, 10)} chats ${m.conversations} reservas ${m.bookings} cancel ${m.cancellations}`,
          )
          .join(" | ")}`
      : "Aún no hay métricas de Sofía.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function runOwnerTool(tenantId: string, name: string, args: Record<string, string>) {
  if (name === "resumen") return ownerBriefing(tenantId);

  if (name === "agenda") {
    const raw = (args.fecha || args.cuando || "").trim();
    const week = /semana/i.test(raw);
    if (week) {
      const start = bogotaParts(new Date()).ymd;
      const lines: string[] = [];
      for (let i = 0; i < 7; i++) {
        const ymd = addDaysYmd(start, i);
        const { from, to } = dayRange(ymd);
        const rows = await prisma.appointment.findMany({
          where: { tenantId, startsAt: { lt: to }, endsAt: { gt: from } },
          include: { customer: true, service: true, staff: true },
          orderBy: { startsAt: "asc" },
        });
        const live = rows.filter((a) =>
          ["CONFIRMED", "PENDING", "RESCHEDULED"].includes(a.status),
        );
        lines.push(
          live.length
            ? `${ymd}: ${live.map(lineAppt).join(" | ")}`
            : `${ymd}: sin citas vigentes (${rows.length ? rows.length + " canceladas/hechas" : "vacío, abierto si el horario lo permite"})`,
        );
      }
      return `Agenda de la semana:\n${lines.join("\n")}`;
    }
    const ymd = wantedYmd(raw || "hoy");
    const { from, to } = dayRange(ymd);
    const rows = await prisma.appointment.findMany({
      where: { tenantId, startsAt: { lt: to }, endsAt: { gt: from } },
      include: { customer: true, service: true, staff: true, branch: true },
      orderBy: { startsAt: "asc" },
      take: 50,
    });
    if (!rows.length) {
      return `${ymd}: no hay citas en el CRM. El día puede estar ABIERTO según horario; vacío no significa cerrado.`;
    }
    return `${ymd} (${rows.length} registros):\n${rows.map(lineAppt).join("\n")}`;
  }

  if (name === "buscar_cliente") {
    const q = (args.busqueda || "").trim();
    if (!q) return "Indica nombre o teléfono.";
    const digits = q.replace(/\D/g, "");
    const rows = await prisma.customer.findMany({
      where: {
        tenantId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
        ],
      },
      include: {
        appointments: {
          include: { service: true, staff: true },
          orderBy: { startsAt: "desc" },
          take: 6,
        },
      },
      take: 12,
    });
    if (!rows.length) return `No hay cliente en este CRM con “${q}”.`;
    return rows
      .map((c) => {
        const hist = c.appointments.length
          ? c.appointments
              .map(
                (a) =>
                  `${fmtRange(a.startsAt)} ${a.service.name} ${STATUS_LABEL[a.status] || a.status} ${a.staff?.name || ""}`,
              )
              .join("; ")
          : "sin citas";
        return `${c.name} · ${c.phone}${c.email ? ` · ${c.email}` : ""}${c.notes ? ` · notas: ${c.notes}` : ""} · ${hist}`;
      })
      .join("\n");
  }

  if (name === "catalogo") {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { services: true, staff: true, branches: true, policies: true },
    });
    if (!tenant) return "Sin negocio.";
    const que = (args.que || "todo").toLowerCase();
    const parts: string[] = [];
    if (que === "todo" || que.includes("serv")) {
      parts.push(
        "Servicios: " +
          (tenant.services.map((s) => `${s.name} ${money(s.priceCents)} ${s.durationMin} min${s.active ? "" : " (inactivo)"}`).join(" | ") ||
            "ninguno"),
      );
    }
    if (que === "todo" || que.includes("pers") || que.includes("equip") || que.includes("staff")) {
      parts.push(
        "Personal: " +
          (tenant.staff.map((s) => `${s.name} (${s.roleTitle})${s.active ? "" : " inactivo"}`).join(" | ") ||
            "ninguno"),
      );
    }
    if (que === "todo" || que.includes("hora") || que.includes("sede") || que.includes("sucur")) {
      parts.push(
        tenant.branches
          .map((b) => `${b.name} ${b.address}. ${formatHoursHuman(b.hoursJson)}`)
          .join(" | ") || "sin sedes",
      );
      parts.push(`Calendario: ${upcomingCalendar(tenant.branches[0]?.hoursJson || "", 10)}`);
    }
    if (que === "todo" || que.includes("polit")) {
      parts.push(
        tenant.policies.length
          ? tenant.policies.map((p) => `${p.key}: ${p.value}`).join(" | ")
          : "sin políticas",
      );
    }
    return parts.join("\n") || ownerBriefing(tenantId);
  }

  if (name === "inventario") {
    const rows = await prisma.inventoryItem.findMany({ where: { tenantId } });
    if (!rows.length) return "Este CRM no tiene artículos de inventario.";
    const low = rows.filter((i) => i.qty <= 3);
    return (
      rows.map((i) => `${i.name} (${i.sku}): ${i.qty} · costo ${money(i.costCents)}`).join(" | ") +
      (low.length ? ` · BAJO STOCK: ${low.map((i) => i.name).join(", ")}` : "")
    );
  }

  if (name === "ventas") {
    const paid = await prisma.invoice.aggregate({
      where: { tenantId, status: "paid" },
      _sum: { totalCents: true },
      _count: true,
    });
    const all = await prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { issuedAt: "desc" },
      take: 12,
    });
    const byStatus = await prisma.appointment.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: true,
    });
    return [
      `Cobrados: ${paid._count} tickets · ${money(paid._sum.totalCents || 0)}.`,
      `Últimas facturas: ${
        all.length
          ? all
              .map(
                (i) =>
                  `${i.number} ${money(i.totalCents)} ${i.status} ${i.issuedAt.toISOString().slice(0, 10)}`,
              )
              .join(" | ")
          : "ninguna"
      }`,
      `Citas por estado: ${byStatus.map((s) => `${STATUS_LABEL[s.status] || s.status} ${s._count}`).join(", ")}`,
    ].join(" ");
  }

  if (name === "metricas") {
    const rows = await prisma.aiDailyMetric.findMany({
      where: { tenantId },
      orderBy: { day: "desc" },
      take: 14,
    });
    if (!rows.length) return "Sofía aún no tiene métricas en este negocio.";
    const sum = rows.reduce(
      (a, m) => ({
        c: a.c + m.conversations,
        b: a.b + m.bookings,
        k: a.k + m.cancellations,
      }),
      { c: 0, b: 0, k: 0 },
    );
    return `Últimos ${rows.length} días: ${sum.c} chats, ${sum.b} reservas, ${sum.k} cancelaciones. Detalle: ${rows
      .map((m) => `${m.day.toISOString().slice(0, 10)} chats ${m.conversations} reservas ${m.bookings} cancel ${m.cancellations}`)
      .join(" | ")}`;
  }

  if (name === "huecos") {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { services: { where: { active: true } }, branches: true },
    });
    const hint = (args.servicio || "").toLowerCase();
    const service =
      tenant?.services.find((s) => hint && s.name.toLowerCase().includes(hint.split(" ")[0] || "")) ||
      tenant?.services[0];
    if (!service) return "No hay servicios en el catálogo.";
    const slots = await availableSlotsAnyStaff({
      tenantId,
      serviceId: service.id,
      branchId: tenant?.branches[0]?.id,
      days: 10,
    });
    if (!slots.length) return `Sin huecos libres para ${service.name} en los próximos días.`;
    const grouped = new Map<string, string[]>();
    for (const s of slots) {
      const ymd = bogotaParts(s.start).ymd;
      const arr = grouped.get(ymd) || [];
      if (arr.length < 4) arr.push(fmtSlotLine(s.start));
      grouped.set(ymd, arr);
    }
    return `Huecos LIBRES para ${service.name}: ${[...grouped.entries()]
      .slice(0, 8)
      .map(([d, t]) => `${d} ${t.join(", ")}`)
      .join(" · ")}`;
  }

  if (name === "avisos") {
    const rows = await prisma.ownerNotification.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 15,
    });
    if (!rows.length) return "No hay avisos.";
    return rows
      .map(
        (n) =>
          `${n.read ? "" : "NUEVO · "}${n.title}: ${n.body} (${n.createdAt.toISOString().slice(0, 16).replace("T", " ")})`,
      )
      .join(" | ");
  }

  return "Herramienta desconocida.";
}

export async function ownerFallback(tenantId: string, text: string) {
  const low = text.toLowerCase();
  if (/cliente|tel[eé]fono|qui[eé]n es/.test(low)) {
    const q = text.replace(/.*(?:cliente|tel[eé]fono|de)\s+/i, "").trim() || text;
    return runOwnerTool(tenantId, "buscar_cliente", { busqueda: q });
  }
  if (/hueco|disponib|libre/.test(low)) return runOwnerTool(tenantId, "huecos", { servicio: text });
  if (/cita|agenda|turno|hoy|ma[ñn]ana|semana/.test(low)) {
    return runOwnerTool(tenantId, "agenda", { fecha: text });
  }
  if (/horario|abren|cierran|sede/.test(low)) return runOwnerTool(tenantId, "catalogo", { que: "horarios" });
  if (/servicio|precio|personal|equipo/.test(low)) return runOwnerTool(tenantId, "catalogo", { que: "todo" });
  if (/venta|ingreso|factura|cobr/.test(low)) return runOwnerTool(tenantId, "ventas", {});
  if (/inventario|stock|producto/.test(low)) return runOwnerTool(tenantId, "inventario", {});
  if (/sofia|ia|chat|reservas ia/.test(low)) return runOwnerTool(tenantId, "metricas", {});
  if (/aviso|notific/.test(low)) return runOwnerTool(tenantId, "avisos", {});
  return runOwnerTool(tenantId, "resumen", {});
}
