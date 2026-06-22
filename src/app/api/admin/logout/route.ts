import { NextResponse } from "next/server";
import { COOKIE_NAME, getAdminSession } from "@/lib/auth/admin";
import { AUDIT_ACTIONS, logAdminAudit } from "@/lib/auth/admin-audit";

export async function POST(request: Request) {
  const session = await getAdminSession(request);

  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  if (session) {
    await logAdminAudit({
      action: AUDIT_ACTIONS.ADMIN_LOGOUT,
      request,
      session,
    });
  }

  return response;
}
