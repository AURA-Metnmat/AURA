import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/auth/client-ip";
import { resolveInterviewAccessByToken } from "@/lib/campaigns/resolve";

const TOKEN_LOOKUP_LIMIT = 60;
const tokenLookupByIp = new Map<string, { count: number; resetAt: number }>();

function checkTokenLookupRate(ip: string): boolean {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  const state = tokenLookupByIp.get(ip);
  if (!state || now > state.resetAt) {
    tokenLookupByIp.set(ip, { count: 1, resetAt: now + hourMs });
    return true;
  }
  if (state.count >= TOKEN_LOOKUP_LIMIT) return false;
  state.count += 1;
  return true;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const ip = getClientIp(request);
  if (!checkTokenLookupRate(ip)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
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
