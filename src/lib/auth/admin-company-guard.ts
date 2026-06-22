import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin";
import {
  assertCompanyAccess,
  type AdminSession,
  type Permission,
  requirePermission,
} from "@/lib/auth/admin-rbac";

export async function requireCompanyAdmin(
  request: Request,
  companyId: string,
  permission?: Permission
): Promise<AdminSession | NextResponse> {
  const session = await requireAdminSession(request);
  if (session instanceof NextResponse) return session;

  const accessDenied = assertCompanyAccess(session, companyId);
  if (accessDenied) return accessDenied;

  if (permission) {
    const permDenied = requirePermission(session, permission);
    if (permDenied) return permDenied;
  }

  return session;
}
