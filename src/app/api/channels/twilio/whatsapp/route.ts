import { NextResponse } from "next/server";
import { handleTwilioInbound, validTwilioSignature } from "@/lib/twilio";
import { whatsappTrace } from "@/lib/whatsapp-trace";

export const dynamic = "force-dynamic";

function twiml(text: string) {
  const safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`;
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const params: Record<string, string> = {};
  if (form) {
    form.forEach((v, k) => {
      params[k] = String(v);
    });
  }

  if (!validTwilioSignature(req, params)) {
    return NextResponse.json({ error: "Firma Twilio inválida" }, { status: 403 });
  }

  const from = params.From || "";
  const to = params.To || "";
  const text = (params.Body || "").trim() || "Hola";

  whatsappTrace.lastWebhookAt = new Date().toISOString();
  let reply = "Hola, soy Sofía. ¿En qué te ayudo?";
  try {
    reply = await handleTwilioInbound({ from, to, text });
  } catch (err) {
    console.error("Twilio inbound", err);
    whatsappTrace.lastHint = "Twilio avisó, pero hubo un error al responder.";
  }

  return new NextResponse(twiml(reply), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
