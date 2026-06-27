import { db } from "@/lib/db";
import { getClientIp } from "@/lib/auth/client-ip";
import type { AdminSession } from "@/lib/auth/admin-rbac";

export const AUDIT_ACTIONS = {
  ADMIN_LOGIN: "admin.login",
  ADMIN_LOGIN_FAILED: "admin.login_failed",
  ADMIN_LOGOUT: "admin.logout",
  COMPANY_CREATE: "company.create",
  COMPANY_UPDATE: "company.update",
  COMPANY_DELETE: "company.delete",
  ANSWER_REVIEW: "answer.review",
  KNOWLEDGE_REVIEW: "knowledge.review",
  KNOWLEDGE_EXPORT: "knowledge.export",
  CAMPAIGN_CREATE: "campaign.create",
  CAMPAIGN_UPDATE: "campaign.update",
  CAMPAIGN_DELETE: "campaign.delete",
  ADMIN_USER_CREATE: "admin_user.create",
  ADMIN_USER_UPDATE: "admin_user.update",
  REFERENCE_UPLOAD: "reference.upload",
  REFERENCE_UPDATE: "reference.update",
  REFERENCE_DELETE: "reference.delete",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export interface LogAdminAuditInput {
  action: AuditAction | string;
  session?: AdminSession | null;
  request?: Request;
  companyId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  actorEmail?: string | null;
}

export async function logAdminAudit(input: LogAdminAuditInput): Promise<void> {
  const ipAddress = input.request ? getClientIp(input.request) : null;
  const userAgent = input.request?.headers.get("user-agent")?.slice(0, 500) ?? null;

  const metadata = input.metadata ? { ...input.metadata } : {};
  if ("password" in metadata) delete metadata.password;
  if ("passwordHash" in metadata) delete metadata.passwordHash;

  await db.adminAuditLog.create({
    data: {
      adminUserId: input.session?.adminUserId ?? null,
      actorEmail: input.actorEmail ?? input.session?.email ?? null,
      action: input.action,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      companyId: input.companyId ?? input.session?.companyId ?? null,
      ipAddress,
      userAgent,
      metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
    },
  });
}
