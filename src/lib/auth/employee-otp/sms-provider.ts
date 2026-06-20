import type { OtpPurpose } from "./types";
import { getOtpConfig } from "./config";
import { toE164Indian } from "./mobile";

export interface SendOtpParams {
  to: string;
  otp: string;
  purpose: OtpPurpose;
  companyName: string;
}

export interface SendOtpResult {
  delivered: boolean;
  provider: string;
  devLogged?: boolean;
  error?: string;
}

async function sendViaFast2Sms(mobile10: string, otp: string): Promise<SendOtpResult> {
  const { smsApiKey } = getOtpConfig();
  if (!smsApiKey) {
    return { delivered: false, provider: "fast2sms", error: "SMS API key not configured" };
  }

  const numbers = `91${mobile10}`;
  const body = new URLSearchParams({
    route: "otp",
    variables_values: otp,
    numbers,
  });

  const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: smsApiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[Fast2SMS OTP failed]", res.status, text.slice(0, 200));
    return { delivered: false, provider: "fast2sms", error: "SMS delivery failed" };
  }

  try {
    const data = (await res.json()) as { return?: boolean; message?: string | string[] };
    const ok = data.return === true;
    if (!ok) {
      const msg = Array.isArray(data.message) ? data.message.join(" ") : data.message;
      console.error("[Fast2SMS OTP rejected]", msg);
      return { delivered: false, provider: "fast2sms", error: "SMS delivery failed" };
    }
    return { delivered: true, provider: "fast2sms" };
  } catch {
    return { delivered: true, provider: "fast2sms" };
  }
}

async function sendViaDev(mobile10: string, otp: string, purpose: OtpPurpose): Promise<SendOtpResult> {
  if (process.env.NODE_ENV === "production") {
    return { delivered: false, provider: "dev", error: "Dev provider disabled in production" };
  }
  console.info(
    `[AURA mobile OTP — dev only] ${purpose} → ${toE164Indian(mobile10)} (ending ${mobile10.slice(-4)})`
  );
  return { delivered: true, provider: "dev", devLogged: true };
}

export async function sendOtp(params: SendOtpParams): Promise<SendOtpResult> {
  const { to, otp, purpose } = params;
  const { provider } = getOtpConfig();

  if (provider === "dev" || provider === "console") {
    return sendViaDev(to, otp, purpose);
  }

  if (provider === "fast2sms") {
    const result = await sendViaFast2Sms(to, otp);
    if (result.delivered) return result;
    if (process.env.NODE_ENV !== "production") {
      return sendViaDev(to, otp, purpose);
    }
    return result;
  }

  // Unknown provider — try Fast2SMS then dev fallback
  const fast = await sendViaFast2Sms(to, otp);
  if (fast.delivered) return fast;
  if (process.env.NODE_ENV !== "production") {
    return sendViaDev(to, otp, purpose);
  }
  return fast;
}
