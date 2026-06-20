const MAX_SMS_LEN = 160;

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
    console.error("[Twilio OTP SMS failed]", res.status, errText);
  }

  return res.ok;
}

export interface OtpDeliveryResult {
  smsSent: boolean;
  devLogged: boolean;
}

export async function deliverEmployeeOtp(options: {
  companyName: string;
  mobileNumber: string;
  code: string;
  purpose: "register" | "login";
}): Promise<OtpDeliveryResult> {
  const { companyName, mobileNumber, code, purpose } = options;
  const action = purpose === "register" ? "registration" : "sign-in";
  const smsBody = `${companyName}: Your AURA verification code is ${code}. Valid for 10 minutes. Do not share.`;

  let smsSent = await sendSmsTwilio(mobileNumber, smsBody);
  let devLogged = false;

  if (!smsSent && process.env.NODE_ENV !== "production") {
    console.info(`[AURA OTP — dev only] ${action} for ${mobileNumber}: ${code}`);
    devLogged = true;
    smsSent = true;
  }

  return { smsSent, devLogged };
}
