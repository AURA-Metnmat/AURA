import type { OtpPurpose } from "./types";
import { getOtpConfig } from "./config";
import { toE164Indian } from "./mobile";
import { mapMsg91ErrorToUserMessage, type Msg91OtpResponse } from "./msg91-errors";

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
  statusCode?: number;
}

function shouldUseDevFallback(): boolean {
  // Dev fallback logs the OTP to the server console and reports it as
  // "delivered". That is for local development ONLY. In production, an SMS
  // delivery failure must surface as a real failure — never be masked by a
  // logged code (which would also expose OTPs in production logs).
  return process.env.NODE_ENV !== "production";
}

async function parseMsg91Response(res: Response): Promise<Msg91OtpResponse | null> {
  try {
    return (await res.json()) as Msg91OtpResponse;
  } catch {
    return null;
  }
}

async function sendViaMsg91(mobile10: string, otp: string): Promise<SendOtpResult> {
  const { msg91AuthKey, msg91TemplateId, expiryMinutes } = getOtpConfig();

  if (!msg91AuthKey) {
    return {
      delivered: false,
      provider: "msg91",
      error: mapMsg91ErrorToUserMessage("invalid authkey"),
      statusCode: 401,
    };
  }

  if (!msg91TemplateId) {
    return {
      delivered: false,
      provider: "msg91",
      error: mapMsg91ErrorToUserMessage("template id missing"),
      statusCode: 400,
    };
  }

  const params = new URLSearchParams({
    template_id: msg91TemplateId,
    mobile: `91${mobile10}`,
    otp,
    otp_length: String(otp.length),
    otp_expiry: String(expiryMinutes),
  });

  const res = await fetch(`https://control.msg91.com/api/v5/otp?${params.toString()}`, {
    method: "POST",
    headers: {
      authkey: msg91AuthKey,
      accept: "application/json",
      "content-type": "application/json",
    },
  });

  const data = await parseMsg91Response(res);
  const success = res.ok && data?.type === "success";

  if (!success) {
    const providerMessage = data?.message ?? (await res.text().catch(() => ""));
    console.error("[MSG91 OTP failed]", {
      httpStatus: res.status,
      type: data?.type,
      message: String(providerMessage).slice(0, 300),
    });
    return {
      delivered: false,
      provider: "msg91",
      error: mapMsg91ErrorToUserMessage(
        typeof providerMessage === "string" ? providerMessage : data?.message,
        res.status
      ),
      statusCode: res.status,
    };
  }

  return { delivered: true, provider: "msg91" };
}

async function sendViaDev(mobile10: string, otp: string, purpose: OtpPurpose): Promise<SendOtpResult> {
  console.info(
    `[AURA mobile OTP — dev] ${purpose} → ${toE164Indian(mobile10)} code=${otp} (ending ${mobile10.slice(-4)})`
  );
  return { delivered: true, provider: "dev", devLogged: true };
}

export async function sendOtp(params: SendOtpParams): Promise<SendOtpResult> {
  const { to, otp, purpose } = params;
  const { provider } = getOtpConfig();

  if (provider === "dev" || provider === "console") {
    return sendViaDev(to, otp, purpose);
  }

  const result = await sendViaMsg91(to, otp);
  if (result.delivered) return result;

  if (shouldUseDevFallback()) {
    return sendViaDev(to, otp, purpose);
  }

  return result;
}
