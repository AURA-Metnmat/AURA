import type { SmsDeliveryAttempt } from "./types";

function normalizeIndianMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export async function sendOtpViaFast2Sms(
  mobile: string,
  code: string
): Promise<SmsDeliveryAttempt> {
  const apiKey = process.env.FAST2SMS_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "Fast2SMS is not configured." };
  }

  const numbers = normalizeIndianMobile(mobile);
  if (!/^\d{10}$/.test(numbers)) {
    return { ok: false, error: "Invalid mobile number for SMS." };
  }

  const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      route: "otp",
      variables_values: code,
      numbers,
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    console.error("[Fast2SMS OTP failed]", res.status, raw);
    return { ok: false, provider: "fast2sms", error: "SMS delivery failed." };
  }

  try {
    const parsed = JSON.parse(raw) as { return?: boolean; message?: string | string[] };
    if (parsed.return === true) {
      return { ok: true, provider: "fast2sms" };
    }
    const message = Array.isArray(parsed.message)
      ? parsed.message.join(" ")
      : parsed.message ?? "SMS delivery failed.";
    console.error("[Fast2SMS OTP rejected]", message);
    return { ok: false, provider: "fast2sms", error: message };
  } catch {
    console.error("[Fast2SMS OTP parse error]", raw);
    return { ok: false, provider: "fast2sms", error: "SMS delivery failed." };
  }
}
