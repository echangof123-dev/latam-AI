import { prisma } from "./db";
import { handleInbound } from "./ai/engine";
import { whatsappTrace } from "./whatsapp-trace";

const GRAPH = "https://graph.facebook.com/v25.0";

export function toE164(raw: string) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  return `+${digits}`;
}

export async function findPhoneRecord(opts: { display?: string; phoneNumberId?: string }) {
  if (opts.phoneNumberId) {
    const byId = await prisma.phoneNumber.findFirst({
      where: { whatsappPhoneNumberId: opts.phoneNumberId },
    });
    if (byId) return byId;
  }
  const e164 = toE164(opts.display || "");
  if (e164) {
    const exact = await prisma.phoneNumber.findUnique({ where: { e164 } });
    if (exact) return exact;
    const digits = e164.replace(/\D/g, "");
    const all = await prisma.phoneNumber.findMany();
    const hit = all.find((p) => p.e164.replace(/\D/g, "") === digits);
    if (hit) return hit;
  }
  return prisma.phoneNumber.findFirst({
    where: { whatsappPhoneNumberId: { not: null } },
  });
}

export async function sendWhatsAppText(
  phoneNumberId: string,
  to: string,
  body: string,
  contextId?: string,
) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token || !phoneNumberId) {
    const err = "Falta WHATSAPP_ACCESS_TOKEN o el ID del número";
    whatsappTrace.lastSendOk = false;
    whatsappTrace.lastSendError = err;
    console.error("WhatsApp:", err);
    return false;
  }
  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to.replace(/\D/g, ""),
    type: "text",
    text: { preview_url: false, body: body.slice(0, 4000) },
  };
  if (contextId) payload.context = { message_id: contextId };

  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
  if (!res.ok) {
    whatsappTrace.lastSendOk = false;
    whatsappTrace.lastSendError = `${res.status} ${raw.slice(0, 400)}`;
    console.error("WhatsApp send error", res.status, raw);
    return false;
  }
  whatsappTrace.lastSendOk = true;
  whatsappTrace.lastSendError = "";
  return true;
}

async function transcribeAudio(mediaId: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const openai = process.env.OPENAI_API_KEY;
  if (!token || !openai) {
    return "Recibí un audio. Por ahora escríbeme en texto: hola, precios o quiero una cita.";
  }
  const meta = await fetch(`${GRAPH}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const info = (await meta.json()) as { url?: string };
  if (!info.url) return "No pude leer el audio. Escríbeme el mensaje.";
  const bin = await fetch(info.url, { headers: { Authorization: `Bearer ${token}` } });
  const buf = Buffer.from(await bin.arrayBuffer());
  const form = new FormData();
  form.append("file", new File([buf], "audio.ogg", { type: "audio/ogg" }));
  form.append("model", "whisper-1");
  form.append("language", "es");
  const whisper = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openai}` },
    body: form,
  });
  const data = (await whisper.json()) as { text?: string };
  return data.text?.trim() || "No entendí el audio. ¿Me lo escribes?";
}

export async function handleWhatsAppWebhook(payload: unknown) {
  const body = payload as {
    object?: string;
    entry?: Array<{
      changes?: Array<{
        value?: {
          metadata?: { display_phone_number?: string; phone_number_id?: string };
          messages?: Array<{
            id?: string;
            from: string;
            type: string;
            text?: { body?: string };
            audio?: { id?: string };
            voice?: { id?: string };
          }>;
        };
      }>;
    }>;
  };

  whatsappTrace.lastWebhookAt = new Date().toISOString();
  whatsappTrace.lastHint = "Llegó un aviso de Meta, pero aún no hay un mensaje de texto.";

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      const messages = value?.messages;
      if (!messages?.length) continue;
      const phoneNumberId = value?.metadata?.phone_number_id || "";
      const display = value?.metadata?.display_phone_number || "";
      const record = await findPhoneRecord({ display, phoneNumberId });
      const to = record?.e164 || toE164(display) || "+15556613653";
      const replyId = record?.whatsappPhoneNumberId || phoneNumberId;

      for (const msg of messages) {
        let text = "";
        if (msg.type === "text") text = msg.text?.body || "";
        else if (msg.type === "audio" || msg.type === "voice") {
          const id = msg.audio?.id || msg.voice?.id;
          text = id ? await transcribeAudio(id) : "";
        } else {
          text = "Hola";
        }
        if (!text) continue;

        whatsappTrace.lastFrom = msg.from;
        whatsappTrace.lastText = text;
        whatsappTrace.lastHint = "Recibí tu mensaje. Voy a contestar.";

        let reply =
          "Hola, soy Sofía, la recepción. ¿En qué te ayudo? Puedo dar precios y agendar.";
        try {
          const result = await handleInbound({
            to,
            from: toE164(msg.from),
            text,
            channel: msg.type === "audio" || msg.type === "voice" ? "VOICE_CALL" : "WHATSAPP",
          });
          reply = result.reply || reply;
        } catch (err) {
          console.error("WhatsApp inbound", err);
        }
        whatsappTrace.lastReply = reply;
        if (replyId) {
          const ok = await sendWhatsAppText(replyId, msg.from, reply, msg.id);
          whatsappTrace.lastHint = ok
            ? "Ya contesté por WhatsApp."
            : "Recibí el mensaje pero Meta no dejó enviar la respuesta. Revisa el token.";
        } else {
          whatsappTrace.lastSendOk = false;
          whatsappTrace.lastSendError = "No hay Phone number ID para responder.";
          whatsappTrace.lastHint = "Falta guardar el código de Meta (paso 3).";
        }
      }
    }
  }
}
