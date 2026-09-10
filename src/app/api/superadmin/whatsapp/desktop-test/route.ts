import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { handleInbound } from "@/lib/ai/engine";
import { sendWhatsAppText } from "@/lib/whatsapp";
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

  const phone =
    (await prisma.phoneNumber.findFirst({
      where: { whatsappPhoneNumberId: { not: null } },
    })) ||
    (await prisma.phoneNumber.findFirst({
      where: { e164: "+15556613653" },
    }));

  if (!phone) {
    steps.push({
      n: 1,
      title: "Número del negocio",
      ok: false,
      detail: "No hay un WhatsApp guardado. Pulsa Guardar WhatsApp en el menú WhatsApp.",
    });
    return NextResponse.json({ ok: false, steps });
  }

  steps.push({
    n: 1,
    title: "Número del negocio",
    ok: true,
    detail: `${phone.e164} · ID Meta ${phone.whatsappPhoneNumberId || "falta"}`,
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
    return NextResponse.json({ ok: false, steps, meta: webhookStatus() });
  }

  if (!sendToPhone) {
    steps.push({
      n: 3,
      title: "Envío a WhatsApp",
      ok: true,
      detail: "No pediste enviarlo al celular. La IA en escritorio SÍ funciona.",
    });
    return NextResponse.json({ ok: true, steps, meta: webhookStatus() });
  }

  if (!from || from.length < 8) {
    steps.push({
      n: 3,
      title: "Envío a WhatsApp",
      ok: false,
      detail: "Escribe tu número (con código de país, ej. 5939…).",
    });
    return NextResponse.json({ ok: false, steps, meta: webhookStatus() });
  }

  if (!phone.whatsappPhoneNumberId) {
    steps.push({
      n: 3,
      title: "Envío a WhatsApp",
      ok: false,
      detail: "Falta el Phone number ID. Guárdalo en el paso 3 de WhatsApp.",
    });
    return NextResponse.json({ ok: false, steps, meta: webhookStatus() });
  }

  if (!process.env.WHATSAPP_ACCESS_TOKEN) {
    steps.push({
      n: 3,
      title: "Envío a WhatsApp",
      ok: false,
      detail: "Falta WHATSAPP_ACCESS_TOKEN en Render.",
    });
    return NextResponse.json({ ok: false, steps, meta: webhookStatus() });
  }

  const lastReply = steps.find((s) => s.n === 2)?.detail || "Hola, soy Sofía.";
  const sent = await sendWhatsAppText(phone.whatsappPhoneNumberId, from, lastReply);
  steps.push({
    n: 3,
    title: "Envío a WhatsApp (Meta)",
    ok: sent.ok,
    detail: sent.ok
      ? `Meta aceptó el envío a +${from}. Mira WhatsApp en el celular.`
      : sent.error,
  });

  steps.push({
    n: 4,
    title: "¿Meta avisa cuando TÚ escribes?",
    ok: Boolean(whatsappTrace.lastText),
    detail: webhookStatus().ultimo,
  });

  return NextResponse.json({ ok: sent.ok, steps, meta: webhookStatus() });
}

function webhookStatus() {
  return {
    token: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
    llegoMensaje: Boolean(whatsappTrace.lastText),
    ultimo: whatsappTrace.lastHint,
  };
}
