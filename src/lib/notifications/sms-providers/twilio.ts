import type { SmsDeliveryAttempt } from "./types";

const MAX_SMS_LEN = 160;

export async function sendOtpViaTwilio(mobile: string, body: string): Promise<SmsDeliveryAttempt> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_PHONE_NUMBER?.trim();
  if (!accountSid || !authToken || !from) {
    return { ok: false, error: "Twilio is not configured." };
  }

  const to = mobile.startsWith("+") ? mobile : `+91${mobile}`;
  const params = new URLSearchParams({
    To: to,
    From: from,
    Body: body.slice(0, MAX_SMS_LEN),
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error("[Twilio OTP SMS failed]", res.status, errText);
    try {
      const parsed = JSON.parse(errText) as { message?: string };
      return { ok: false, provider: "twilio", error: parsed.message ?? "SMS delivery failed." };
    } catch {
      return { ok: false, provider: "twilio", error: "SMS delivery failed." };
    }
  }

  return { ok: true, provider: "twilio" };
}
