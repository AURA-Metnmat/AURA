export interface SmsDeliveryAttempt {
  ok: boolean;
  provider?: string;
  error?: string;
}

export type SmsProviderName = "fast2sms" | "msg91" | "twilio";
