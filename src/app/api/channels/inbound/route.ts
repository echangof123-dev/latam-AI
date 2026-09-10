import { z } from "zod";
import { handleInbound } from "@/lib/ai/engine";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const Body = z.object({
  to: z.string().min(5),
  from: z.string().min(5),
  text: z.string().min(1),
  channel: z.enum(["WHATSAPP", "SMS", "VOICE_CALL", "WEB"]).optional(),
  wantAudio: z.boolean().optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const result = await handleInbound(parsed.data);
  return NextResponse.json(result);
}
