import { NextResponse } from "next/server";
import { handleGupshupInbound, parseGupshupBody } from "@/lib/gupshup";
import { whatsappTrace } from "@/lib/whatsapp-trace";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const json = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  whatsappTrace.lastWebhookAt = new Date().toISOString();

  const msg = parseGupshupBody(json);
  if (!msg?.from) {
    whatsappTrace.lastHint = "Gupshup avisó (evento, no un mensaje de cliente).";
    return NextResponse.json({ ok: true });
  }

  try {
    await handleGupshupInbound(msg);
  } catch (err) {
    console.error("Gupshup inbound", err);
    whatsappTrace.lastHint = "Gupshup avisó, pero hubo un error al responder.";
  }
  return NextResponse.json({ ok: true });
}
