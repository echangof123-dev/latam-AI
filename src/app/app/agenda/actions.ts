"use server";

import { revalidatePath } from "next/cache";
import { AppointmentStatus, Channel } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/guards";
import { assertSlotFree, fromBogotaLocal } from "@/lib/reservations";

function bounce() {
  revalidatePath("/app/agenda");
}

export async function createReservation(formData: FormData) {
  const { tenantId } = await requireOwner();
  const serviceId = String(formData.get("serviceId") || "");
  const staffId = String(formData.get("staffId") || "") || null;
  const branchId = String(formData.get("branchId") || "") || null;
  const customerId = String(formData.get("customerId") || "");
  const newName = String(formData.get("newName") || "").trim();
  const newPhone = String(formData.get("newPhone") || "").trim();
  const when = String(formData.get("startsAt") || "");
  const notes = String(formData.get("notes") || "").trim() || null;
  const service = await prisma.service.findFirst({ where: { id: serviceId, tenantId } });
  if (!service || !when) return;
  let cid = customerId;
  if (!cid) {
    if (!newName || !newPhone) return;
    const c = await prisma.customer.upsert({
      where: { tenantId_phone: { tenantId, phone: newPhone } },
      update: { name: newName },
      create: { tenantId, name: newName, phone: newPhone },
    });
    cid = c.id;
  }
  const start = fromBogotaLocal(when);
  const end = new Date(start.getTime() + service.durationMin * 60000);
  const free = await assertSlotFree({ tenantId, start, end, staffId });
  if (!free) return;
  await prisma.appointment.create({
    data: {
      tenantId,
      customerId: cid,
      serviceId,
      staffId,
      branchId,
      startsAt: start,
      endsAt: end,
      status: "CONFIRMED",
      source: Channel.WEB,
      notes,
    },
  });
  bounce();
}

export async function rescheduleReservation(formData: FormData) {
  const { tenantId } = await requireOwner();
  const id = String(formData.get("id") || "");
  const when = String(formData.get("startsAt") || "");
  const appt = await prisma.appointment.findFirst({
    where: { id, tenantId },
    include: { service: true },
  });
  if (!appt || !when) return;
  const start = fromBogotaLocal(when);
  const end = new Date(start.getTime() + appt.service.durationMin * 60000);
  const team = await prisma.staffMember.findMany({
    where: { tenantId, active: true },
    select: { id: true },
  });
  const order = [
    ...(appt.staffId ? [{ id: appt.staffId }] : []),
    ...team.filter((s) => s.id !== appt.staffId),
    { id: null as string | null },
  ];
  let staffId = appt.staffId;
  let free = false;
  for (const s of order) {
    free = await assertSlotFree({
      tenantId,
      start,
      end,
      staffId: s.id,
      ignoreId: appt.id,
    });
    if (free) {
      staffId = s.id;
      break;
    }
  }
  if (!free) return;
  await prisma.appointment.update({
    where: { id: appt.id },
    data: { startsAt: start, endsAt: end, status: "RESCHEDULED", staffId },
  });
  bounce();
}

export async function setReservationStatus(formData: FormData) {
  const { tenantId } = await requireOwner();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as AppointmentStatus;
  const allowed: AppointmentStatus[] = [
    "PENDING",
    "CONFIRMED",
    "CANCELLED",
    "COMPLETED",
    "NO_SHOW",
  ];
  if (!allowed.includes(status)) return;
  await prisma.appointment.updateMany({ where: { id, tenantId }, data: { status } });
  bounce();
}
