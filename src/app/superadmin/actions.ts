"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { MODULE_CATALOG, VERTICAL_PRESETS, type ModuleKey } from "@/lib/modules";
import bcrypt from "bcryptjs";
import { requireSuperadmin } from "@/lib/guards";

export async function createTenant(formData: FormData) {
  await requireSuperadmin();
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
  const vertical = String(formData.get("vertical") || "GENERIC");
  const phone = String(formData.get("phone") || "").trim();
  const ownerEmail = String(formData.get("ownerEmail") || "")
    .trim()
    .toLowerCase();
  const ownerName = String(formData.get("ownerName") || "Dueño").trim();
  if (!name || !slug || !phone || !ownerEmail) return;

  const tenant = await prisma.tenant.create({
    data: { name, slug, vertical: vertical as never },
  });

  const keys = VERTICAL_PRESETS[vertical] || VERTICAL_PRESETS.GENERIC;
  await prisma.tenantModule.createMany({
    data: MODULE_CATALOG.map((m) => ({
      tenantId: tenant.id,
      key: m.key,
      enabled: keys.includes(m.key as ModuleKey),
    })),
  });

  await prisma.phoneNumber.create({
    data: {
      e164: phone,
      label: "Línea principal",
      tenantId: tenant.id,
    },
  });

  const hash = bcrypt.hashSync("ejeuno123", 10);
  const user = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { name: ownerName },
    create: {
      email: ownerEmail,
      name: ownerName,
      passwordHash: hash,
      role: "OWNER",
    },
  });
  await prisma.membership.create({
    data: { userId: user.id, tenantId: tenant.id, role: "OWNER" },
  });

  revalidatePath("/superadmin");
}

export async function toggleModule(formData: FormData) {
  await requireSuperadmin();
  const id = String(formData.get("id") || "");
  const enabled = String(formData.get("enabled") || "") === "true";
  await prisma.tenantModule.update({ where: { id }, data: { enabled: !enabled } });
  revalidatePath("/superadmin");
}

export async function addPhone(formData: FormData) {
  await requireSuperadmin();
  const tenantId = String(formData.get("tenantId") || "");
  const e164 = String(formData.get("e164") || "").trim();
  const label = String(formData.get("label") || "Línea extra").trim();
  const whatsappPhoneNumberId = String(formData.get("whatsappPhoneNumberId") || "").trim() || null;
  if (!tenantId || !e164) return;
  await prisma.phoneNumber.create({ data: { tenantId, e164, label, whatsappPhoneNumberId } });
  revalidatePath("/superadmin");
}

export async function saveWhatsappId(formData: FormData) {
  await requireSuperadmin();
  const id = String(formData.get("id") || "");
  const whatsappPhoneNumberId = String(formData.get("whatsappPhoneNumberId") || "").trim() || null;
  if (!id) return;
  await prisma.phoneNumber.update({ where: { id }, data: { whatsappPhoneNumberId } });
  revalidatePath("/superadmin");
}

export async function setTenantActive(formData: FormData) {
  await requireSuperadmin();
  const id = String(formData.get("id") || "");
  const active = String(formData.get("active") || "") === "true";
  await prisma.tenant.update({ where: { id }, data: { active: !active } });
  revalidatePath("/superadmin");
}
