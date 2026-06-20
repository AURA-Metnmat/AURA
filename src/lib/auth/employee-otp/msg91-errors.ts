export interface Msg91OtpResponse {
  type?: string;
  message?: string;
  request_id?: string;
}

export function mapMsg91ErrorToUserMessage(
  providerMessage?: string,
  httpStatus?: number
): string {
  const msg = (providerMessage ?? "").toLowerCase();

  if (!providerMessage && httpStatus === 401) {
    return "OTP SMS is not configured correctly. Please contact your administrator.";
  }

  if (msg.includes("invalid authkey") || msg.includes("authentication failed")) {
    return "OTP SMS is not configured correctly. Please contact your administrator.";
  }

  if (msg.includes("template") || msg.includes("dlt")) {
    return "OTP SMS template is not configured. Please contact your administrator.";
  }

  if (msg.includes("balance") || msg.includes("insufficient")) {
    return "OTP SMS wallet balance is low. Please contact your administrator.";
  }

  if (msg.includes("invalid mobile") || msg.includes("mobile number")) {
    return "Enter a valid 10-digit mobile number.";
  }

  return "Could not send OTP. Please try again shortly.";
}
