import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { setTelegramWebhook, telegramReady } from "@/lib/telegram";
import { publicOrigin } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json({ ok: false, error: "Entra otra vez." }, { status: 401 });
  }
  if (!telegramReady()) {
    return NextResponse.json({
      ok: false,
      error: "Falta TELEGRAM_BOT_TOKEN en Render. Pégalo, guarda y espera el deploy.",
    });
  }
  const url = `${publicOrigin(req)}/api/channels/telegram/webhook`;
  const result = await setTelegramWebhook(url);
  return NextResponse.json({
    ok: result.ok,
    error: result.error,
    mensaje: result.ok ? `Bot activo. Webhook: ${url}` : result.error,
  });
}
