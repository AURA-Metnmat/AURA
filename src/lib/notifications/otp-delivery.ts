const MAX_SMS_LEN = 160;

export type OtpDeliveryMethod = "sms" | "email" | "dev";

export interface OtpDeliveryResult {
  delivered: boolean;
  method: OtpDeliveryMethod | null;
  devLogged: boolean;
  smsError?: string;
  emailError?: string;
  deliveryNote?: string;
}

interface DeliveryAttempt {
  ok: boolean;
  error?: string;
}

async function sendSmsTwilio(mobile: string, body: string): Promise<DeliveryAttempt> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_PHONE_NUMBER?.trim();
  if (!accountSid || !authToken || !from) {
    return { ok: false, error: "SMS service is not configured on the server." };
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
      const parsed = JSON.parse(errText) as { message?: string; code?: number };
      return { ok: false, error: parsed.message ?? "SMS delivery failed." };
    } catch {
      return { ok: false, error: "SMS delivery failed." };
    }
  }

  return { ok: true };
}

function isResendSandboxRestriction(errorText: string): boolean {
  const lower = errorText.toLowerCase();
  return (
    lower.includes("only send testing emails to your own email") ||
    lower.includes("verify a domain at resend.com/domains")
  );
}

async function sendEmailResend(
  to: string,
  subject: string,
  html: string
): Promise<DeliveryAttempt> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "AURA <onboarding@resend.dev>";
  if (!apiKey) {
    return { ok: false, error: "Email service is not configured on the server." };
  }

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
    try {
      const parsed = JSON.parse(errText) as { message?: string };
      return { ok: false, error: parsed.message ?? "Email delivery failed." };
    } catch {
      return { ok: false, error: "Email delivery failed." };
    }
  }

  return { ok: true };
}

function buildOtpEmailHtml(companyName: string, code: string, note?: string): string {
  const noteBlock = note
    ? `<p style="color:#666;font-size:14px;">${note}</p>`
    : "";
  return `
    ${noteBlock}
    <p>Your <strong>${companyName}</strong> AURA verification code is:</p>
    <p style="font-size:28px;font-weight:bold;letter-spacing:4px;margin:16px 0;">${code}</p>
    <p>This code expires in 10 minutes. Do not share it with anyone.</p>
  `.trim();
}

function isTwilioTrialUnverifiedNumber(error?: string): boolean {
  return !!error?.toLowerCase().includes("unverified");
}

export function buildOtpDeliveryFailureMessage(options: {
  hasEmail: boolean;
  smsError?: string;
  emailError?: string;
}): string {
  const { hasEmail, smsError, emailError } = options;
  const twilioTrial = isTwilioTrialUnverifiedNumber(smsError);
  const resendSandbox = emailError ? isResendSandboxRestriction(emailError) : false;

  if (twilioTrial && resendSandbox) {
    return hasEmail
      ? "SMS is blocked on the Twilio trial account and Resend is still in sandbox mode. Use the email on your Resend account, verify your domain at resend.com/domains, or ask an admin to set RESEND_SANDBOX_FALLBACK_EMAIL on Vercel."
      : "SMS is blocked on the Twilio trial account. Add your email above, or verify this mobile number in the Twilio console.";
  }

  if (twilioTrial) {
    return hasEmail
      ? "SMS could not be delivered (Twilio trial). Check your email inbox for the code."
      : "SMS could not be delivered. Add your email above and tap Send OTP again, or verify this number in Twilio.";
  }

  if (resendSandbox) {
    return "Email is in Resend sandbox mode and can only be sent to your Resend account email until you verify a domain.";
  }

  if (!hasEmail) {
    return "SMS could not be delivered. Add your email above and tap Send OTP again.";
  }

  return "Could not send OTP by SMS or email. Please try again in a moment.";
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
  let emailError: string | undefined;

  if (trimmedEmail) {
    const emailAttempt = await sendEmailResend(
      trimmedEmail,
      `${companyName} — AURA verification code`,
      buildOtpEmailHtml(companyName, code)
    );
    if (emailAttempt.ok) {
      return { delivered: true, method: "email", devLogged: false };
    }
    emailError = emailAttempt.error;

    const sandboxFallback = process.env.RESEND_SANDBOX_FALLBACK_EMAIL?.trim();
    if (
      sandboxFallback &&
      sandboxFallback.toLowerCase() !== trimmedEmail.toLowerCase() &&
      emailError &&
      isResendSandboxRestriction(emailError)
    ) {
      const fallbackAttempt = await sendEmailResend(
        sandboxFallback,
        `${companyName} — AURA verification code (sandbox)`,
        buildOtpEmailHtml(
          companyName,
          code,
          `Sandbox delivery: this code was requested for <strong>${trimmedEmail}</strong> (${action}).`
        )
      );
      if (fallbackAttempt.ok) {
        return {
          delivered: true,
          method: "email",
          devLogged: false,
          deliveryNote: `Code sent to ${sandboxFallback} (Resend sandbox — could not deliver to ${trimmedEmail}).`,
        };
      }
      emailError = fallbackAttempt.error ?? emailError;
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
    emailError,
  };
}
