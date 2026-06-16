const MAX_SMS_LEN = 320;

function buildCredentialMessage(companyName: string, username: string, password: string): string {
  return [
    `Welcome to ${companyName}.`,
    "",
    `Username: ${username}`,
    `Password: ${password}`,
    "",
    "Please log in and change your password immediately.",
  ].join("\n");
}

function buildEmailHtml(companyName: string, username: string, password: string): string {
  return `
    <p>Welcome to <strong>${companyName}</strong>.</p>
    <p><strong>Username:</strong> ${username}<br/>
    <strong>Password:</strong> ${password}</p>
    <p>For security reasons, please change your password after your first login.</p>
  `.trim();
}

async function sendSmsTwilio(mobile: string, body: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_PHONE_NUMBER?.trim();
  if (!accountSid || !authToken || !from) return false;

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

  if (!res.ok && process.env.NODE_ENV !== "production") {
    const errText = await res.text();
    console.error("[Twilio SMS failed]", res.status, errText);
  }

  return res.ok;
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

  if (!res.ok && process.env.NODE_ENV !== "production") {
    const errText = await res.text();
    console.error("[Resend email failed]", res.status, errText);
  }

  return res.ok;
}

export interface CredentialDeliveryResult {
  smsSent: boolean;
  emailSent: boolean;
  devLogged: boolean;
}

export async function deliverEmployeeCredentials(options: {
  companyName: string;
  username: string;
  password: string;
  mobileNumber: string;
  email?: string | null;
}): Promise<CredentialDeliveryResult> {
  const { companyName, username, password, mobileNumber, email } = options;
  const smsBody = buildCredentialMessage(companyName, username, password);

  let smsSent = await sendSmsTwilio(mobileNumber, smsBody);
  let emailSent = false;

  if (email?.trim()) {
    emailSent = await sendEmailResend(
      email.trim(),
      "Employee Account Credentials",
      buildEmailHtml(companyName, username, password)
    );
  }

  let devLogged = false;
  if (!smsSent && process.env.NODE_ENV !== "production") {
    console.info("[AURA credentials — dev only]", {
      mobileNumber,
      email: email ?? null,
      username,
      password,
      smsBody,
    });
    devLogged = true;
    smsSent = true;
  }

  return { smsSent, emailSent, devLogged };
}
