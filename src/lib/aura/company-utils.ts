import { randomBytes } from "crypto";
import { getInterviewLink as buildInterviewLink } from "@/lib/app-url";

export function generateInviteToken(): string {
  return randomBytes(16).toString("hex");
}

export function slugifyCompanyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getInterviewLink(token: string, request?: Request): string {
  return buildInterviewLink(token, request);
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
