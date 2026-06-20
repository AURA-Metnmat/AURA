import type { SmsDeliveryAttempt } from "./types";

function toMsg91Mobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return `91${local}`;
}

export async function sendOtpViaMsg91(
  mobile: string,
  code: string,
  companyName: string
): Promise<SmsDeliveryAttempt> {
  const authKey = process.env.MSG91_AUTH_KEY?.trim();
  if (!authKey) {
    return { ok: false, error: "MSG91 is not configured." };
  }

  const templateId = process.env.MSG91_OTP_TEMPLATE_ID?.trim();
  const senderId = process.env.MSG91_SENDER_ID?.trim();
  const mobiles = toMsg91Mobile(mobile);

  if (templateId) {
    const res = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        authkey: authKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_id: templateId,
        short_url: "0",
        recipients: [
          {
            mobiles,
            OTP: code,
            COMPANY: companyName.slice(0, 30),
          },
        ],
      }),
    });

    const raw = await res.text();
    if (!res.ok) {
      console.error("[MSG91 flow OTP failed]", res.status, raw);
      return { ok: false, provider: "msg91", error: "SMS delivery failed." };
    }

    try {
      const parsed = JSON.parse(raw) as { type?: string; message?: string };
      if (parsed.type === "success") {
        return { ok: true, provider: "msg91" };
      }
      return {
        ok: false,
        provider: "msg91",
        error: parsed.message ?? "SMS delivery failed.",
      };
    } catch {
      return { ok: true, provider: "msg91" };
    }
  }

  if (!senderId) {
    return { ok: false, error: "MSG91 sender ID or template is not configured." };
  }

  const message = `${companyName}: Your AURA verification code is ${code}. Valid for 10 minutes.`;
  const params = new URLSearchParams({
    authkey: authKey,
    mobiles,
    message,
    sender: senderId,
    route: "4",
    country: "91",
  });

  const res = await fetch(`https://api.msg91.com/api/sendhttp.php?${params.toString()}`);
  const raw = await res.text();
  if (!res.ok || raw.toLowerCase().includes("error")) {
    console.error("[MSG91 HTTP OTP failed]", res.status, raw);
    return { ok: false, provider: "msg91", error: raw || "SMS delivery failed." };
  }

  return { ok: true, provider: "msg91" };
}
