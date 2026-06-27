import { checkRateLimitBucket, type RateLimitResult } from "@/lib/auth/db-rate-limit";

// Abuse protection for the cost-sensitive AI endpoints. Limits are deliberately
// generous — a real interview sends far fewer requests than these, so a normal
// participant never trips them; they only stop runaway/abusive loops that would
// burn Anthropic/OpenAI credits.
const WINDOW_MS = 60_000;
export const INTERVIEW_MESSAGE_MAX_PER_MIN = 40;
export const TTS_MAX_PER_MIN = 80;
export const AI_PROBE_MAX_PER_MIN = 6;
const AI_PROBE_LOCKOUT_MS = 5 * 60_000;

// Fail-open: if the rate-limiter itself errors (e.g. a transient DB hiccup),
// allow the request through. Protecting against abuse must never take down a
// live interview.
async function safeCheck(
  bucketKey: string,
  maxHits: number,
  windowMs: number,
  lockoutMs?: number
): Promise<RateLimitResult> {
  try {
    return await checkRateLimitBucket(bucketKey, maxHits, windowMs, lockoutMs);
  } catch (error) {
    console.error(`[rate-limit] check failed for ${bucketKey}; allowing request:`, error);
    return { allowed: true };
  }
}

export function checkInterviewMessageRateLimit(sessionId: string): Promise<RateLimitResult> {
  return safeCheck(`interview_msg:${sessionId}`, INTERVIEW_MESSAGE_MAX_PER_MIN, WINDOW_MS);
}

export function checkTtsRateLimit(sessionId: string): Promise<RateLimitResult> {
  return safeCheck(`tts:${sessionId}`, TTS_MAX_PER_MIN, WINDOW_MS);
}

export function checkAiProbeRateLimit(ip: string): Promise<RateLimitResult> {
  return safeCheck(`ai_probe:${ip}`, AI_PROBE_MAX_PER_MIN, WINDOW_MS, AI_PROBE_LOCKOUT_MS);
}
