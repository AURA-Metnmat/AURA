import { checkRateLimitBucket, type RateLimitResult } from "@/lib/auth/db-rate-limit";

// Per-IP abuse backstops for employee auth. These are deliberately GENEROUS and
// fail-open because the same public IP is often shared by many legitimate
// employees behind a corporate NAT (and onboarding can come in bursts). They
// exist only to stop scripted password-spraying and signup-spam, not to throttle
// normal use. Per-account lockout (failedLoginAttempts/lockedUntil) remains the
// primary brute-force defense for any single account.
const WINDOW_MS = 15 * 60_000;
export const LOGIN_MAX_PER_WINDOW = 100;
export const REGISTER_MAX_PER_WINDOW = 50;

// Fail-open: if the rate-limiter itself errors, allow the request. Blocking a
// real employee from signing in must never happen because of a DB hiccup.
async function safe(bucketKey: string, maxHits: number): Promise<RateLimitResult> {
  try {
    return await checkRateLimitBucket(bucketKey, maxHits, WINDOW_MS);
  } catch (error) {
    console.error(`[auth-rate-limit] check failed for ${bucketKey}; allowing request:`, error);
    return { allowed: true };
  }
}

export function checkEmployeeLoginRateLimit(ip: string): Promise<RateLimitResult> {
  return safe(`emp_login:${ip}`, LOGIN_MAX_PER_WINDOW);
}

export function checkEmployeeRegisterRateLimit(ip: string): Promise<RateLimitResult> {
  return safe(`emp_register:${ip}`, REGISTER_MAX_PER_WINDOW);
}
