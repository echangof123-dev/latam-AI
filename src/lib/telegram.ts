import { handleInbound } from "./ai/engine";
import { prisma } from "./db";
import { whatsappTrace } from "./whatsapp-trace";

export function telegramReady() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

function api(path: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  return `https://api.telegram.org/bot${token}${path}`;
}

export async function sendTelegram(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "Falta TELEGRAM_BOT_TOKEN en Render." };
  const res = await fetch(api("/sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 3900) }),
  });
  const data = (await res.json()) as { ok?: boolean; description?: string };
  if (!data.ok) {
    const err = data.description || "Telegram rechazó el envío.";
    whatsappTrace.lastSendOk = false;
    whatsappTrace.lastSendError = err;
    return { ok: false, error: err };
  }
  whatsappTrace.lastSendOk = true;
  whatsappTrace.lastSendError = "";
  return { ok: true, error: "" };
}

export async function setTelegramWebhook(url: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "Falta TELEGRAM_BOT_TOKEN en Render." };
  const res = await fetch(api("/setWebhook"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, allowed_updates: ["message"] }),
  });
  const data = (await res.json()) as { ok?: boolean; description?: string };
  if (!data.ok) return { ok: false, error: data.description || "No se pudo activar el webhook." };
  return { ok: true, error: "" };
}

async function businessPhone() {
  const row =
    (await prisma.phoneNumber.findFirst({ where: { tenant: { slug: "barberia-norte" } } })) ||
    (await prisma.phoneNumber.findFirst());
  return row?.e164 || "+14155238886";
}

export async function handleTelegramMessage(chatId: string, text: string) {
  whatsappTrace.lastWebhookAt = new Date().toISOString();
  whatsappTrace.lastFrom = chatId;
  whatsappTrace.lastText = text;
  whatsappTrace.lastHint = "Telegram entregó el mensaje. Voy a contestar.";
  const to = await businessPhone();
  const from = `+${String(chatId).replace(/\D/g, "").padStart(8, "9")}`;
  const result = await handleInbound({
    to,
    from,
    text: text || "Hola",
    channel: "WEB",
  });
  whatsappTrace.lastReply = result.reply;
  const sent = await sendTelegram(chatId, result.reply);
  whatsappTrace.lastHint = sent.ok ? "Ya contesté por Telegram." : sent.error;
  return result.reply;
}
