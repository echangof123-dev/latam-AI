import { handleInbound } from "./ai/engine";
import { transcribeAudio } from "./ai/openai-agent";
import { prisma } from "./db";
import { publicAppUrl, putVoiceMp3 } from "./voice-store";
import { whatsappTrace } from "./whatsapp-trace";

export function gupshupReady() {
  return Boolean(process.env.GUPSHUP_API_KEY && process.env.GUPSHUP_APP_NAME);
}

export function gupshupSource() {
  const raw = process.env.GUPSHUP_SOURCE || "917834811114";
  return raw.replace(/\D/g, "") || "917834811114";
}

export type GupshupInbound = {
  from: string;
  text: string;
  audioUrl?: string;
  mime?: string;
  kind: "text" | "audio" | "call";
};

export async function sendGupshupWhatsApp(to: string, text: string) {
  return postGupshup(to, { type: "text", text: text.slice(0, 4000) });
}

export async function sendGupshupAudio(to: string, mp3: Buffer) {
  const id = putVoiceMp3(mp3);
  const url = `${publicAppUrl()}/api/media/voice/${id}`;
  const first = await postGupshup(to, { type: "audio", url });
  if (first.ok) return first;
  return postGupshup(to, { type: "file", url, filename: "sofia.mp3" });
}

async function postGupshup(to: string, message: Record<string, unknown>) {
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
    message: JSON.stringify(message),
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

async function downloadMedia(url: string) {
  const key = process.env.GUPSHUP_API_KEY || "";
  const res = await fetch(url, { headers: key ? { apikey: key } : undefined, redirect: "follow" });
  if (!res.ok) return null;
  const mime = res.headers.get("content-type") || "audio/ogg";
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) return null;
  return { buf, mime };
}

function extFor(mime: string) {
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mp4") || mime.includes("aac") || mime.includes("m4a")) return "m4a";
  return "ogg";
}

export async function handleGupshupInbound(msg: GupshupInbound) {
  whatsappTrace.lastWebhookAt = new Date().toISOString();
  whatsappTrace.lastFrom = msg.from;

  let text = (msg.text || "").trim();
  const voiceIn = msg.kind === "audio" || Boolean(msg.audioUrl);

  if (msg.kind === "call" && !text) {
    text =
      "Quiero que me atiendas por voz. Dime cómo agendar y responde como si te hablara por audio.";
  }

  if (voiceIn && msg.audioUrl) {
    const media = await downloadMedia(msg.audioUrl);
    if (media) {
      const heard = await transcribeAudio(media.buf, `nota.${extFor(media.mime)}`, media.mime);
      if (heard) text = text ? `${text}\n${heard}` : heard;
    }
    if (!text) {
      text = "Te envié un audio. ¿Me ayudas a agendar?";
    }
  }

  if (!text) text = "Hola";
  whatsappTrace.lastText = text;
  whatsappTrace.lastHint = voiceIn ? "Llegó un audio. Transcribo y contesto." : "Gupshup entregó el mensaje. Voy a contestar.";

  const phone = await businessPhone();
  const to = phone?.e164 || `+${gupshupSource()}`;
  const result = await handleInbound({
    to,
    from: msg.from.startsWith("+") ? msg.from : `+${msg.from.replace(/\D/g, "")}`,
    text,
    channel: "WHATSAPP",
    wantAudio: voiceIn || msg.kind === "call",
  });
  whatsappTrace.lastReply = result.reply;
  const sent = await sendGupshupWhatsApp(msg.from, result.reply);
  if (result.audio) {
    const b64 = result.audio.split(",")[1];
    if (b64) {
      const audioSent = await sendGupshupAudio(msg.from, Buffer.from(b64, "base64"));
      whatsappTrace.lastHint = audioSent.ok
        ? "Contesté en texto y en audio por WhatsApp."
        : `Texto ok. Audio: ${audioSent.error}`;
      return result.reply;
    }
  }
  whatsappTrace.lastHint = sent.ok ? "Ya contesté por WhatsApp (Gupshup)." : sent.error;
  return result.reply;
}

export function parseGupshupBody(json: Record<string, unknown> | null): GupshupInbound | null {
  if (!json) return null;
  const type = String(json.type || "");
  const payload = (json.payload || {}) as Record<string, unknown>;
  const inner = (payload.payload || payload) as Record<string, unknown>;
  const sender = (payload.sender || {}) as Record<string, unknown>;
  const from = String(sender.phone || payload.source || json.source || "");
  if (!from && type !== "message" && type !== "call") return null;

  const msgType = String(payload.type || inner.type || type || "text").toLowerCase();
  const text = String(inner.text || payload.text || inner.caption || payload.caption || "");
  const audioUrl = String(inner.url || payload.url || inner.audio || "");
  const mime = String(inner.contentType || inner.mime || payload.contentType || "");

  if (type === "call" || msgType === "call" || msgType.includes("voip")) {
    return { from: from || String(payload.source || ""), text, kind: "call" };
  }
  if (
    msgType === "audio" ||
    msgType === "voice" ||
    msgType === "ptt" ||
    mime.startsWith("audio/") ||
    (msgType === "file" && /\.(ogg|opus|mp3|m4a|aac|amr)(\?|$)/i.test(audioUrl))
  ) {
    return { from, text, audioUrl: audioUrl || undefined, mime, kind: "audio" };
  }
  if (type !== "message" && type !== "user-event") return null;
  if (!from) return null;
  return { from, text, kind: "text" };
}
