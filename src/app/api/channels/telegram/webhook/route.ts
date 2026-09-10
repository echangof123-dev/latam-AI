import { NextResponse } from "next/server";
import { handleTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const json = (await req.json().catch(() => null)) as {
    message?: { chat?: { id?: number }; text?: string };
  } | null;
  const chatId = json?.message?.chat?.id;
  const text = json?.message?.text;
  if (!chatId || !text) {
    return NextResponse.json({ ok: true });
  }
  try {
    await handleTelegramMessage(String(chatId), text);
  } catch (err) {
    console.error("Telegram", err);
  }
  return NextResponse.json({ ok: true });
}
