import { NextResponse } from "next/server";

export const ADMIN_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  COMPANY_ADMIN: "COMPANY_ADMIN",
  REVIEWER: "REVIEWER",
  ANALYST: "ANALYST",
} as const;

export type AdminRole = (typeof ADMIN_ROLES)[keyof typeof ADMIN_ROLES];

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Admin",
  COMPANY_ADMIN: "Company Admin",
  REVIEWER: "Reviewer",
  ANALYST: "Analyst",
};

export const PERMISSIONS = {
  MANAGE_COMPANIES: "manage_companies",
  MANAGE_CAMPAIGNS: "manage_campaigns",
  MANAGE_QUESTION_BANK: "manage_question_bank",
  REVIEW_ANSWERS: "review_answers",
  REVIEW_KNOWLEDGE: "review_knowledge",
  EXPORT_DATA: "export_data",
  VIEW_AUDIT_LOG: "view_audit_log",
  MANAGE_ADMIN_USERS: "manage_admin_users",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS = new Set<Permission>(Object.values(PERMISSIONS));

const ROLE_PERMISSIONS: Record<AdminRole, ReadonlySet<Permission>> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  COMPANY_ADMIN: new Set([
    PERMISSIONS.MANAGE_CAMPAIGNS,
    PERMISSIONS.MANAGE_QUESTION_BANK,
    PERMISSIONS.REVIEW_ANSWERS,
    PERMISSIONS.REVIEW_KNOWLEDGE,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.VIEW_AUDIT_LOG,
  ]),
  REVIEWER: new Set([PERMISSIONS.REVIEW_ANSWERS, PERMISSIONS.REVIEW_KNOWLEDGE]),
  ANALYST: new Set([PERMISSIONS.EXPORT_DATA]),
};

export interface AdminSession {
  adminUserId: string | null;
  email: string | null;
  role: AdminRole;
  companyId: string | null;
  legacy: boolean;
  exp: number;
}

export function isAdminRole(value: string): value is AdminRole {
  return Object.values(ADMIN_ROLES).includes(value as AdminRole);
}

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export function canAccessCompany(session: AdminSession, companyId: string): boolean {
  if (session.role === ADMIN_ROLES.SUPER_ADMIN || session.legacy) return true;
  return session.companyId === companyId;
}

export function companyScopeFilter(session: AdminSession): { id?: string } {
  if (session.role === ADMIN_ROLES.SUPER_ADMIN || session.legacy) return {};
  if (session.companyId) return { id: session.companyId };
  return { id: "__none__" };
}

export function requirePermission(
  session: AdminSession,
  permission: Permission
): NextResponse | null {
  if (!hasPermission(session.role, permission)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export function assertCompanyAccess(
  session: AdminSession,
  companyId: string
): NextResponse | null {
  if (!canAccessCompany(session, companyId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export function requireSuperAdmin(session: AdminSession): NextResponse | null {
  if (session.role !== ADMIN_ROLES.SUPER_ADMIN && !session.legacy) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
