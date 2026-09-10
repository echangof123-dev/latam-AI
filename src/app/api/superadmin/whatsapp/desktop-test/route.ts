import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { handleInbound } from "@/lib/ai/engine";
import { sendTwilioWhatsApp, twilioFromNumber, twilioReady } from "@/lib/twilio";
import { whatsappTrace } from "@/lib/whatsapp-trace";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json({ ok: false, error: "login" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    text?: string;
    from?: string;
    sendToPhone?: boolean;
  } | null;

  const text = String(body?.text || "Hola").trim();
  const from = String(body?.from || "").replace(/\D/g, "");
  const sendToPhone = Boolean(body?.sendToPhone);
  const steps: { n: number; title: string; ok: boolean; detail: string }[] = [];
  const sandbox = twilioFromNumber();

  const phone =
    (await prisma.phoneNumber.findUnique({ where: { e164: sandbox } })) ||
    (await prisma.phoneNumber.findFirst({ where: { whatsappPhoneNumberId: "twilio" } })) ||
    (await prisma.phoneNumber.findFirst({ where: { tenant: { slug: "barberia-norte" } } }));

  if (!phone) {
    steps.push({
      n: 1,
      title: "Número del negocio",
      ok: false,
      detail: "Guarda el número de Twilio en el menú WhatsApp.",
    });
    return NextResponse.json({ ok: false, steps });
  }

  steps.push({
    n: 1,
    title: "Número del negocio",
    ok: true,
    detail: `${phone.e164} · Twilio sandbox ${sandbox}`,
  });

  try {
    const result = await handleInbound({
      to: phone.e164,
      from: from ? `+${from}` : "+593000000000",
      text,
      channel: "WEB",
    });
    steps.push({
      n: 2,
      title: "Sofía entendió el mensaje",
      ok: true,
      detail: result.reply,
    });
  } catch (err) {
    steps.push({
      n: 2,
      title: "Sofía entendió el mensaje",
      ok: false,
      detail: err instanceof Error ? err.message : "Error interno",
    });
    return NextResponse.json({ ok: false, steps });
  }

  if (!sendToPhone) {
    steps.push({
      n: 3,
      title: "Envío a WhatsApp",
      ok: true,
      detail: "No pediste enviarlo al celular. La IA en escritorio SÍ funciona.",
    });
    return NextResponse.json({ ok: true, steps });
  }

  if (!from || from.length < 8) {
    steps.push({
      n: 3,
      title: "Envío a WhatsApp (Twilio)",
      ok: false,
      detail: "Escribe tu número (con código de país, ej. 5939…).",
    });
    return NextResponse.json({ ok: false, steps });
  }

  if (!twilioReady()) {
    steps.push({
      n: 3,
      title: "Envío a WhatsApp (Twilio)",
      ok: false,
      detail: "Faltan TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN en Render.",
    });
    return NextResponse.json({ ok: false, steps });
  }

  const lastReply = steps.find((s) => s.n === 2)?.detail || "Hola, soy Sofía.";
  const sent = await sendTwilioWhatsApp(from, lastReply);
  steps.push({
    n: 3,
    title: "Envío a WhatsApp (Twilio)",
    ok: sent.ok,
    detail: sent.ok
      ? `Twilio aceptó el envío a +${from}. Mira el chat del sandbox.`
      : sent.error,
  });

  steps.push({
    n: 4,
    title: "¿Twilio avisa cuando TÚ escribes?",
    ok: Boolean(whatsappTrace.lastText),
    detail: whatsappTrace.lastHint,
  });

  return NextResponse.json({ ok: sent.ok, steps });
}
