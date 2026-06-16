import { db } from "@/lib/db";

export type EmployeeAuthAction =
  | "register"
  | "login_success"
  | "login_failed"
  | "password_change"
  | "logout"
  | "account_locked";

export async function logEmployeeAuth(
  employeeId: string,
  action: EmployeeAuthAction,
  request?: Request,
  metadata?: Record<string, unknown>
): Promise<void> {
  await db.employeeAuthLog.create({
    data: {
      employeeId,
      action,
      ipAddress: request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request?.headers.get("user-agent")?.slice(0, 500) ?? null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}
