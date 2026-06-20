import { db } from "@/lib/db";

export type OtpAuditAction =
  | "signup_otp_requested"
  | "signin_otp_requested"
  | "otp_sent"
  | "otp_send_failed"
  | "otp_verification_failed"
  | "otp_verification_success"
  | "employee_signup_completed"
  | "employee_signin_completed"
  | "rate_limit_blocked"
  | "too_many_otp_attempts";

export async function logOtpAudit(
  companyId: string,
  action: OtpAuditAction,
  request?: Request,
  options?: { employeeId?: string; metadata?: Record<string, unknown> }
): Promise<void> {
  const metadata = options?.metadata ? { ...options.metadata } : {};
  // Never store raw OTP in audit metadata
  if ("otp" in metadata) delete metadata.otp;
  if ("code" in metadata) delete metadata.code;

  await db.employeeOtpAuditLog.create({
    data: {
      companyId,
      employeeId: options?.employeeId ?? null,
      action,
      ipAddress: request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request?.headers.get("user-agent")?.slice(0, 500) ?? null,
      metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
    },
  });
}
