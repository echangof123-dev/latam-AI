import { NextResponse } from "next/server";
import { getVoiceMp3 } from "@/lib/voice-store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const buf = getVoiceMp3(id.replace(/[^a-z0-9]/gi, ""));
  if (!buf) return new NextResponse("Gone", { status: 404 });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=120",
    },
  });
}
