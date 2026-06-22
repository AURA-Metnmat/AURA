import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  adminSessionCookieOptions,
  createAdminSessionToken,
  verifyAdminPassword,
} from "@/lib/auth/admin";
import {
  checkAdminLoginAllowed,
  clearAdminLoginSuccess,
  recordAdminLoginFailure,
} from "@/lib/auth/admin-rate-limit";
import { getClientIp } from "@/lib/auth/client-ip";
import { env } from "@/lib/env";
import { verifyPassword } from "@/lib/auth/employee";
import { ADMIN_ROLES } from "@/lib/auth/admin-rbac";
import { AUDIT_ACTIONS, logAdminAudit } from "@/lib/auth/admin-audit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkAdminLoginAllowed(ip);
    if (!allowed.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed attempts. Try again in ${allowed.retryAfterSeconds ?? 60} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password?.trim() ?? "";

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    let sessionPayload: {
      adminUserId: string | null;
      email: string | null;
      role: (typeof ADMIN_ROLES)[keyof typeof ADMIN_ROLES];
      companyId: string | null;
      legacy: boolean;
    } | null = null;

    if (email) {
      const adminUser = await db.adminUser.findUnique({
        where: { email },
      });

      if (adminUser?.isActive && (await verifyPassword(password, adminUser.passwordHash))) {
        await db.adminUser.update({
          where: { id: adminUser.id },
          data: { lastLoginAt: new Date() },
        });

        sessionPayload = {
          adminUserId: adminUser.id,
          email: adminUser.email,
          role: adminUser.role as (typeof ADMIN_ROLES)[keyof typeof ADMIN_ROLES],
          companyId: adminUser.companyId,
          legacy: false,
        };
      }
    }

    if (!sessionPayload && env().allowLegacyAdminPassword && verifyAdminPassword(password)) {
      sessionPayload = {
        adminUserId: null,
        email: email || null,
        role: ADMIN_ROLES.SUPER_ADMIN,
        companyId: null,
        legacy: true,
      };
    }

    if (!sessionPayload) {
      await recordAdminLoginFailure(ip);
      await logAdminAudit({
        action: AUDIT_ACTIONS.ADMIN_LOGIN_FAILED,
        request,
        actorEmail: email || null,
        metadata: { reason: "invalid_credentials" },
      });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await clearAdminLoginSuccess(ip);
    const token = createAdminSessionToken(sessionPayload);
    const response = NextResponse.json({
      success: true,
      role: sessionPayload.role,
      email: sessionPayload.email,
    });
    const opts = adminSessionCookieOptions(token);
    response.cookies.set(opts);

    await logAdminAudit({
      action: AUDIT_ACTIONS.ADMIN_LOGIN,
      request,
      session: {
        ...sessionPayload,
        exp: Date.now() + 24 * 60 * 60 * 1000,
      },
      metadata: { legacy: sessionPayload.legacy },
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
