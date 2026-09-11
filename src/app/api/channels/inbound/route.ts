import { z } from "zod";
import { handleInbound } from "@/lib/ai/engine";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Body = z.object({
  to: z.string().min(5),
  from: z.string().min(5),
  text: z.string().min(1),
  channel: z.enum(["WHATSAPP", "SMS", "VOICE_CALL", "WEB"]).optional(),
  wantAudio: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ reply: "No entendí el mensaje. Escríbeme otra vez, por favor." });
    }
    const result = await handleInbound(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    console.error("inbound", err);
    return NextResponse.json({
      reply: "La recepción tuvo un tropiezo al responder. Escríbeme de nuevo, por favor.",
      audio: null,
    });
  }
}
