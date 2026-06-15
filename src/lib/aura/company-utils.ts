import { randomBytes } from "crypto";

export function generateInviteToken(): string {
  return randomBytes(16).toString("hex");
}

export function getInterviewLink(token: string, request?: Request): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (request ? new URL(request.url).origin : "");
  if (!base) {
    throw new Error("NEXT_PUBLIC_APP_URL is not configured");
  }
  return `${base}/interview/c/${token}`;
}

export const COMPANY_CATEGORIES = [
  "Manufacturing",
  "Steel & Metals",
  "Mining",
  "Energy",
  "Healthcare",
  "Finance",
  "Retail",
  "Technology",
  "Logistics",
  "Other",
] as const;
