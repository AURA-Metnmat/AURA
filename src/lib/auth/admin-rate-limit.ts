import { db } from "@/lib/db";
import { AUDIT_ACTIONS } from "@/lib/auth/admin-audit";
import { clearRateLimitBucket } from "@/lib/auth/db-rate-limit";

const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export async function checkAdminLoginAllowed(
  ip: string
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const since = new Date(Date.now() - LOCKOUT_MS);
  const failures = await db.adminAuditLog.count({
    where: {
      action: AUDIT_ACTIONS.ADMIN_LOGIN_FAILED,
      ipAddress: ip,
      createdAt: { gte: since },
    },
  });

  if (failures < MAX_FAILURES) {
    return { allowed: true };
  }

  const latest = await db.adminAuditLog.findFirst({
    where: { action: AUDIT_ACTIONS.ADMIN_LOGIN_FAILED, ipAddress: ip },
    orderBy: { createdAt: "desc" },
  });

  const lockedUntil = (latest?.createdAt.getTime() ?? Date.now()) + LOCKOUT_MS;
  if (Date.now() < lockedUntil) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((lockedUntil - Date.now()) / 1000),
    };
  }

  return { allowed: true };
}

export async function recordAdminLoginFailure(_ip: string): Promise<void> {
  // Failures are recorded via logAdminAudit in the login route.
}

export async function clearAdminLoginSuccess(ip: string): Promise<void> {
  await clearRateLimitBucket(`admin_login:${ip}`);
}
