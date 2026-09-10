import { NextResponse } from "next/server";
import { whatsappTrace } from "@/lib/whatsapp-trace";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "ejeuno",
    whatsapp: {
      proveedor: "twilio",
      token: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      llegoMensaje: Boolean(whatsappTrace.lastText),
      ultimo: whatsappTrace.lastHint,
      texto: whatsappTrace.lastText || null,
      respondio: whatsappTrace.lastSendOk,
    },
  });
}
