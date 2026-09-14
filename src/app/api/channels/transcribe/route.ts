import { NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/ai/openai-agent";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 200 || file.size > 8_000_000) {
      return NextResponse.json({ text: "" });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const name = file.name || "audio.webm";
    const mime = file.type || "audio/webm";
    const text = await transcribeAudio(buf, name, mime);
    return NextResponse.json({ text: text || "" });
  } catch (err) {
    console.error("transcribe", err);
    return NextResponse.json({ text: "" });
  }
}
