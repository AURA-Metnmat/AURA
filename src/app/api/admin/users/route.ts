import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/admin";
import {
  ADMIN_ROLES,
  ADMIN_ROLE_LABELS,
  isAdminRole,
  requireSuperAdmin,
} from "@/lib/auth/admin-rbac";
import { hashPassword } from "@/lib/auth/employee";
import { AUDIT_ACTIONS, logAdminAudit } from "@/lib/auth/admin-audit";

export async function GET(request: Request) {
  const session = await requireAdminSession(request);
  if (session instanceof NextResponse) return session;

  const denied = requireSuperAdmin(session);
  if (denied) return denied;

  const users = await db.adminUser.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      roleLabel: ADMIN_ROLE_LABELS[u.role as keyof typeof ADMIN_ROLE_LABELS] ?? u.role,
      companyId: u.companyId,
      companyName: u.company?.name ?? null,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const session = await requireAdminSession(request);
  if (session instanceof NextResponse) return session;

  const denied = requireSuperAdmin(session);
  if (denied) return denied;

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    name?: string;
    role?: string;
    companyId?: string | null;
  };

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password?.trim() ?? "";
  const role = body.role?.trim() ?? ADMIN_ROLES.COMPANY_ADMIN;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  if (!isAdminRole(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (role !== ADMIN_ROLES.SUPER_ADMIN && !body.companyId) {
    return NextResponse.json(
      { error: "Company is required for non–super-admin roles" },
      { status: 400 }
    );
  }

  if (password.length < 12) {
    return NextResponse.json({ error: "Password must be at least 12 characters" }, { status: 400 });
  }

  const user = await db.adminUser.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      name: body.name?.trim() || null,
      role,
      companyId: role === ADMIN_ROLES.SUPER_ADMIN ? null : body.companyId ?? null,
    },
  });

  await logAdminAudit({
    action: AUDIT_ACTIONS.ADMIN_USER_CREATE,
    request,
    session,
    companyId: user.companyId,
    resourceType: "admin_user",
    resourceId: user.id,
    metadata: { email: user.email, role: user.role },
  });

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
    },
    { status: 201 }
  );
}
