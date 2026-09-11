import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOwnerApi } from "@/lib/guards";
import { generateOwnerReply } from "@/lib/ai/owner-agent";
import { agentsFor } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const OWNER_PREFIX = "owner:";

async function ownerThread(tenantId: string, userId: string) {
  const phone = `${OWNER_PREFIX}${userId}`;
  const existing = await prisma.conversation.findFirst({
    where: { tenantId, customerPhone: phone, channel: "WEB" },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;
  return prisma.conversation.create({
    data: { tenantId, customerPhone: phone, channel: "WEB" },
  });
}

export async function GET() {
  const session = await requireOwnerApi();
  if (!session) return NextResponse.json({ error: "auth" }, { status: 401 });
  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
  const agents = agentsFor(tenant?.vertical, tenant?.name);
  const convo = await prisma.conversation.findFirst({
    where: { tenantId: session.tenantId, customerPhone: `${OWNER_PREFIX}${session.userId}`, channel: "WEB" },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 40 } },
  });
  return NextResponse.json({
    tenantName: tenant?.name || "tu negocio",
    ownerName: session.name,
    agentName: agents.owner.name,
    clientName: agents.client.name,
    voice: agents.owner.voice,
    messages: (convo?.messages || [])
      .slice()
      .reverse()
      .map((m) => ({
        role: m.role === "assistant" ? "ai" : "user",
        text: m.body,
      })),
  });
}

const Body = z.object({ text: z.string().min(1).max(2000) });

export async function POST(req: Request) {
  const session = await requireOwnerApi();
  if (!session) return NextResponse.json({ reply: "Inicia sesión como dueño para usar el asistente." }, { status: 401 });

  try {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ reply: "Escribe una pregunta sobre tu negocio." });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
    const agents = agentsFor(tenant?.vertical, tenant?.name);
    const convo = await ownerThread(session.tenantId, session.userId);
    await prisma.message.create({
      data: { conversationId: convo.id, role: "owner", body: parsed.data.text },
    });
    const history = await prisma.message.findMany({
      where: { conversationId: convo.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const chronological = history.reverse();
    const prior = chronological.slice(0, -1);

    const reply = await generateOwnerReply({
      tenantId: session.tenantId,
      tenantName: tenant?.name || "el negocio",
      ownerName: session.name,
      agentName: agents.owner.name,
      clientName: agents.client.name,
      history: prior,
      question: parsed.data.text,
    });

    await prisma.message.create({
      data: { conversationId: convo.id, role: "assistant", body: reply },
    });
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("owner asistente", err);
    return NextResponse.json({
      reply: "No pude consultar el CRM en este momento. Intenta otra vez.",
    });
  }
}
