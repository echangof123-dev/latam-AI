import { NextResponse } from "next/server";
import { handleWhatsAppWebhook } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN || "ejeuno-whatsapp";
  if (mode === "subscribe" && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verificación fallida" }, { status: 403 });
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  try {
    await handleWhatsAppWebhook(json);
  } catch (err) {
    console.error("WhatsApp webhook", err);
  }
  return NextResponse.json({ ok: true });
}
