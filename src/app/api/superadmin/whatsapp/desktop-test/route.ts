import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { handleInbound } from "@/lib/ai/engine";
import { sendGupshupWhatsApp, gupshupReady, gupshupSource } from "@/lib/gupshup";
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
  const sandbox = `+${gupshupSource()}`;

  const phone =
    (await prisma.phoneNumber.findUnique({ where: { e164: sandbox } })) ||
    (await prisma.phoneNumber.findFirst({ where: { whatsappPhoneNumberId: "gupshup" } })) ||
    (await prisma.phoneNumber.findFirst({ where: { tenant: { slug: "barberia-norte" } } }));

  if (!phone) {
    steps.push({
      n: 1,
      title: "Número del negocio",
      ok: false,
      detail: "Guarda el número de Gupshup en el menú WhatsApp.",
    });
    return NextResponse.json({ ok: false, steps });
  }

  steps.push({
    n: 1,
    title: "Número del negocio",
    ok: true,
    detail: `${phone.e164} · Gupshup ${sandbox}`,
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
      title: "Envío a WhatsApp (Gupshup)",
      ok: false,
      detail: "Escribe tu número (con código de país, ej. 5939…).",
    });
    return NextResponse.json({ ok: false, steps });
  }

  if (!gupshupReady()) {
    steps.push({
      n: 3,
      title: "Envío a WhatsApp (Gupshup)",
      ok: false,
      detail: "Faltan GUPSHUP_API_KEY y GUPSHUP_APP_NAME en Render.",
    });
    return NextResponse.json({ ok: false, steps });
  }

  const lastReply = steps.find((s) => s.n === 2)?.detail || "Hola, soy Sofía.";
  const sent = await sendGupshupWhatsApp(from, lastReply);
  steps.push({
    n: 3,
    title: "Envío a WhatsApp (Gupshup)",
    ok: sent.ok,
    detail: sent.ok
      ? `Gupshup aceptó el envío a +${from}. Mira el chat con +91 78348 11114.`
      : sent.error,
  });

  steps.push({
    n: 4,
    title: "¿Gupshup avisa cuando TÚ escribes?",
    ok: Boolean(whatsappTrace.lastText),
    detail: whatsappTrace.lastHint,
  });

  return NextResponse.json({ ok: sent.ok, steps });
}
