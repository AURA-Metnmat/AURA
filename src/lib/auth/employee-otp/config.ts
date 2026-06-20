export function getOtpConfig() {
  const pepper =
    process.env.OTP_SECRET_PEPPER?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    "dev-otp-pepper-change-me";

  return {
    expiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES ?? "5"),
    resendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? "60"),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? "5"),
    maxRequestsPerEmployeePerHour: 5,
    maxRequestsPerMobilePerHour: 5,
    maxRequestsPerIpPerHour: 20,
    pepper,
    provider:
      process.env.OTP_PROVIDER?.trim() ||
      process.env.SMS_OTP_PROVIDER?.trim() ||
      "fast2sms",
    smsApiKey:
      process.env.OTP_SMS_API_KEY?.trim() ||
      process.env.FAST2SMS_API_KEY?.trim() ||
      "",
    smsSenderId: process.env.OTP_SMS_SENDER_ID?.trim() || "",
    smsTemplateId: process.env.OTP_SMS_TEMPLATE_ID?.trim() || "",
  };
}
