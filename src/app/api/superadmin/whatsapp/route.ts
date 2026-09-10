import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { redirectTo } from "@/lib/http";

export const dynamic = "force-dynamic";

function digitsPhone(raw: string) {
  const d = String(raw || "").replace(/\D/g, "");
  return d ? `+${d}` : "";
}

export async function POST(req: Request) {
  const session = await getSession();
  const wantsJson = (req.headers.get("accept") || "").includes("application/json");

  function fail(code: string) {
    if (wantsJson) return NextResponse.json({ ok: false, error: code }, { status: 400 });
    return redirectTo(req, `/superadmin/whatsapp?e=${code}`);
  }

  if (!session || session.role !== "SUPERADMIN") {
    if (wantsJson) return NextResponse.json({ ok: false, error: "login" }, { status: 401 });
    return redirectTo(req, "/login");
  }

  const form = await req.formData().catch(() => null);
  const tenantId = String(form?.get("tenantId") || "").trim();
  const e164 = digitsPhone(String(form?.get("e164") || "+917834811114"));

  if (!tenantId || !e164) return fail("faltan");

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return fail("negocio");

  try {
    await prisma.phoneNumber.upsert({
      where: { e164 },
      update: { tenantId, label: "WhatsApp Gupshup", whatsappPhoneNumberId: "gupshup" },
      create: { e164, tenantId, label: "WhatsApp Gupshup", whatsappPhoneNumberId: "gupshup" },
    });
  } catch {
    return fail("bd");
  }

  if (wantsJson) return NextResponse.json({ ok: true });
  return redirectTo(req, "/superadmin/whatsapp?ok=1");
}
