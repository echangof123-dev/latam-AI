import { NextResponse } from "next/server";
import { handleGupshupInbound } from "@/lib/gupshup";
import { whatsappTrace } from "@/lib/whatsapp-trace";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const json = (await req.json().catch(() => null)) as {
    type?: string;
    payload?: {
      source?: string;
      type?: string;
      payload?: { text?: string };
      sender?: { phone?: string };
    };
  } | null;

  whatsappTrace.lastWebhookAt = new Date().toISOString();

  if (json?.type !== "message") {
    whatsappTrace.lastHint = "Gupshup avisó (evento, no un texto).";
    return NextResponse.json({ ok: true });
  }

  const from = json.payload?.sender?.phone || json.payload?.source || "";
  const text = json.payload?.payload?.text || "";
  if (!from) return NextResponse.json({ ok: true });

  try {
    await handleGupshupInbound(from, text || "Hola");
  } catch (err) {
    console.error("Gupshup inbound", err);
    whatsappTrace.lastHint = "Gupshup avisó, pero hubo un error al responder.";
  }
  return NextResponse.json({ ok: true });
}
