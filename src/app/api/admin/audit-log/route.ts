import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/admin";
import { parseIntParam } from "@/lib/http/query-params";
import {
  assertCompanyAccess,
  canAccessCompany,
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth/admin-rbac";

export async function GET(request: Request) {
  const session = await requireAdminSession(request);
  if (session instanceof NextResponse) return session;

  const permDenied = requirePermission(session, PERMISSIONS.VIEW_AUDIT_LOG);
  if (permDenied) return permDenied;

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const limit = parseIntParam(searchParams.get("limit"), 50, { min: 1, max: 200 });

  if (companyId) {
    const denied = assertCompanyAccess(session, companyId);
    if (denied) return denied;
  }

  const logs = await db.adminAuditLog.findMany({
    where: {
      ...(companyId ? { companyId } : {}),
      ...(session.companyId && session.role !== "SUPER_ADMIN" && !session.legacy
        ? { companyId: session.companyId }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      company: { select: { id: true, name: true } },
      adminUser: { select: { id: true, email: true, name: true } },
    },
  });

  return NextResponse.json({
    logs: logs
      .filter((log) => !log.companyId || canAccessCompany(session, log.companyId))
      .map((log) => ({
        id: log.id,
        action: log.action,
        actorEmail: log.actorEmail ?? log.adminUser?.email ?? null,
        actorName: log.adminUser?.name ?? null,
        companyId: log.companyId,
        companyName: log.company?.name ?? null,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        metadata: log.metadata ? (JSON.parse(log.metadata) as Record<string, unknown>) : null,
        createdAt: log.createdAt.toISOString(),
      })),
  });
}
