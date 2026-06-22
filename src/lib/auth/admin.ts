import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import {
  ADMIN_ROLES,
  type AdminRole,
  type AdminSession,
  isAdminRole,
} from "@/lib/auth/admin-rbac";

const COOKIE_NAME = "aura_admin_session";
const SESSION_MS = 24 * 60 * 60 * 1000;

interface SessionTokenPayload {
  exp: number;
  sub?: string | null;
  email?: string | null;
  role?: AdminRole;
  companyId?: string | null;
  legacy?: boolean;
}

export function createAdminSessionToken(session: {
  adminUserId?: string | null;
  email?: string | null;
  role?: AdminRole;
  companyId?: string | null;
  legacy?: boolean;
}): string {
  const secret = env().sessionSecret;
  const exp = Date.now() + SESSION_MS;
  const payload = Buffer.from(
    JSON.stringify({
      exp,
      sub: session.adminUserId ?? null,
      email: session.email ?? null,
      role: session.role ?? ADMIN_ROLES.SUPER_ADMIN,
      companyId: session.companyId ?? null,
      legacy: session.legacy ?? false,
    } satisfies SessionTokenPayload)
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyAdminSessionToken(token: string): AdminSession | null {
  const secret = env().sessionSecret;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionTokenPayload;
    if (typeof data.exp !== "number" || data.exp <= Date.now()) return null;

    const role =
      data.role && isAdminRole(data.role) ? data.role : ADMIN_ROLES.SUPER_ADMIN;

    return {
      adminUserId: data.sub ?? null,
      email: data.email ?? null,
      role,
      companyId: data.companyId ?? null,
      legacy: data.legacy ?? !data.sub,
      exp: data.exp,
    };
  } catch {
    return null;
  }
}

export function adminSessionCookieOptions(token: string): {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict";
  path: string;
  maxAge: number;
} {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: env().isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MS / 1000,
  };
}

export function verifyAdminPassword(password: string): boolean {
  return password === env().adminPassword;
}

async function readSessionToken(request?: Request): Promise<string | undefined> {
  const cookieStore = await cookies();
  let token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token && request) {
    const auth = request.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      token = auth.slice(7);
    }
  }

  return token;
}

export async function getAdminSession(request?: Request): Promise<AdminSession | null> {
  const token = await readSessionToken(request);
  if (!token) return null;
  return verifyAdminSessionToken(token);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

export async function requireAdmin(request?: Request): Promise<NextResponse | null> {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function requireAdminSession(
  request?: Request
): Promise<AdminSession | NextResponse> {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

export { COOKIE_NAME };
