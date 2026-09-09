export type WhatsappTrace = {
  lastWebhookAt: string | null;
  lastFrom: string;
  lastText: string;
  lastReply: string;
  lastSendOk: boolean | null;
  lastSendError: string;
  lastHint: string;
};

export const whatsappTrace: WhatsappTrace = {
  lastWebhookAt: null,
  lastFrom: "",
  lastText: "",
  lastReply: "",
  lastSendOk: null,
  lastSendError: "",
  lastHint: "Aún no llega ningún mensaje de WhatsApp a este servidor.",
};
