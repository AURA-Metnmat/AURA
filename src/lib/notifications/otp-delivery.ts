import { sendOtpSms } from "./sms-providers";

export type OtpDeliveryMethod = "sms" | "dev";

export interface OtpDeliveryResult {
  delivered: boolean;
  method: OtpDeliveryMethod | null;
  devLogged: boolean;
  smsError?: string;
  smsProvider?: string;
}

export function buildOtpDeliveryFailureMessage(smsError?: string): string {
  if (!smsError || smsError === "SMS service is not configured on the server.") {
    return "SMS OTP is not configured yet. Ask your administrator to set up Fast2SMS or MSG91.";
  }

  const lower = smsError.toLowerCase();
  if (lower.includes("unverified") && lower.includes("twilio")) {
    return "SMS could not be delivered. Configure Fast2SMS or MSG91 for reliable Indian mobile OTP.";
  }

  if (lower.includes("insufficient") || lower.includes("wallet") || lower.includes("balance")) {
    return "SMS credits are low on the provider account. Please contact your administrator.";
  }

  return "Could not send OTP to your mobile number. Please try again in a moment.";
}

export async function deliverEmployeeOtp(options: {
  companyName: string;
  mobileNumber: string;
  code: string;
  purpose: "register" | "login";
}): Promise<OtpDeliveryResult> {
  const { companyName, mobileNumber, code, purpose } = options;
  const action = purpose === "register" ? "registration" : "sign-in";

  const sms = await sendOtpSms({ mobileNumber, code, companyName });
  if (sms.ok) {
    return {
      delivered: true,
      method: "sms",
      devLogged: false,
      smsProvider: sms.provider,
    };
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(`[AURA OTP — dev only] ${action} for +91${mobileNumber}: ${code}`);
    return { delivered: true, method: "dev", devLogged: true };
  }

  return {
    delivered: false,
    method: null,
    devLogged: false,
    smsError: sms.error,
  };
}
