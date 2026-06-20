import { Prisma } from "@/generated/client";
import { db } from "@/lib/db";
import {
  createEmployeeSessionToken,
  employeeSessionCookieOptions,
  hashPassword,
} from "@/lib/auth/employee";
import { generateEmployeeCode, generateUniqueUsername } from "@/lib/employees/credentials";
import { logEmployeeAuth } from "@/lib/employees/auth-log";
import { findActiveSessionForEmployee } from "@/lib/employees/session-resume";
import { normalizeEmail } from "@/lib/employees/validation";
import { logOtpAudit } from "./audit";
import { getOtpConfig } from "./config";
import {
  findCompanyBySlug,
  isEmailDomainAllowed,
  isEmployeeActive,
  validateSignupFields,
} from "./company-policy";
import { generateOtpCode, hashOtp, verifyOtpHash } from "./hash";
import {
  hashMobileNumber,
  isValidMobileNumber,
  maskMobileNumber,
  normalizeMobileNumber,
  parseIdentifier,
} from "./mobile";
import { checkRateLimits, checkResendCooldown } from "./rate-limit";
import { sendOtp } from "./sms-provider";
import type { OtpPurpose, OtpRequestSuccess, OtpVerifySuccess, SignupRegistrationPayload } from "./types";

function getClientMeta(request?: Request) {
  return {
    ipAddress: request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: request?.headers.get("user-agent")?.slice(0, 500) ?? undefined,
  };
}

function otpExpiryDate(): Date {
  const { expiryMinutes } = getOtpConfig();
  return new Date(Date.now() + expiryMinutes * 60 * 1000);
}

async function invalidatePendingOtps(
  companyId: string,
  mobileHash: string,
  purpose: OtpPurpose
): Promise<void> {
  await db.otpVerification.updateMany({
    where: {
      companyId,
      mobileNumberHash: mobileHash,
      purpose,
      consumedAt: null,
    },
    data: { consumedAt: new Date() },
  });
}

async function createOtpRecord(params: {
  companyId: string;
  employeeId?: string;
  purpose: OtpPurpose;
  mobileNumber: string;
  mobileHash: string;
  otpHash: string;
  registrationPayload?: SignupRegistrationPayload;
  request?: Request;
}) {
  const meta = getClientMeta(params.request);
  await invalidatePendingOtps(params.companyId, params.mobileHash, params.purpose);

  return db.otpVerification.create({
    data: {
      companyId: params.companyId,
      employeeId: params.employeeId ?? null,
      purpose: params.purpose,
      mobileNumber: params.mobileNumber,
      mobileNumberHash: params.mobileHash,
      otpHash: params.otpHash,
      registrationPayload: params.registrationPayload
        ? JSON.stringify(params.registrationPayload)
        : null,
      expiresAt: otpExpiryDate(),
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });
}

export async function requestSignupOtp(
  body: {
    companySlug: string;
    name?: string;
    designation?: string;
    department?: string;
    email?: string;
    mobileNumber?: string;
    inviteToken?: string;
  },
  request?: Request
): Promise<{ ok: true; data: OtpRequestSuccess } | { ok: false; status: number; error: string }> {
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

  const { name, designation, department, email, mobileNumber } = validated.data;

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

  const { pepper } = getOtpConfig();
  const mobileHash = hashMobileNumber(mobileNumber, pepper);
  const meta = getClientMeta(request);

  const cooldown = await checkResendCooldown(company.id, mobileHash, "EMPLOYEE_SIGNUP");
  if (!cooldown.allowed) {
    await logOtpAudit(company.id, "rate_limit_blocked", request, {
      metadata: { flow: "signup", reason: "resend_cooldown" },
    });
    return { ok: false, status: 429, error: "Please wait before requesting another OTP." };
  }

  const rate = await checkRateLimits({
    companyId: company.id,
    mobileHash,
    ipAddress: meta.ipAddress,
  });
  if (!rate.allowed) {
    await logOtpAudit(company.id, "rate_limit_blocked", request, {
      metadata: { flow: "signup", reason: rate.reason },
    });
    return { ok: false, status: 429, error: "Too many OTP requests. Please try again later." };
  }

  await logOtpAudit(company.id, "signup_otp_requested", request, {
    metadata: { mobileHash: mobileHash.slice(0, 12) },
  });

  const otp = generateOtpCode();
  const otpHash = await hashOtp(otp);

  const payload: SignupRegistrationPayload = {
    name,
    designation,
    department,
    email,
    mobileNumber,
  };

  await createOtpRecord({
    companyId: company.id,
    purpose: "EMPLOYEE_SIGNUP",
    mobileNumber,
    mobileHash,
    otpHash,
    registrationPayload: payload,
    request,
  });

  const sms = await sendOtp({
    to: mobileNumber,
    otp,
    purpose: "EMPLOYEE_SIGNUP",
    companyName: company.name,
  });

  if (!sms.delivered) {
    await logOtpAudit(company.id, "otp_send_failed", request, {
      metadata: { flow: "signup", provider: sms.provider },
    });
    return { ok: false, status: 503, error: "Could not send OTP. Please try again shortly." };
  }

  await logOtpAudit(company.id, "otp_sent", request, {
    metadata: { flow: "signup", provider: sms.provider },
  });

  return {
    ok: true,
    data: {
      ok: true,
      maskedMobile: maskMobileNumber(mobileNumber),
      message: `OTP sent to your mobile number ending with ${mobileNumber.slice(-4)}.`,
    },
  };
}

export async function verifySignupOtp(
  body: { companySlug: string; mobileNumber?: string; otp?: string },
  request?: Request
): Promise<
  | { ok: true; data: OtpVerifySuccess; sessionToken: string }
  | { ok: false; status: number; error: string }
> {
  const company = await findCompanyBySlug(body.companySlug);
  if (!company) {
    return { ok: false, status: 404, error: "Invalid or expired OTP." };
  }

  const mobileNumber = normalizeMobileNumber(body.mobileNumber ?? "");
  const otp = body.otp?.trim() ?? "";

  if (!isValidMobileNumber(mobileNumber) || !/^\d{6}$/.test(otp)) {
    return { ok: false, status: 400, error: "Invalid or expired OTP." };
  }

  const { pepper, maxAttempts } = getOtpConfig();
  const mobileHash = hashMobileNumber(mobileNumber, pepper);

  const record = await db.otpVerification.findFirst({
    where: {
      companyId: company.id,
      mobileNumberHash: mobileHash,
      purpose: "EMPLOYEE_SIGNUP",
      consumedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    await logOtpAudit(company.id, "otp_verification_failed", request, {
      metadata: { flow: "signup", reason: "not_found" },
    });
    return { ok: false, status: 400, error: "Invalid or expired OTP." };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await logOtpAudit(company.id, "otp_verification_failed", request, {
      metadata: { flow: "signup", reason: "expired" },
    });
    return { ok: false, status: 400, error: "Invalid or expired OTP." };
  }

  if (record.attempts >= maxAttempts) {
    await logOtpAudit(company.id, "too_many_otp_attempts", request, {
      metadata: { flow: "signup" },
    });
    return { ok: false, status: 429, error: "Too many attempts. Please request a new OTP." };
  }

  const valid = await verifyOtpHash(otp, record.otpHash);
  if (!valid) {
    await db.otpVerification.update({
      where: { id: record.id },
      data: { attempts: record.attempts + 1 },
    });
    await logOtpAudit(company.id, "otp_verification_failed", request, {
      metadata: { flow: "signup", reason: "wrong_code" },
    });
    return { ok: false, status: 400, error: "Invalid or expired OTP." };
  }

  const payload = record.registrationPayload
    ? (JSON.parse(record.registrationPayload) as SignupRegistrationPayload)
    : null;

  if (!payload) {
    return { ok: false, status: 400, error: "Invalid or expired OTP." };
  }

  await db.otpVerification.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  const duplicate = await db.employee.findFirst({
    where: {
      companyId: company.id,
      OR: [
        { mobileNumber: payload.mobileNumber },
        { email: { equals: payload.email, mode: "insensitive" } },
      ],
    },
  });
  if (duplicate) {
    return { ok: false, status: 409, error: "This email or mobile is already registered." };
  }

  let employee;
  try {
    const username = await generateUniqueUsername(company.id, payload.name);
    const employeeCode = await generateEmployeeCode(company.id);
    employee = await db.employee.create({
      data: {
        employeeCode,
        companyId: company.id,
        employeeName: payload.name,
        designation: payload.designation,
        department: payload.department,
        mobileNumber: payload.mobileNumber,
        email: payload.email,
        username,
        passwordHash: await hashPassword(payload.mobileNumber),
        mobileVerifiedAt: new Date(),
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
    otpVerified: true,
  });
  await logOtpAudit(company.id, "otp_verification_success", request, {
    employeeId: employee.id,
    metadata: { flow: "signup" },
  });
  await logOtpAudit(company.id, "employee_signup_completed", request, {
    employeeId: employee.id,
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
      message: "Profile verified. Starting your interview…",
    },
  };
}

async function findEmployeeByIdentifier(
  companyId: string,
  identifier: string
) {
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
    },
  });
}

const GENERIC_SIGNIN_MESSAGE = "If this account exists, an OTP has been sent.";

export async function requestSigninOtp(
  body: { companySlug: string; identifier?: string },
  request?: Request
): Promise<{ ok: true; data: OtpRequestSuccess } | { ok: false; status: number; error: string }> {
  const company = await findCompanyBySlug(body.companySlug);
  if (!company) {
    return {
      ok: true,
      data: { ok: true, maskedMobile: "******0000", message: GENERIC_SIGNIN_MESSAGE },
    };
  }

  const identifier = body.identifier?.trim() ?? "";
  if (!identifier) {
    return { ok: false, status: 400, error: "Enter your mobile number or email." };
  }

  const employee = await findEmployeeByIdentifier(company.id, identifier);

  if (!employee || !isEmployeeActive(employee.accountStatus)) {
    await logOtpAudit(company.id, "signin_otp_requested", request, {
      metadata: { found: false },
    });
    return {
      ok: true,
      data: { ok: true, maskedMobile: "******0000", message: GENERIC_SIGNIN_MESSAGE },
    };
  }

  const targetMobile = employee.mobileNumber;
  const { pepper } = getOtpConfig();
  const mobileHash = hashMobileNumber(targetMobile, pepper);
  const meta = getClientMeta(request);

  const cooldown = await checkResendCooldown(company.id, mobileHash, "EMPLOYEE_LOGIN");
  if (!cooldown.allowed) {
    await logOtpAudit(company.id, "rate_limit_blocked", request, {
      employeeId: employee.id,
      metadata: { flow: "signin", reason: "resend_cooldown" },
    });
    return { ok: false, status: 429, error: "Please wait before requesting another OTP." };
  }

  const rate = await checkRateLimits({
    companyId: company.id,
    mobileHash,
    employeeId: employee.id,
    ipAddress: meta.ipAddress,
  });
  if (!rate.allowed) {
    await logOtpAudit(company.id, "rate_limit_blocked", request, {
      employeeId: employee.id,
      metadata: { flow: "signin", reason: rate.reason },
    });
    return { ok: false, status: 429, error: "Too many OTP requests. Please try again later." };
  }

  await logOtpAudit(company.id, "signin_otp_requested", request, { employeeId: employee.id });

  const otp = generateOtpCode();
  const otpHash = await hashOtp(otp);

  await createOtpRecord({
    companyId: company.id,
    employeeId: employee.id,
    purpose: "EMPLOYEE_LOGIN",
    mobileNumber: targetMobile,
    mobileHash,
    otpHash,
    request,
  });

  const sms = await sendOtp({
    to: targetMobile,
    otp,
    purpose: "EMPLOYEE_LOGIN",
    companyName: company.name,
  });

  if (!sms.delivered) {
    await logOtpAudit(company.id, "otp_send_failed", request, {
      employeeId: employee.id,
      metadata: { flow: "signin", provider: sms.provider },
    });
    return { ok: false, status: 503, error: "Could not send OTP. Please try again shortly." };
  }

  await logOtpAudit(company.id, "otp_sent", request, {
    employeeId: employee.id,
    metadata: { flow: "signin", provider: sms.provider },
  });

  return {
    ok: true,
    data: {
      ok: true,
      maskedMobile: maskMobileNumber(targetMobile),
      message: GENERIC_SIGNIN_MESSAGE,
    },
  };
}

export async function verifySigninOtp(
  body: { companySlug: string; identifier?: string; otp?: string },
  request?: Request
): Promise<
  | { ok: true; data: OtpVerifySuccess; sessionToken: string }
  | { ok: false; status: number; error: string }
> {
  const company = await findCompanyBySlug(body.companySlug);
  if (!company) {
    return { ok: false, status: 400, error: "Invalid or expired OTP." };
  }

  const identifier = body.identifier?.trim() ?? "";
  const otp = body.otp?.trim() ?? "";

  if (!identifier || !/^\d{6}$/.test(otp)) {
    return { ok: false, status: 400, error: "Invalid or expired OTP." };
  }

  const employee = await findEmployeeByIdentifier(company.id, identifier);
  if (!employee || !isEmployeeActive(employee.accountStatus)) {
    await logOtpAudit(company.id, "otp_verification_failed", request, {
      metadata: { flow: "signin", reason: "employee_not_found" },
    });
    return { ok: false, status: 400, error: "Invalid or expired OTP." };
  }

  const { pepper, maxAttempts } = getOtpConfig();
  const mobileHash = hashMobileNumber(employee.mobileNumber, pepper);

  const record = await db.otpVerification.findFirst({
    where: {
      companyId: company.id,
      employeeId: employee.id,
      mobileNumberHash: mobileHash,
      purpose: "EMPLOYEE_LOGIN",
      consumedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    await logOtpAudit(company.id, "otp_verification_failed", request, {
      employeeId: employee.id,
      metadata: { flow: "signin", reason: "not_found" },
    });
    return { ok: false, status: 400, error: "Invalid or expired OTP." };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    return { ok: false, status: 400, error: "Invalid or expired OTP." };
  }

  if (record.attempts >= maxAttempts) {
    await logOtpAudit(company.id, "too_many_otp_attempts", request, {
      employeeId: employee.id,
      metadata: { flow: "signin" },
    });
    return { ok: false, status: 429, error: "Too many attempts. Please request a new OTP." };
  }

  const valid = await verifyOtpHash(otp, record.otpHash);
  if (!valid) {
    await db.otpVerification.update({
      where: { id: record.id },
      data: { attempts: record.attempts + 1 },
    });
    await logOtpAudit(company.id, "otp_verification_failed", request, {
      employeeId: employee.id,
      metadata: { flow: "signin", reason: "wrong_code" },
    });
    return { ok: false, status: 400, error: "Invalid or expired OTP." };
  }

  await db.otpVerification.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  await db.employee.update({
    where: { id: employee.id },
    data: {
      mobileVerifiedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await logEmployeeAuth(employee.id, "login_success", request, { otpVerified: true });
  await logOtpAudit(company.id, "otp_verification_success", request, {
    employeeId: employee.id,
    metadata: { flow: "signin" },
  });
  await logOtpAudit(company.id, "employee_signin_completed", request, {
    employeeId: employee.id,
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
      message: "Welcome back. Resuming your interview…",
    },
  };
}

export function attachSessionCookie(
  response: import("next/server").NextResponse,
  sessionToken: string
): void {
  response.cookies.set(employeeSessionCookieOptions(sessionToken));
}
