import { Prisma } from "@/generated/client";
import { db } from "@/lib/db";
import {
  createEmployeeSessionToken,
  employeeSessionCookieOptions,
  hashPassword,
  verifyPassword,
} from "@/lib/auth/employee";
import { generateEmployeeCode, generateUniqueUsername } from "@/lib/employees/credentials";
import { logEmployeeAuth } from "@/lib/employees/auth-log";
import { findActiveSessionForEmployee } from "@/lib/employees/session-resume";
import { normalizeEmail } from "@/lib/employees/validation";
import {
  findCompanyBySlug,
  isEmailDomainAllowed,
  isEmployeeActive,
  validateSignupFields,
} from "./company-policy";
import {
  isValidMobileNumber,
  normalizeMobileNumber,
  parseIdentifier,
} from "./mobile";
import {
  ACCOUNT_LOCK_MINUTES,
  MAX_FAILED_LOGIN_ATTEMPTS,
  validateEmployeePassword,
} from "./password-policy";
import type { OtpVerifySuccess } from "./types";

const INVALID_CREDENTIALS = "Invalid mobile, email, or password.";

export function attachSessionCookie(
  response: import("next/server").NextResponse,
  sessionToken: string
): void {
  response.cookies.set(employeeSessionCookieOptions(sessionToken));
}

async function findEmployeeByIdentifier(companyId: string, identifier: string) {
  const kind = parseIdentifier(identifier);
  if (kind === "email") {
    const email = normalizeEmail(identifier);
    return db.employee.findFirst({
      where: { companyId, email: { equals: email, mode: "insensitive" } },
      select: {
        id: true,
        mobileNumber: true,
        email: true,
        employeeName: true,
        designation: true,
        department: true,
        employeeCode: true,
        accountStatus: true,
        passwordHash: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });
  }

  const mobile = normalizeMobileNumber(identifier);
  if (!isValidMobileNumber(mobile)) return null;

  return db.employee.findFirst({
    where: { companyId, mobileNumber: mobile },
    select: {
      id: true,
      mobileNumber: true,
      email: true,
      employeeName: true,
      designation: true,
      department: true,
      employeeCode: true,
      accountStatus: true,
      passwordHash: true,
      failedLoginAttempts: true,
      lockedUntil: true,
    },
  });
}

export async function registerEmployee(
  body: {
    companySlug: string;
    name?: string;
    designation?: string;
    department?: string;
    email?: string;
    mobileNumber?: string;
    password?: string;
    inviteToken?: string;
  },
  request?: Request
): Promise<
  | { ok: true; data: OtpVerifySuccess; sessionToken: string }
  | { ok: false; status: number; error: string }
> {
  const company = await findCompanyBySlug(body.companySlug);
  if (!company) {
    return { ok: false, status: 404, error: "Company not found." };
  }

  if (!company.allowEmployeeSelfRegistration || company.registrationMode === "CLOSED") {
    return { ok: false, status: 403, error: "Registration is not open for this company." };
  }

  if (company.registrationMode === "INVITE_ONLY") {
    const token = body.inviteToken?.trim();
    if (!token || token !== company.inviteToken) {
      return { ok: false, status: 403, error: "A valid invite is required to register." };
    }
  }

  const validated = validateSignupFields(body);
  if (!validated.ok) {
    return { ok: false, status: 400, error: validated.error };
  }

  const passwordError = validateEmployeePassword(body.password ?? "");
  if (passwordError) {
    return { ok: false, status: 400, error: passwordError };
  }

  const { name, designation, department, email, mobileNumber } = validated.data;
  const password = body.password!.trim();

  if (!isEmailDomainAllowed(email, company.allowedEmailDomains)) {
    return { ok: false, status: 400, error: "Email domain is not allowed for this company." };
  }

  const existing = await db.employee.findFirst({
    where: {
      companyId: company.id,
      OR: [{ mobileNumber }, { email: { equals: email, mode: "insensitive" } }],
    },
  });
  if (existing) {
    return {
      ok: false,
      status: 409,
      error: "This email or mobile is already registered. Use Sign in instead.",
    };
  }

  let employee;
  try {
    const username = await generateUniqueUsername(company.id, name);
    const employeeCode = await generateEmployeeCode(company.id);
    employee = await db.employee.create({
      data: {
        employeeCode,
        companyId: company.id,
        employeeName: name,
        designation,
        department,
        mobileNumber,
        email,
        username,
        passwordHash: await hashPassword(password),
        isFirstLogin: false,
        accountStatus: "ACTIVE",
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, status: 409, error: "This email or mobile is already registered." };
    }
    throw error;
  }

  await logEmployeeAuth(employee.id, "register", request, {
    employeeCode: employee.employeeCode,
    designation: employee.designation,
  });

  const sessionToken = createEmployeeSessionToken(employee.id, company.id);
  const activeSession = await findActiveSessionForEmployee(employee.id, company.id);

  return {
    ok: true,
    sessionToken,
    data: {
      ok: true,
      employee_id: employee.employeeCode,
      employee_name: employee.employeeName,
      designation: employee.designation,
      department: employee.department,
      mobile_number: employee.mobileNumber,
      email: employee.email,
      active_session: activeSession,
      message: "Profile created. Starting your interview…",
    },
  };
}

export async function signInEmployee(
  body: { companySlug: string; identifier?: string; password?: string },
  request?: Request
): Promise<
  | { ok: true; data: OtpVerifySuccess; sessionToken: string }
  | { ok: false; status: number; error: string }
> {
  const company = await findCompanyBySlug(body.companySlug);
  if (!company) {
    return { ok: false, status: 404, error: "Company not found." };
  }

  const identifier = body.identifier?.trim() ?? "";
  const password = body.password ?? "";

  if (!identifier) {
    return { ok: false, status: 400, error: "Enter your mobile number or email." };
  }

  if (!password.trim()) {
    return { ok: false, status: 400, error: "Enter your password." };
  }

  const employee = await findEmployeeByIdentifier(company.id, identifier);
  if (!employee || !isEmployeeActive(employee.accountStatus)) {
    return { ok: false, status: 401, error: INVALID_CREDENTIALS };
  }

  if (employee.lockedUntil && employee.lockedUntil.getTime() > Date.now()) {
    return {
      ok: false,
      status: 429,
      error: "Account temporarily locked. Please try again later.",
    };
  }

  const valid = await verifyPassword(password, employee.passwordHash);
  if (!valid) {
    const attempts = employee.failedLoginAttempts + 1;
    const lockAccount = attempts >= MAX_FAILED_LOGIN_ATTEMPTS;
    await db.employee.update({
      where: { id: employee.id },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: lockAccount
          ? new Date(Date.now() + ACCOUNT_LOCK_MINUTES * 60 * 1000)
          : null,
      },
    });
    await logEmployeeAuth(employee.id, "login_failed", request, { attempts });
    return {
      ok: false,
      status: 401,
      error: lockAccount
        ? "Too many failed attempts. Account locked for 15 minutes."
        : INVALID_CREDENTIALS,
    };
  }

  await db.employee.update({
    where: { id: employee.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await logEmployeeAuth(employee.id, "login_success", request);

  const sessionToken = createEmployeeSessionToken(employee.id, company.id);
  const activeSession = await findActiveSessionForEmployee(employee.id, company.id);

  return {
    ok: true,
    sessionToken,
    data: {
      ok: true,
      employee_id: employee.employeeCode,
      employee_name: employee.employeeName,
      designation: employee.designation,
      department: employee.department,
      mobile_number: employee.mobileNumber,
      email: employee.email,
      active_session: activeSession,
      message: "Welcome back. Resuming your interview…",
    },
  };
}
