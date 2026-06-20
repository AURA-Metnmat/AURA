import type { OtpPurpose } from "./types";
import { sendOtp } from "./sms-provider";

export interface DeliverOtpParams {
  otp: string;
  purpose: OtpPurpose;
  companyName: string;
  mobileNumber: string;
}

export interface DeliverOtpResult {
  delivered: boolean;
  provider: string;
  message: string;
  maskedMobile?: string;
  statusCode?: number;
  error?: string;
}

export async function deliverOtpCode(params: DeliverOtpParams): Promise<DeliverOtpResult> {
  const { otp, purpose, companyName, mobileNumber } = params;
  const maskedMobile = `******${mobileNumber.slice(-4)}`;

  const sms = await sendOtp({
    to: mobileNumber,
    otp,
    purpose,
    companyName,
  });

  if (sms.delivered) {
    return {
      delivered: true,
      provider: sms.provider,
      maskedMobile,
      message: `OTP sent to your mobile number ending with ${mobileNumber.slice(-4)}.`,
    };
  }

  return {
    delivered: false,
    provider: sms.provider,
    maskedMobile,
    statusCode: sms.statusCode,
    error: sms.error,
    message: "",
  };
}
