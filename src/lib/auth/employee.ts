import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { env } from "@/lib/env";
import { db } from "@/lib/db";

const COOKIE_NAME = "aura_employee_session";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

export interface EmployeeSessionPayload {
  employeeId: string;
  companyId: string;
  exp: number;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createEmployeeSessionToken(employeeId: string, companyId: string): string {
  const secret = env().sessionSecret;
  const exp = Date.now() + SESSION_MS;
  const payload = Buffer.from(JSON.stringify({ employeeId, companyId, exp })).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyEmployeeSessionToken(token: string): EmployeeSessionPayload | null {
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
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as EmployeeSessionPayload;
    if (
      typeof data.employeeId !== "string" ||
      typeof data.companyId !== "string" ||
      typeof data.exp !== "number" ||
      data.exp <= Date.now()
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function employeeSessionCookieOptions(token: string): {
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

export async function getEmployeeSession(): Promise<EmployeeSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyEmployeeSessionToken(token);
}

export async function requireEmployeeSession(
  request?: Request,
  companyId?: string
): Promise<{ session: EmployeeSessionPayload } | NextResponse> {
  const cookieStore = await cookies();
  let token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token && request) {
    const auth = request.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      token = auth.slice(7);
    }
  }

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = verifyEmployeeSessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
  }

  if (companyId && session.companyId !== companyId) {
    return NextResponse.json({ error: "Unauthorized for this company" }, { status: 403 });
  }

  const employee = await db.employee.findUnique({
    where: { id: session.employeeId },
    select: { accountStatus: true, lockedUntil: true },
  });

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  if (employee.accountStatus === "disabled" || employee.accountStatus === "INACTIVE") {
    return NextResponse.json(
      { error: "Account is disabled. Contact your administrator." },
      { status: 403 }
    );
  }

  if (employee.lockedUntil && employee.lockedUntil.getTime() > Date.now()) {
    return NextResponse.json(
      { error: "Account temporarily locked. Please try again later." },
      { status: 429 }
    );
  }

  return { session };
}

export function clearEmployeeSessionCookie(): {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: env().isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  };
}

export { COOKIE_NAME as EMPLOYEE_COOKIE_NAME };
