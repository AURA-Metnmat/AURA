const MAX_SMS_LEN = 160;

export type OtpDeliveryMethod = "sms" | "email" | "dev";

export interface OtpDeliveryResult {
  delivered: boolean;
  method: OtpDeliveryMethod | null;
  devLogged: boolean;
  smsError?: string;
}

async function sendSmsTwilio(mobile: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_PHONE_NUMBER?.trim();
  if (!accountSid || !authToken || !from) {
    return { ok: false, error: "SMS service is not configured." };
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
      return { ok: false, error: parsed.message ?? "SMS delivery failed." };
    } catch {
      return { ok: false, error: "SMS delivery failed." };
    }
  }

  return { ok: true };
}

async function sendEmailResend(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "AURA <onboarding@resend.dev>";
  if (!apiKey) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[Resend OTP email failed]", res.status, errText);
  }

  return res.ok;
}

function buildOtpEmailHtml(companyName: string, code: string): string {
  return `
    <p>Your <strong>${companyName}</strong> AURA verification code is:</p>
    <p style="font-size:28px;font-weight:bold;letter-spacing:4px;margin:16px 0;">${code}</p>
    <p>This code expires in 10 minutes. Do not share it with anyone.</p>
  `.trim();
}

export async function deliverEmployeeOtp(options: {
  companyName: string;
  mobileNumber: string;
  code: string;
  purpose: "register" | "login";
  email?: string | null;
}): Promise<OtpDeliveryResult> {
  const { companyName, mobileNumber, code, purpose, email } = options;
  const action = purpose === "register" ? "registration" : "sign-in";
  const smsBody = `${companyName}: Your AURA verification code is ${code}. Valid for 10 minutes. Do not share.`;

  const sms = await sendSmsTwilio(mobileNumber, smsBody);
  if (sms.ok) {
    return { delivered: true, method: "sms", devLogged: false };
  }

  const trimmedEmail = email?.trim();
  if (trimmedEmail) {
    const emailSent = await sendEmailResend(
      trimmedEmail,
      `${companyName} — AURA verification code`,
      buildOtpEmailHtml(companyName, code)
    );
    if (emailSent) {
      return { delivered: true, method: "email", devLogged: false };
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(`[AURA OTP — dev only] ${action} for ${mobileNumber}: ${code}`);
    return { delivered: true, method: "dev", devLogged: true };
  }

  return {
    delivered: false,
    method: null,
    devLogged: false,
    smsError: sms.error,
  };
}
