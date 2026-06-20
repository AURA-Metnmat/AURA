import { createHmac, randomInt, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { env } from "@/lib/env";
import { db } from "@/lib/db";

export type OtpPurpose = "register" | "login";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_VERIFY_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 10;

export interface OtpVerificationPayload {
  companyId: string;
  mobileNumber: string;
  purpose: OtpPurpose;
  exp: number;
}

function generateOtpCode(): string {
  return String(randomInt(100000, 999999));
}

export async function createAndStoreOtp(
  companyId: string,
  mobileNumber: string,
  purpose: OtpPurpose
): Promise<{ code: string; expiresAt: Date }> {
  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.employeeOtp.deleteMany({
    where: { companyId, mobileNumber, purpose },
  });

  await db.employeeOtp.create({
    data: {
      companyId,
      mobileNumber,
      codeHash,
      purpose,
      expiresAt,
    },
  });

  return { code, expiresAt };
}

export async function verifyOtpCode(
  companyId: string,
  mobileNumber: string,
  purpose: OtpPurpose,
  code: string
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const record = await db.employeeOtp.findFirst({
    where: { companyId, mobileNumber, purpose },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { ok: false, error: "No OTP found. Request a new code." };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await db.employeeOtp.delete({ where: { id: record.id } });
    return { ok: false, error: "OTP expired. Request a new code." };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await db.employeeOtp.delete({ where: { id: record.id } });
    return { ok: false, error: "Too many attempts. Request a new code." };
  }

  const valid = await bcrypt.compare(code, record.codeHash);
  if (!valid) {
    await db.employeeOtp.update({
      where: { id: record.id },
      data: { attempts: record.attempts + 1 },
    });
    return { ok: false, error: "Invalid OTP. Please try again." };
  }

  await db.employeeOtp.delete({ where: { id: record.id } });
  const token = createOtpVerificationToken(companyId, mobileNumber, purpose);
  return { ok: true, token };
}

export function createOtpVerificationToken(
  companyId: string,
  mobileNumber: string,
  purpose: OtpPurpose
): string {
  const secret = env().sessionSecret;
  const exp = Date.now() + OTP_VERIFY_TTL_MS;
  const payload = Buffer.from(
    JSON.stringify({ companyId, mobileNumber, purpose, exp })
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyOtpVerificationToken(
  token: string,
  expectedCompanyId: string,
  expectedMobile: string,
  expectedPurpose: OtpPurpose
): OtpVerificationPayload | null {
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
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as OtpVerificationPayload;
    if (
      typeof data.companyId !== "string" ||
      typeof data.mobileNumber !== "string" ||
      typeof data.purpose !== "string" ||
      typeof data.exp !== "number" ||
      data.exp <= Date.now() ||
      data.companyId !== expectedCompanyId ||
      data.mobileNumber !== expectedMobile ||
      data.purpose !== expectedPurpose
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
