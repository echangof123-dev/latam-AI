import { prisma } from "./db";
import type { Prisma } from "@prisma/client";

const tenantInclude = {
  phones: true,
  modules: true,
  branches: true,
  services: { where: { active: true } },
  staff: { where: { active: true } },
  policies: true,
} satisfies Prisma.TenantInclude;

export async function resolveTenantByNumber(e164: string) {
  const phone = await prisma.phoneNumber.findUnique({
    where: { e164 },
    include: { tenant: { include: tenantInclude } },
  });
  if (!phone || !phone.tenant.active) return null;
  return phone;
}

export function moduleOn(
  modules: { key: string; enabled: boolean }[],
  key: string,
) {
  return modules.some((m) => m.key === key && m.enabled);
}
