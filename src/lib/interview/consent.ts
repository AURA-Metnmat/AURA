export const CONSENT_VERSION = "v1";

export const CONSENT_POINTS = [
  "This interview captures your operational knowledge and work experience for your employer's knowledge program.",
  "Your answers, uploaded files, and interview transcript are stored securely and visible to authorized administrators at your company.",
  "Data may be reviewed, categorized, and used to build internal knowledge reports and training datasets.",
  "Do not share passwords, OTPs, or highly sensitive personal data unless explicitly required for your role.",
] as const;

export type DeviceType = "desktop" | "mobile" | "tablet" | "unknown";

export function detectDeviceType(): DeviceType {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;
  if (/ipad|tablet/.test(ua) || (width >= 768 && width < 1024 && "ontouchstart" in window)) {
    return "tablet";
  }
  if (/mobi|android|iphone|ipod/.test(ua) || width < 1024) {
    return "mobile";
  }
  return "desktop";
}

export function isDesktopInterviewEligible(): boolean {
  if (typeof window === "undefined") return true;
  return window.innerWidth >= 1024 && detectDeviceType() === "desktop";
}

export const DESKTOP_MIN_WIDTH_PX = 1024;
