import { NextResponse } from "next/server";
import { whatsappTrace } from "@/lib/whatsapp-trace";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "ejeuno",
    whatsapp: {
      token: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
      llegoMensaje: Boolean(whatsappTrace.lastText),
      ultimo: whatsappTrace.lastHint,
      texto: whatsappTrace.lastText || null,
      respondio: whatsappTrace.lastSendOk,
    },
  });
}
