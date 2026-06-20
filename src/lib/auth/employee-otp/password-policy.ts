export const MIN_EMPLOYEE_PASSWORD_LENGTH = 6;
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const ACCOUNT_LOCK_MINUTES = 15;

export function validateEmployeePassword(password: string): string | null {
  const value = password.trim();
  if (!value) return "Password is required.";
  if (value.length < MIN_EMPLOYEE_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_EMPLOYEE_PASSWORD_LENGTH} characters.`;
  }
  return null;
}
