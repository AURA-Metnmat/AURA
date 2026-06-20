import { db } from "@/lib/db";
import {
  isValidEmail,
  normalizeEmail,
  sanitizeDesignation,
  sanitizeEmployeeName,
  sanitizeTextInput,
} from "@/lib/employees/validation";
import { isValidMobileNumber, normalizeMobileNumber } from "./mobile";
import type { RegistrationMode } from "./types";

export interface CompanyAuthPolicy {
  id: string;
  slug: string;
  name: string;
  inviteToken: string;
  isActive: boolean;
  allowEmployeeSelfRegistration: boolean;
  requireMobileOtpForEmployeeLogin: boolean;
  allowedEmailDomains: string | null;
  registrationMode: RegistrationMode;
}

export async function findCompanyBySlug(slug: string): Promise<CompanyAuthPolicy | null> {
  const company = await db.company.findFirst({
    where: { slug: slug.trim(), isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      inviteToken: true,
      isActive: true,
      allowEmployeeSelfRegistration: true,
      requireMobileOtpForEmployeeLogin: true,
      allowedEmailDomains: true,
      registrationMode: true,
    },
  });
  if (!company) return null;
  return {
    ...company,
    registrationMode: (company.registrationMode as RegistrationMode) || "OPEN",
  };
}

export function isEmailDomainAllowed(email: string, allowedCsv: string | null): boolean {
  if (!allowedCsv?.trim()) return true;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  const allowed = allowedCsv
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(domain);
}

export function validateSignupFields(body: {
  name?: string;
  designation?: string;
  department?: string;
  email?: string;
  mobileNumber?: string;
}):
  | { ok: true; data: { name: string; designation: string; department: string; email: string; mobileNumber: string } }
  | { ok: false; error: string } {
  const name = sanitizeEmployeeName(body.name ?? "");
  const designation = sanitizeDesignation(body.designation ?? "");
  const department = sanitizeTextInput(body.department ?? "", 120);
  const email = normalizeEmail(body.email ?? "");
  const mobileNumber = normalizeMobileNumber(body.mobileNumber ?? "");

  if (!name || name.length < 2) {
    return { ok: false, error: "Employee name is required." };
  }
  if (!designation || designation.length < 2) {
    return { ok: false, error: "Designation is required." };
  }
  if (!department || department.length < 2) {
    return { ok: false, error: "Department is required." };
  }
  if (!isValidEmail(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (!isValidMobileNumber(mobileNumber)) {
    return { ok: false, error: "Enter a valid 10-digit mobile number." };
  }

  return { ok: true, data: { name, designation, department, email, mobileNumber } };
}

export function isEmployeeActive(status: string): boolean {
  const s = status.toUpperCase();
  return s === "ACTIVE" || s === "active";
}
