import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/admin";
import { isAdminRole, requireSuperAdmin } from "@/lib/auth/admin-rbac";
import { hashPassword } from "@/lib/auth/employee";
import { AUDIT_ACTIONS, logAdminAudit } from "@/lib/auth/admin-audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession(request);
  if (session instanceof NextResponse) return session;

  const denied = requireSuperAdmin(session);
  if (denied) return denied;

  const { id } = await params;
  const body = (await request.json()) as {
    name?: string | null;
    role?: string;
    companyId?: string | null;
    isActive?: boolean;
    password?: string;
  };

  const existing = await db.adminUser.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
  }

  const data: {
    name?: string | null;
    role?: string;
    companyId?: string | null;
    isActive?: boolean;
    passwordHash?: string;
  } = {};

  if (body.name !== undefined) data.name = body.name?.trim() || null;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  if (body.role !== undefined) {
    if (!isAdminRole(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    data.role = body.role;
    data.companyId = body.role === "SUPER_ADMIN" ? null : body.companyId ?? existing.companyId;
  } else if (body.companyId !== undefined) {
    data.companyId = body.companyId;
  }

  if (body.password?.trim()) {
    if (body.password.trim().length < 12) {
      return NextResponse.json({ error: "Password must be at least 12 characters" }, { status: 400 });
    }
    data.passwordHash = await hashPassword(body.password.trim());
  }

  const updated = await db.adminUser.update({
    where: { id },
    data,
  });

  await logAdminAudit({
    action: AUDIT_ACTIONS.ADMIN_USER_UPDATE,
    request,
    session,
    companyId: updated.companyId,
    resourceType: "admin_user",
    resourceId: updated.id,
    metadata: {
      email: updated.email,
      role: updated.role,
      isActive: updated.isActive,
      passwordRotated: !!body.password?.trim(),
    },
  });

  return NextResponse.json({
    user: {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      companyId: updated.companyId,
      isActive: updated.isActive,
    },
  });
}
