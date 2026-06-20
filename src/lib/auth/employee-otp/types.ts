export type OtpPurpose = "EMPLOYEE_SIGNUP" | "EMPLOYEE_LOGIN";

export type RegistrationMode = "OPEN" | "INVITE_ONLY" | "CLOSED";

export interface SignupRegistrationPayload {
  name: string;
  designation: string;
  department: string;
  email: string;
  mobileNumber: string;
}

export interface OtpRequestSuccess {
  ok: true;
  maskedMobile: string;
  message: string;
  resendAvailableAt?: string;
}

export interface OtpVerifySuccess {
  ok: true;
  employee_id: string;
  employee_name: string;
  designation: string | null;
  department: string | null;
  mobile_number: string;
  email: string | null;
  active_session: import("@/lib/employees/session-resume").ResumedSessionPayload | null;
  message: string;
}
