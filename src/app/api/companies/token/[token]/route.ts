import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/auth/client-ip";
import { checkRateLimitBucket } from "@/lib/auth/db-rate-limit";
import { resolveInterviewAccessByToken } from "@/lib/campaigns/resolve";

const TOKEN_LOOKUP_LIMIT = 60;
const TOKEN_WINDOW_MS = 60 * 60 * 1000;
const TOKEN_LOCKOUT_MS = 15 * 60 * 1000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const ip = getClientIp(request);
  const rate = await checkRateLimitBucket(
    `invite_token:${ip}`,
    TOKEN_LOOKUP_LIMIT,
    TOKEN_WINDOW_MS,
    TOKEN_LOCKOUT_MS
  );
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  const access = await resolveInterviewAccessByToken(token);
  if (!access) {
    return NextResponse.json({ error: "Invalid or expired interview link" }, { status: 404 });
  }

  return NextResponse.json({
    company: access.company,
    campaign: access.campaign,
  });
}
