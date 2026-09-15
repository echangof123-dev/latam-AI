import { prisma } from "./db";
import type { Prisma } from "@prisma/client";
import { toE164 } from "./phone";

const tenantInclude = {
  phones: true,
  modules: true,
  branches: true,
  services: { where: { active: true } },
  staff: { where: { active: true } },
  policies: true,
} satisfies Prisma.TenantInclude;

export async function resolveTenantByNumber(e164: string) {
  const canon = toE164(e164);
  const digits = canon.replace(/\D/g, "") || String(e164 || "").replace(/\D/g, "");
  if (!digits) return null;
  const variants = [canon, `+${digits}`, digits, String(e164 || "")];
  for (const v of variants) {
    if (!v) continue;
    const phone = await prisma.phoneNumber.findUnique({
      where: { e164: v },
      include: { tenant: { include: tenantInclude } },
    });
    if (phone?.tenant.active) return phone;
  }
  const phones = await prisma.phoneNumber.findMany({
    include: { tenant: { include: tenantInclude } },
  });
  return phones.find((p) => p.e164.replace(/\D/g, "") === digits && p.tenant.active) || null;
}

export function moduleOn(
  modules: { key: string; enabled: boolean }[],
  key: string,
) {
  return modules.some((m) => m.key === key && m.enabled);
}
