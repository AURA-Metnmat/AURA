import type { RegistrationMode } from "@/lib/auth/employee-otp/types";
import { isEmailDomainAllowed } from "@/lib/auth/employee-otp/company-policy";

export const REGISTRATION_MODES = ["OPEN", "INVITE_ONLY", "CLOSED"] as const;

export const REGISTRATION_MODE_LABELS: Record<RegistrationMode, string> = {
  OPEN: "Open — anyone with the link can register",
  INVITE_ONLY: "Invite only — valid interview link required",
  CLOSED: "Closed — sign in only, no new registrations",
};

export interface RegistrationPolicyFields {
  allowEmployeeSelfRegistration: boolean;
  requireMobileOtpForEmployeeLogin: boolean;
  allowedEmailDomains: string | null;
  registrationMode: RegistrationMode;
}

export interface PublicRegistrationPolicy {
  registrationMode: RegistrationMode;
  allowSelfRegistration: boolean;
  allowedEmailDomains: string | null;
  domainHint: string | null;
}

export function isRegistrationMode(value: string): value is RegistrationMode {
  return (REGISTRATION_MODES as readonly string[]).includes(value);
}

export function normalizeAllowedEmailDomains(input: string): string | null {
  const domains = input
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@+/, ""))
    .filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(d));
  if (domains.length === 0) return null;
  return [...new Set(domains)].join(",");
}

export function parseRegistrationPolicyUpdate(body: {
  allowEmployeeSelfRegistration?: boolean;
  requireMobileOtpForEmployeeLogin?: boolean;
  allowedEmailDomains?: string | null;
  registrationMode?: string;
}):
  | { ok: true; data: Partial<RegistrationPolicyFields> }
  | { ok: false; error: string } {
  const data: Partial<RegistrationPolicyFields> = {};

  if (body.allowEmployeeSelfRegistration !== undefined) {
    data.allowEmployeeSelfRegistration = Boolean(body.allowEmployeeSelfRegistration);
  }
  if (body.requireMobileOtpForEmployeeLogin !== undefined) {
    data.requireMobileOtpForEmployeeLogin = Boolean(body.requireMobileOtpForEmployeeLogin);
  }
  if (body.allowedEmailDomains !== undefined) {
    if (body.allowedEmailDomains === null || body.allowedEmailDomains.trim() === "") {
      data.allowedEmailDomains = null;
    } else {
      const normalized = normalizeAllowedEmailDomains(body.allowedEmailDomains);
      if (!normalized) {
        return { ok: false, error: "Enter valid email domains (e.g. acme.com, acme.in)" };
      }
      data.allowedEmailDomains = normalized;
    }
  }
  if (body.registrationMode !== undefined) {
    const mode = body.registrationMode.trim().toUpperCase();
    if (!isRegistrationMode(mode)) {
      return { ok: false, error: "Invalid registration mode." };
    }
    data.registrationMode = mode;
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, error: "No registration policy fields to update." };
  }

  return { ok: true, data };
}

export function isSelfRegistrationAllowed(policy: RegistrationPolicyFields): boolean {
  return policy.allowEmployeeSelfRegistration && policy.registrationMode !== "CLOSED";
}

export function canRegisterOnInterviewLink(
  policy: RegistrationPolicyFields,
  hasInviteToken: boolean
): boolean {
  if (!isSelfRegistrationAllowed(policy)) return false;
  if (policy.registrationMode === "INVITE_ONLY") return hasInviteToken;
  return true;
}

export function formatDomainHint(allowedEmailDomains: string | null): string | null {
  if (!allowedEmailDomains?.trim()) return null;
  const domains = allowedEmailDomains.split(",").map((d) => d.trim()).filter(Boolean);
  if (domains.length === 0) return null;
  if (domains.length === 1) return `Use your @${domains[0]} email address.`;
  return `Allowed domains: ${domains.map((d) => `@${d}`).join(", ")}`;
}

export function canRegisterWithPublicPolicy(
  policy: PublicRegistrationPolicy,
  hasInviteToken: boolean
): boolean {
  if (!policy.allowSelfRegistration) return false;
  if (policy.registrationMode === "INVITE_ONLY") return hasInviteToken;
  return true;
}

export function toPublicRegistrationPolicy(
  policy: RegistrationPolicyFields
): PublicRegistrationPolicy {
  return {
    registrationMode: policy.registrationMode,
    allowSelfRegistration: isSelfRegistrationAllowed(policy),
    allowedEmailDomains: policy.allowedEmailDomains,
    domainHint: formatDomainHint(policy.allowedEmailDomains),
  };
}

export function validateEmailAgainstPolicy(
  email: string,
  allowedEmailDomains: string | null
): boolean {
  return isEmailDomainAllowed(email, allowedEmailDomains);
}
