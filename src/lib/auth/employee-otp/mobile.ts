import { createHash } from "crypto";

/** Store 10-digit Indian mobile internally; accept +91 / 91 prefixes in input. */
export function normalizeMobileNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(-10);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(-10);
  }
  return digits.slice(-10);
}

export function toE164Indian(mobile10: string): string {
  return `+91${mobile10}`;
}

export function isValidMobileNumber(mobile: string): boolean {
  const normalized = normalizeMobileNumber(mobile);
  return /^[6-9]\d{9}$/.test(normalized);
}

export function hashMobileNumber(mobile10: string, pepper: string): string {
  return createHash("sha256").update(`${pepper}:${mobile10}`).digest("hex");
}

export function maskMobileNumber(mobile10: string): string {
  const last4 = mobile10.slice(-4);
  return `******${last4}`;
}

export function parseIdentifier(identifier: string): "email" | "mobile" {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) return "email";
  return "mobile";
}
