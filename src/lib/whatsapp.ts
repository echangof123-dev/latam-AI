import { prisma } from "./db";
import { handleInbound } from "./ai/engine";

const GRAPH = "https://graph.facebook.com/v21.0";

export function toE164(raw: string) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("+") ? `+${digits}` : `+${digits}`;
}

export async function findPhoneRecord(opts: { display?: string; phoneNumberId?: string }) {
  if (opts.phoneNumberId) {
    const byId = await prisma.phoneNumber.findFirst({
      where: { whatsappPhoneNumberId: opts.phoneNumberId },
    });
    if (byId) return byId;
  }
  const e164 = toE164(opts.display || "");
  if (!e164) return null;
  return prisma.phoneNumber.findUnique({ where: { e164 } });
}

export async function sendWhatsAppText(phoneNumberId: string, to: string, body: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token || !phoneNumberId) {
    console.error("WhatsApp: falta WHATSAPP_ACCESS_TOKEN o phone_number_id");
    return;
  }
  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "text",
      text: { preview_url: false, body: body.slice(0, 4000) },
    }),
  });
  if (!res.ok) {
    console.error("WhatsApp send error", res.status, await res.text());
  }
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
  if (body.object !== "whatsapp_business_account") return;

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      const messages = value?.messages;
      if (!messages?.length) continue;
      const phoneNumberId = value?.metadata?.phone_number_id || "";
      const display = value?.metadata?.display_phone_number || "";
      const record = await findPhoneRecord({ display, phoneNumberId });
      const to = record?.e164 || toE164(display);
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
        const result = await handleInbound({
          to,
          from: toE164(msg.from),
          text,
          channel: msg.type === "audio" || msg.type === "voice" ? "VOICE_CALL" : "WHATSAPP",
        });
        if (replyId) await sendWhatsAppText(replyId, msg.from, result.reply);
      }
    }
  }
}
