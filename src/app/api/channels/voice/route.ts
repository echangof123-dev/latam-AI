import { NextResponse } from "next/server";
import { synthesizeVoice } from "@/lib/ai/openai-agent";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const json = (await req.json().catch(() => null)) as { text?: string; voice?: string } | null;
  const text = String(json?.text || "").trim();
  if (text.length < 2) return NextResponse.json({ audio: null });
  const allowed = new Set(["nova", "shimmer", "alloy", "echo", "fable", "onyx", "coral", "sage"]);
  const voice = allowed.has(String(json?.voice || "")) ? String(json?.voice) : undefined;
  const audio = await synthesizeVoice(text.slice(0, 1200), voice);
  return NextResponse.json({ audio });
}
