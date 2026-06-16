const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeMobileNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(-10);
  }
  return digits.slice(-10);
}

export function isValidMobileNumber(mobile: string): boolean {
  return /^\d{10}$/.test(normalizeMobileNumber(mobile));
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function sanitizeEmployeeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function sanitizeTextInput(value: string, maxLen = 200): string {
  return value.trim().slice(0, maxLen);
}

export function sanitizeDesignation(value: string): string {
  return sanitizeTextInput(value, 120);
}

export function isValidDesignation(designation: string): boolean {
  const cleaned = sanitizeDesignation(designation);
  return cleaned.length >= 2;
}
