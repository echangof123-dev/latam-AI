import { notFound, redirect } from "next/navigation";
import { getSession, type Session } from "./auth";
import { prisma } from "./db";
import { moduleOn } from "./tenant";

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireSuperadmin() {
  const session = await requireSession();
  if (session.role !== "SUPERADMIN") redirect("/app");
  return session;
}

export async function requireOwner(): Promise<Session & { tenantId: string }> {
  const session = await requireSession();
  if (session.role === "SUPERADMIN") redirect("/superadmin");
  if (!session.tenantId) redirect("/login");
  return session as Session & { tenantId: string };
}

export async function requireModule(key: string) {
  const session = await requireOwner();
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    include: { modules: true },
  });
  if (!tenant || !moduleOn(tenant.modules, key)) notFound();
  return session;
}
