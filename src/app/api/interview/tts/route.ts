import { NextResponse } from "next/server";
import OpenAI from "openai";
import { env } from "@/lib/env";
import type { Language } from "@/lib/aura/i18n";
import { TTS_VOICE } from "@/lib/aura/bilingual";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string; language?: Language };
    const text = body.text?.trim();
    const language = body.language ?? "en";

    if (!text || text.length > 4096) {
      return NextResponse.json({ error: "Invalid text" }, { status: 400 });
    }

    const apiKey = env().openaiApiKey;
    const openai = new OpenAI({ apiKey });

    const speech = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: TTS_VOICE,
      input: text,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await speech.arrayBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 });
  }
}

// Employees use TTS during interview — no admin gate
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
