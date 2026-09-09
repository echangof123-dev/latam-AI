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
  if (!name) return;
  await prisma.branch.create({
    data: {
      tenantId,
      name,
      address,
      hoursJson: JSON.stringify({ lun: ["09:00-18:00"], sab: ["09:00-14:00"], dom: [] }),
    },
  });
  revalidatePath("/app/sucursales");
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
