import { NextResponse } from "next/server";
import OpenAI from "openai";
import { env } from "@/lib/env";
import type { Language } from "@/lib/aura/i18n";
import { generateSpeechAudio } from "@/lib/aura/tts";
import { TTS_MAX_CHARS } from "@/lib/aura/tts-config";
import { db } from "@/lib/db";
import { requireEmployeeSession } from "@/lib/auth/employee";
import { assertEmployeeOwnsSession } from "@/lib/employees/session-access";
import { sanitizeUserInput } from "@/lib/ai/safety";
import { checkTtsRateLimit } from "@/lib/ai/ai-rate-limit";

const VALID_LANGUAGES: Language[] = ["en", "hi", "or", "bn"];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: string;
      language?: Language;
      sessionId?: string;
    };
    const sessionId = body.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: "Session required" }, { status: 401 });
    }

    const session = await db.interviewSession.findUnique({
      where: { id: sessionId },
      include: { company: true },
    });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const denied = await assertEmployeeOwnsSession(request, session);
    if (denied) return denied;

    const rl = await checkTtsRateLimit(sessionId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        {
          status: 429,
          headers: rl.retryAfterSeconds
            ? { "Retry-After": String(rl.retryAfterSeconds) }
            : undefined,
        }
      );
    }

    const text = sanitizeUserInput(body.text ?? "");
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
