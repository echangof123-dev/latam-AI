import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirectTo } from "@/lib/http";

export const dynamic = "force-dynamic";

function digitsPhone(raw: string) {
  const d = String(raw || "").replace(/\D/g, "");
  return d ? `+${d}` : "";
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return redirectTo(req, "/login");
  }

  const form = await req.formData().catch(() => null);
  const tenantId = String(form?.get("tenantId") || "").trim();
  const e164 = digitsPhone(String(form?.get("e164") || "+15556613653"));
  const metaId = String(form?.get("metaId") || "").trim();

  if (!tenantId || !e164 || !metaId) {
    return redirectTo(req, "/superadmin/whatsapp?e=faltan");
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return redirectTo(req, "/superadmin/whatsapp?e=negocio");
  }

  try {
    await prisma.phoneNumber.upsert({
      where: { e164 },
      update: { tenantId, whatsappPhoneNumberId: metaId, label: "WhatsApp Meta" },
      create: { e164, tenantId, whatsappPhoneNumberId: metaId, label: "WhatsApp Meta" },
    });
  } catch {
    return redirectTo(req, "/superadmin/whatsapp?e=bd");
  }

  return redirectTo(req, "/superadmin/whatsapp?ok=1");
}
