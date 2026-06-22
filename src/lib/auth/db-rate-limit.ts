import { db } from "@/lib/db";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export async function checkRateLimitBucket(
  bucketKey: string,
  maxHits: number,
  windowMs: number,
  lockoutMs?: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const existing = await db.rateLimitBucket.findUnique({ where: { bucketKey } });

  if (existing?.lockedUntil && existing.lockedUntil.getTime() > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((existing.lockedUntil.getTime() - now) / 1000),
    };
  }

  if (!existing || now - existing.windowStart.getTime() > windowMs) {
    await db.rateLimitBucket.upsert({
      where: { bucketKey },
      create: { bucketKey, hitCount: 1, windowStart: new Date(now) },
      update: { hitCount: 1, windowStart: new Date(now), lockedUntil: null },
    });
    return { allowed: true };
  }

  const nextCount = existing.hitCount + 1;
  const lockedUntil =
    lockoutMs && nextCount >= maxHits ? new Date(now + lockoutMs) : existing.lockedUntil;

  await db.rateLimitBucket.update({
    where: { bucketKey },
    data: { hitCount: nextCount, lockedUntil },
  });

  if (nextCount > maxHits) {
    return {
      allowed: false,
      retryAfterSeconds: lockoutMs
        ? Math.ceil(lockoutMs / 1000)
        : Math.ceil((windowMs - (now - existing.windowStart.getTime())) / 1000),
    };
  }

  return { allowed: true };
}

export async function clearRateLimitBucket(bucketKey: string): Promise<void> {
  await db.rateLimitBucket.deleteMany({ where: { bucketKey } });
}
