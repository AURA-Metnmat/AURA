export type OtpDeliveryMethod = "email" | "dev";

export interface OtpDeliveryResult {
  delivered: boolean;
  method: OtpDeliveryMethod | null;
  devLogged: boolean;
  emailError?: string;
}

function buildOtpEmailHtml(companyName: string, code: string): string {
  return `
    <p>Your <strong>${companyName}</strong> AURA verification code is:</p>
    <p style="font-size:28px;font-weight:bold;letter-spacing:4px;margin:16px 0;">${code}</p>
    <p>This code expires in 10 minutes. Do not share it with anyone.</p>
  `.trim();
}

async function sendEmailResend(
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
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

export function buildOtpDeliveryFailureMessage(emailError?: string): string {
  if (!emailError || emailError === "Email service is not configured on the server.") {
    return "Email OTP is not configured yet. Ask your administrator to set up Resend.";
  }

  const lower = emailError.toLowerCase();
  if (lower.includes("only send testing emails to your own email")) {
    return "Email is in Resend sandbox mode. Verify your domain at resend.com/domains, or use your Resend account email to test.";
  }

  if (lower.includes("verify a domain")) {
    return "Verify your sending domain in Resend before sending OTP emails to employees.";
  }

  return "Could not send OTP to your email. Please try again in a moment.";
}

export async function deliverEmployeeOtp(options: {
  companyName: string;
  email: string;
  code: string;
  purpose: "register" | "login";
}): Promise<OtpDeliveryResult> {
  const { companyName, email, code, purpose } = options;
  const action = purpose === "register" ? "registration" : "sign-in";

  const emailAttempt = await sendEmailResend(
    email,
    `${companyName} — AURA verification code`,
    buildOtpEmailHtml(companyName, code)
  );

  if (emailAttempt.ok) {
    return { delivered: true, method: "email", devLogged: false };
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(`[AURA OTP — dev only] ${action} for ${email}: ${code}`);
    return { delivered: true, method: "dev", devLogged: true };
  }

  return {
    delivered: false,
    method: null,
    devLogged: false,
    emailError: emailAttempt.error,
  };
}
