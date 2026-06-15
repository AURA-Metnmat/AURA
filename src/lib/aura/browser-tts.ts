import type { Language } from "./i18n";
import { LANGUAGE_TTS_PROFILE } from "./tts-config";

const VOICE_LOAD_TIMEOUT_MS = 2500;

function normalizeLang(tag: string): string {
  return tag.toLowerCase().replace("_", "-");
}

function scoreVoice(voiceLang: string, targetLang: string): number {
  const voice = normalizeLang(voiceLang);
  const target = normalizeLang(targetLang);
  if (voice === target) return 100;
  if (voice.startsWith(target)) return 80;
  const voiceBase = voice.split("-")[0];
  const targetBase = target.split("-")[0];
  if (voiceBase === targetBase) return 60;
  if (voice.includes(targetBase)) return 40;
  return 0;
}

export function pickBrowserVoice(language: Language): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  const target = LANGUAGE_TTS_PROFILE[language].speechLang;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const ranked = voices
    .map((voice) => ({ voice, score: scoreVoice(voice.lang, target) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.voice ?? null;
}

export function waitForBrowserVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve([]);
      return;
    }

    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }

    const timer = window.setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", onChange);
      resolve(window.speechSynthesis.getVoices());
    }, VOICE_LOAD_TIMEOUT_MS);

    const onChange = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        window.clearTimeout(timer);
        window.speechSynthesis.removeEventListener("voiceschanged", onChange);
        resolve(voices);
      }
    };

    window.speechSynthesis.addEventListener("voiceschanged", onChange);
    window.speechSynthesis.getVoices();
  });
}

export function speakWithBrowser(
  text: string,
  language: Language,
  onEnd?: () => void,
  onError?: () => void
): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const profile = LANGUAGE_TTS_PROFILE[language];
  utterance.lang = profile.speechLang;
  utterance.rate = profile.speed;
  utterance.pitch = 1;

  const voice = pickBrowserVoice(language);
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onError?.();
  window.speechSynthesis.speak(utterance);
  return true;
}
