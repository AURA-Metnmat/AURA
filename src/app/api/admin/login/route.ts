import { NextResponse } from "next/server";
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

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const allowed = checkAdminLoginAllowed(ip);
    if (!allowed.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed attempts. Try again in ${allowed.retryAfterSeconds ?? 60} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = (await request.json()) as { password?: string };
    const password = body.password?.trim() ?? "";

    if (!password || !verifyAdminPassword(password)) {
      recordAdminLoginFailure(ip);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    clearAdminLoginSuccess(ip);
    const token = createAdminSessionToken();
    const response = NextResponse.json({ success: true });
    const opts = adminSessionCookieOptions(token);
    response.cookies.set(opts);
    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
