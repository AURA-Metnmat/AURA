import { NextResponse } from "next/server";
import OpenAI from "openai";
import { env } from "@/lib/env";
import type { Language } from "@/lib/aura/i18n";
import { generateSpeechAudio } from "@/lib/aura/tts";
import { TTS_MAX_CHARS } from "@/lib/aura/tts-config";

const VALID_LANGUAGES: Language[] = ["en", "hi", "or", "bn"];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string; language?: Language };
    const text = body.text?.trim();
    const language = VALID_LANGUAGES.includes(body.language as Language)
      ? (body.language as Language)
      : "en";

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (text.length > TTS_MAX_CHARS) {
      return NextResponse.json({ error: "Text too long for speech" }, { status: 400 });
    }

    const apiKey = env().openaiApiKey;
    const openai = new OpenAI({ apiKey });
    const buffer = await generateSpeechAudio(openai, text, language);

    return new NextResponse(new Uint8Array(buffer), {
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

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
