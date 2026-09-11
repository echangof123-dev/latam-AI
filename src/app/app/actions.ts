"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/guards";

export async function createService(formData: FormData) {
  const { tenantId } = await requireOwner();
  const name = String(formData.get("name") || "").trim();
  const durationMin = Number(formData.get("durationMin") || 30);
  const priceCents = Number(formData.get("priceCents") || 0);
  if (!name) return;
  await prisma.service.create({
    data: { tenantId, name, durationMin, priceCents },
  });
  revalidatePath("/app/servicios");
}

export async function createStaff(formData: FormData) {
  const { tenantId } = await requireOwner();
  const name = String(formData.get("name") || "").trim();
  const roleTitle = String(formData.get("roleTitle") || "Staff").trim();
  if (!name) return;
  await prisma.staffMember.create({ data: { tenantId, name, roleTitle } });
  revalidatePath("/app/personal");
}

export async function createCustomer(formData: FormData) {
  const { tenantId } = await requireOwner();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  if (!name || !phone) return;
  await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId, phone } },
    update: { name },
    create: { tenantId, name, phone },
  });
  revalidatePath("/app/clientes");
}

export async function createBranch(formData: FormData) {
  const { tenantId } = await requireOwner();
  const name = String(formData.get("name") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const slotMin = Math.max(5, Number(formData.get("slotMin") || 15));
  if (!name) return;
  await prisma.branch.create({
    data: {
      tenantId,
      name,
      address,
      slotMin,
      hoursJson: JSON.stringify({
        lun: ["09:00-18:00"],
        mar: ["09:00-18:00"],
        mie: ["09:00-18:00"],
        jue: ["09:00-18:00"],
        vie: ["09:00-18:00"],
        sab: ["09:00-14:00"],
        dom: [],
      }),
    },
  });
  revalidatePath("/app/sucursales");
}

export async function updateBranchHours(formData: FormData) {
  const { tenantId } = await requireOwner();
  const id = String(formData.get("id") || "");
  const slotMin = Math.max(5, Number(formData.get("slotMin") || 15));
  const keys = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] as const;
  const hours: Record<string, string[]> = {};
  for (const k of keys) {
    const raw = String(formData.get(k) || "").trim();
    hours[k] = raw ? [raw] : [];
  }
  await prisma.branch.updateMany({
    where: { id, tenantId },
    data: { hoursJson: JSON.stringify(hours), slotMin },
  });
  revalidatePath("/app/sucursales");
  revalidatePath("/app/parametros");
  revalidatePath("/app/agenda");
}

export async function updateTenantInterval(formData: FormData) {
  const { tenantId } = await requireOwner();
  const slotMin = Math.max(5, Number(formData.get("slotMin") || 15));
  await prisma.tenant.update({ where: { id: tenantId }, data: { slotMin } });
  await prisma.branch.updateMany({ where: { tenantId }, data: { slotMin } });
  revalidatePath("/app/parametros");
  revalidatePath("/app/agenda");
}

export async function updateService(formData: FormData) {
  const { tenantId } = await requireOwner();
  const id = String(formData.get("id") || "");
  const durationMin = Math.max(5, Number(formData.get("durationMin") || 30));
  const priceCents = Number(formData.get("priceCents") || 0);
  const name = String(formData.get("name") || "").trim();
  await prisma.service.updateMany({
    where: { id, tenantId },
    data: { durationMin, priceCents, ...(name ? { name } : {}) },
  });
  revalidatePath("/app/servicios");
  revalidatePath("/app/parametros");
}

export async function markNotificationRead(formData: FormData) {
  const { tenantId } = await requireOwner();
  const id = String(formData.get("id") || "");
  await prisma.ownerNotification.updateMany({
    where: { id, tenantId },
    data: { read: true },
  });
  revalidatePath("/app");
}

export async function upsertInventory(formData: FormData) {
  const { tenantId } = await requireOwner();
  const name = String(formData.get("name") || "").trim();
  const sku = String(formData.get("sku") || "").trim();
  const qty = Number(formData.get("qty") || 0);
  if (!name || !sku) return;
  await prisma.inventoryItem.upsert({
    where: { tenantId_sku: { tenantId, sku } },
    update: { name, qty },
    create: { tenantId, name, sku, qty },
  });
  revalidatePath("/app/inventario");
}
