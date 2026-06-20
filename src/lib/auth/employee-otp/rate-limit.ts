import { db } from "@/lib/db";
import { getOtpConfig } from "./config";
import type { OtpPurpose } from "./types";

function hourAgo(): Date {
  return new Date(Date.now() - 60 * 60 * 1000);
}

export async function checkResendCooldown(
  companyId: string,
  mobileHash: string,
  purpose: OtpPurpose
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const { resendCooldownSeconds } = getOtpConfig();
  const latest = await db.otpVerification.findFirst({
    where: { companyId, mobileNumberHash: mobileHash, purpose },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) return { allowed: true };

  const elapsed = (Date.now() - latest.createdAt.getTime()) / 1000;
  if (elapsed >= resendCooldownSeconds) return { allowed: true };

  return {
    allowed: false,
    retryAfterSeconds: Math.ceil(resendCooldownSeconds - elapsed),
  };
}

export async function checkRateLimits(params: {
  companyId: string;
  mobileHash: string;
  employeeId?: string;
  ipAddress?: string;
}): Promise<{ allowed: boolean; reason?: string }> {
  const cfg = getOtpConfig();
  const since = hourAgo();

  const [mobileCount, employeeCount, ipCount] = await Promise.all([
    db.otpVerification.count({
      where: {
        companyId: params.companyId,
        mobileNumberHash: params.mobileHash,
        createdAt: { gte: since },
      },
    }),
    params.employeeId
      ? db.otpVerification.count({
          where: {
            companyId: params.companyId,
            employeeId: params.employeeId,
            createdAt: { gte: since },
          },
        })
      : Promise.resolve(0),
    params.ipAddress
      ? db.otpVerification.count({
          where: {
            companyId: params.companyId,
            ipAddress: params.ipAddress,
            createdAt: { gte: since },
          },
        })
      : Promise.resolve(0),
  ]);

  if (mobileCount >= cfg.maxRequestsPerMobilePerHour) {
    return { allowed: false, reason: "mobile_hourly" };
  }
  if (params.employeeId && employeeCount >= cfg.maxRequestsPerEmployeePerHour) {
    return { allowed: false, reason: "employee_hourly" };
  }
  if (params.ipAddress && ipCount >= cfg.maxRequestsPerIpPerHour) {
    return { allowed: false, reason: "ip_hourly" };
  }

  return { allowed: true };
}
