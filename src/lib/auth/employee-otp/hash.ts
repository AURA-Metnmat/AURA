import { createHash, randomInt, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { getOtpConfig } from "./config";

const BCRYPT_ROUNDS = 10;

export function generateOtpCode(): string {
  return String(randomInt(100000, 999999));
}

export async function hashOtp(otp: string): Promise<string> {
  const { pepper } = getOtpConfig();
  const material = `${pepper}:${otp}`;
  const prehash = createHash("sha256").update(material).digest("hex");
  return bcrypt.hash(prehash, BCRYPT_ROUNDS);
}

export async function verifyOtpHash(otp: string, otpHash: string): Promise<boolean> {
  const { pepper } = getOtpConfig();
  const material = `${pepper}:${otp}`;
  const prehash = createHash("sha256").update(material).digest("hex");
  return bcrypt.compare(prehash, otpHash);
}

export function safeEqualStrings(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
