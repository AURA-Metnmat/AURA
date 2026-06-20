import { sendOtpViaFast2Sms } from "./fast2sms";
import { sendOtpViaMsg91 } from "./msg91";
import { sendOtpViaTwilio } from "./twilio";
import type { SmsDeliveryAttempt, SmsProviderName } from "./types";

function configuredProviders(): SmsProviderName[] {
  const preferred = process.env.SMS_OTP_PROVIDER?.trim().toLowerCase();
  const all: SmsProviderName[] = ["fast2sms", "msg91", "twilio"];

  if (preferred === "fast2sms" || preferred === "msg91" || preferred === "twilio") {
    return [preferred, ...all.filter((p) => p !== preferred)];
  }

  const ordered: SmsProviderName[] = [];
  if (process.env.FAST2SMS_API_KEY?.trim()) ordered.push("fast2sms");
  if (process.env.MSG91_AUTH_KEY?.trim()) ordered.push("msg91");
  if (process.env.TWILIO_ACCOUNT_SID?.trim()) ordered.push("twilio");

  return ordered.length > 0 ? ordered : all;
}

function isConfigured(provider: SmsProviderName): boolean {
  switch (provider) {
    case "fast2sms":
      return !!process.env.FAST2SMS_API_KEY?.trim();
    case "msg91":
      return !!process.env.MSG91_AUTH_KEY?.trim();
    case "twilio":
      return !!(
        process.env.TWILIO_ACCOUNT_SID?.trim() &&
        process.env.TWILIO_AUTH_TOKEN?.trim() &&
        process.env.TWILIO_PHONE_NUMBER?.trim()
      );
    default: {
      const never: never = provider;
      return never;
    }
  }
}

export async function sendOtpSms(options: {
  mobileNumber: string;
  code: string;
  companyName: string;
}): Promise<SmsDeliveryAttempt> {
  const { mobileNumber, code, companyName } = options;
  const smsBody = `${companyName}: Your AURA verification code is ${code}. Valid for 10 minutes. Do not share.`;
  const providers = configuredProviders().filter(isConfigured);

  if (providers.length === 0) {
    return { ok: false, error: "SMS service is not configured on the server." };
  }

  let lastError = "SMS delivery failed.";
  for (const provider of providers) {
    let attempt: SmsDeliveryAttempt;
    switch (provider) {
      case "fast2sms":
        attempt = await sendOtpViaFast2Sms(mobileNumber, code);
        break;
      case "msg91":
        attempt = await sendOtpViaMsg91(mobileNumber, code, companyName);
        break;
      case "twilio":
        attempt = await sendOtpViaTwilio(mobileNumber, smsBody);
        break;
      default: {
        const never: never = provider;
        attempt = { ok: false, error: `Unknown provider: ${never}` };
      }
    }

    if (attempt.ok) return attempt;
    if (attempt.error) lastError = attempt.error;
  }

  return { ok: false, error: lastError };
}
