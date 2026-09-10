import { NextResponse } from "next/server";
import { whatsappTrace } from "@/lib/whatsapp-trace";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "ejeuno",
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      whatsapp: {
      proveedor: "gupshup",
      token: Boolean(process.env.GUPSHUP_API_KEY && process.env.GUPSHUP_APP_NAME),
      llegoMensaje: Boolean(whatsappTrace.lastText),
      ultimo: whatsappTrace.lastHint,
      texto: whatsappTrace.lastText || null,
      respondio: whatsappTrace.lastSendOk,
    },
  });
}
