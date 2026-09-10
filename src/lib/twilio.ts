import { createHmac, timingSafeEqual } from "crypto";
import { handleInbound } from "./ai/engine";
import { whatsappTrace } from "./whatsapp-trace";
import { publicOrigin } from "./http";
import { prisma } from "./db";

export function twilioFromNumber() {
  const raw = process.env.TWILIO_WHATSAPP_FROM || "+14155238886";
  const digits = raw.replace(/\D/g, "");
  return digits ? `+${digits}` : "+14155238886";
}

export function stripWhatsapp(addr: string) {
  const digits = String(addr || "").replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

export function twilioReady() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

function explainTwilio(raw: string) {
  const t = raw.toLowerCase();
  if (t.includes("63007") || t.includes("not a valid")) {
    return "Ese celular no se unió al sandbox. En WhatsApp debe enviar el código join al número de Twilio.";
  }
  if (t.includes("20003") || t.includes("authenticate")) {
    return "Account SID o Auth Token de Twilio están mal en Render.";
  }
  return raw.slice(0, 280);
}

export function validTwilioSignature(req: Request, params: Record<string, string>) {
  if (process.env.TWILIO_VALIDATE_SIGNATURE !== "true") return true;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const header = req.headers.get("x-twilio-signature") || "";
  if (!token || !header) return false;
  const path = new URL(req.url).pathname;
  const urls = [`${publicOrigin(req)}${path}`, `https://ejeuno.onrender.com${path}`];
  return urls.some((url) => {
    const sorted = Object.keys(params)
      .sort()
      .reduce((acc, k) => acc + k + params[k], url);
    const expected = createHmac("sha1", token).update(sorted).digest("base64");
    const a = Buffer.from(header);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

export async function sendTwilioWhatsApp(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = twilioFromNumber();
  if (!sid || !token) {
    const err = "Faltan TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN en Render.";
    whatsappTrace.lastSendOk = false;
    whatsappTrace.lastSendError = err;
    return { ok: false, error: err };
  }
  const dest = stripWhatsapp(to);
  const payload = new URLSearchParams({
    From: `whatsapp:${from}`,
    To: `whatsapp:${dest}`,
    Body: body.slice(0, 1600),
  });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload,
  });
  const raw = await res.text();
  if (!res.ok) {
    const err = explainTwilio(raw);
    whatsappTrace.lastSendOk = false;
    whatsappTrace.lastSendError = err;
    return { ok: false, error: err };
  }
  whatsappTrace.lastSendOk = true;
  whatsappTrace.lastSendError = "";
  return { ok: true, error: "" };
}

export async function handleTwilioInbound(opts: { from: string; to: string; text: string }) {
  whatsappTrace.lastWebhookAt = new Date().toISOString();
  whatsappTrace.lastFrom = opts.from;
  whatsappTrace.lastText = opts.text;
  whatsappTrace.lastHint = "Twilio entregó el mensaje. Voy a contestar.";

  let to = stripWhatsapp(opts.to) || twilioFromNumber();
  const exists = await prisma.phoneNumber.findUnique({ where: { e164: to } });
  if (!exists) {
    const fallback = await prisma.phoneNumber.findFirst({
      where: { tenant: { slug: "barberia-norte" } },
    });
    if (fallback) to = fallback.e164;
  }

  const result = await handleInbound({
    to,
    from: stripWhatsapp(opts.from),
    text: opts.text || "Hola",
    channel: "WHATSAPP",
  });
  whatsappTrace.lastReply = result.reply;
  whatsappTrace.lastHint = "Ya contesté por WhatsApp (Twilio).";
  return result.reply;
}
