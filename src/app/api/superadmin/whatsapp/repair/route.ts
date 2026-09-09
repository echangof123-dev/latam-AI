import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const GRAPH = "https://graph.facebook.com/v25.0";
const WABA = process.env.WHATSAPP_WABA_ID || "2112383919376178";
const PHONE = process.env.WHATSAPP_PHONE_NUMBER_ID || "1344096055445731";

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json({ ok: false, error: "login" }, { status: 401 });
  }
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({
      ok: false,
      error: "Falta WHATSAPP_ACCESS_TOKEN en Render.",
    });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const phone = await fetch(`${GRAPH}/${PHONE}`, { headers });
  const phoneJson = await phone.json().catch(() => ({}));
  if (!phone.ok) {
    return NextResponse.json({
      ok: false,
      error:
        "El token no sirve para este número. En Meta genera uno nuevo (Generar identificador) y pégalo otra vez en Render.",
      detalle: JSON.stringify(phoneJson).slice(0, 300),
    });
  }

  const sub = await fetch(`${GRAPH}/${WABA}/subscribed_apps`, {
    method: "POST",
    headers,
  });
  const subJson = await sub.json().catch(() => ({}));
  if (!sub.ok) {
    return NextResponse.json({
      ok: false,
      error:
        "No pude suscribir la cuenta de WhatsApp. En Meta abre Configurar Webhooks y marca messages.",
      detalle: JSON.stringify(subJson).slice(0, 300),
    });
  }

  return NextResponse.json({
    ok: true,
    mensaje:
      "Listo. Vuelve a WhatsApp y escribe Hola al +1 (555) 661-3653. Luego recarga esta página.",
  });
}
