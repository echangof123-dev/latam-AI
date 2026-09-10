import { handleInbound } from "./ai/engine";
import { prisma } from "./db";
import { whatsappTrace } from "./whatsapp-trace";

export function gupshupReady() {
  return Boolean(process.env.GUPSHUP_API_KEY && process.env.GUPSHUP_APP_NAME);
}

export function gupshupSource() {
  const raw = process.env.GUPSHUP_SOURCE || "917834811114";
  return raw.replace(/\D/g, "") || "917834811114";
}

export async function sendGupshupWhatsApp(to: string, text: string) {
  const key = process.env.GUPSHUP_API_KEY;
  const app = process.env.GUPSHUP_APP_NAME;
  if (!key || !app) {
    const err = "Faltan GUPSHUP_API_KEY o GUPSHUP_APP_NAME en Render.";
    whatsappTrace.lastSendOk = false;
    whatsappTrace.lastSendError = err;
    return { ok: false, error: err };
  }
  const dest = to.replace(/\D/g, "");
  const body = new URLSearchParams({
    channel: "whatsapp",
    source: gupshupSource(),
    "src.name": app,
    destination: dest,
    message: JSON.stringify({ type: "text", text: text.slice(0, 4000) }),
  });
  const res = await fetch("https://api.gupshup.io/wa/api/v1/msg", {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const raw = await res.text();
  if (!res.ok) {
    const err = explain(raw);
    whatsappTrace.lastSendOk = false;
    whatsappTrace.lastSendError = err;
    return { ok: false, error: err };
  }
  whatsappTrace.lastSendOk = true;
  whatsappTrace.lastSendError = "";
  return { ok: true, error: "" };
}

function explain(raw: string) {
  const t = raw.toLowerCase();
  if (t.includes("1001") || t.includes("proxy") || t.includes("not opted")) {
    return "Ese celular no se unió al sandbox. En WhatsApp escribe: proxy NOMBRE_DE_TU_APP al +91 78348 11114.";
  }
  if (t.includes("apikey") || t.includes("401") || t.includes("403")) {
    return "La API key de Gupshup no es válida.";
  }
  return raw.slice(0, 280);
}

async function businessPhone() {
  const src = `+${gupshupSource()}`;
  return (
    (await prisma.phoneNumber.findUnique({ where: { e164: src } })) ||
    (await prisma.phoneNumber.findFirst({ where: { whatsappPhoneNumberId: "gupshup" } })) ||
    (await prisma.phoneNumber.findFirst({ where: { tenant: { slug: "barberia-norte" } } }))
  );
}

export async function handleGupshupInbound(from: string, text: string) {
  whatsappTrace.lastWebhookAt = new Date().toISOString();
  whatsappTrace.lastFrom = from;
  whatsappTrace.lastText = text;
  whatsappTrace.lastHint = "Gupshup entregó el mensaje. Voy a contestar.";
  const phone = await businessPhone();
  const to = phone?.e164 || `+${gupshupSource()}`;
  const result = await handleInbound({
    to,
    from: from.startsWith("+") ? from : `+${from.replace(/\D/g, "")}`,
    text: text || "Hola",
    channel: "WHATSAPP",
  });
  whatsappTrace.lastReply = result.reply;
  const sent = await sendGupshupWhatsApp(from, result.reply);
  whatsappTrace.lastHint = sent.ok ? "Ya contesté por WhatsApp (Gupshup)." : sent.error;
  return result.reply;
}
