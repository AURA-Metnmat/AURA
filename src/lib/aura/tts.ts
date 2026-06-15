import OpenAI from "openai";
import type { Language } from "./i18n";
import {
  LANGUAGE_TTS_PROFILE,
  TTS_MAX_CHARS,
  TTS_MODEL_FALLBACK,
  TTS_MODEL_PRIMARY,
  sanitizeTextForSpeech,
} from "./tts-config";

export async function generateSpeechAudio(
  openai: OpenAI,
  text: string,
  language: Language
): Promise<Buffer> {
  const cleaned = sanitizeTextForSpeech(text).slice(0, TTS_MAX_CHARS);
  if (!cleaned) {
    throw new Error("Empty speech text");
  }

  const profile = LANGUAGE_TTS_PROFILE[language];

  try {
    const speech = await openai.audio.speech.create({
      model: TTS_MODEL_PRIMARY,
      voice: profile.voice,
      input: cleaned,
      instructions: profile.instructions,
      speed: profile.speed,
      response_format: "mp3",
    });
    return Buffer.from(await speech.arrayBuffer());
  } catch (primaryError) {
    console.warn("Primary TTS failed, falling back to tts-1-hd:", primaryError);
    const speech = await openai.audio.speech.create({
      model: TTS_MODEL_FALLBACK,
      voice: profile.voice,
      input: cleaned,
      speed: profile.speed,
      response_format: "mp3",
    });
    return Buffer.from(await speech.arrayBuffer());
  }
}
