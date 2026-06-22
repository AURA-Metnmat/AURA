import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin";
import {
  ADMIN_ROLE_LABELS,
  hasPermission,
  PERMISSIONS,
} from "@/lib/auth/admin-rbac";

export async function GET(request: Request) {
  const session = await requireAdminSession(request);
  if (session instanceof NextResponse) return session;

  return NextResponse.json({
    adminUserId: session.adminUserId,
    email: session.email,
    role: session.role,
    roleLabel: ADMIN_ROLE_LABELS[session.role],
    companyId: session.companyId,
    legacy: session.legacy,
    permissions: {
      manageCompanies: hasPermission(session.role, PERMISSIONS.MANAGE_COMPANIES),
      manageCampaigns: hasPermission(session.role, PERMISSIONS.MANAGE_CAMPAIGNS),
      manageQuestionBank: hasPermission(session.role, PERMISSIONS.MANAGE_QUESTION_BANK),
      reviewAnswers: hasPermission(session.role, PERMISSIONS.REVIEW_ANSWERS),
      reviewKnowledge: hasPermission(session.role, PERMISSIONS.REVIEW_KNOWLEDGE),
      exportData: hasPermission(session.role, PERMISSIONS.EXPORT_DATA),
      viewAuditLog: hasPermission(session.role, PERMISSIONS.VIEW_AUDIT_LOG),
      manageAdminUsers: hasPermission(session.role, PERMISSIONS.MANAGE_ADMIN_USERS),
    },
  });
}
