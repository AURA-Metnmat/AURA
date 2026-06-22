export const CONSENT_VERSION = "v1";

export type DeviceType = "desktop" | "mobile" | "tablet" | "unknown";

import type { Language } from "@/lib/aura/i18n";

export const CONSENT_POINTS_EN = [
  "This interview captures your operational knowledge and work experience for your employer's knowledge program.",
  "Your answers, uploaded files, and interview transcript are stored securely and visible to authorized administrators at your company.",
  "Data may be reviewed, categorized, and used to build internal knowledge reports and training datasets.",
  "Do not share passwords, OTPs, or highly sensitive personal data unless explicitly required for your role.",
] as const;

export interface ConsentCopy {
  title: string;
  intro: string;
  footer: string;
  accept: string;
  decline: string;
  points: readonly string[];
}

export const CONSENT_COPY: Record<Language, ConsentCopy> = {
  en: {
    title: "Consent & data use",
    intro:
      "Before we begin, please confirm you understand how your interview data will be collected and used.",
    footer:
      "By continuing, you consent to this interview being recorded as text (and any files you upload). You may request correction of your data through your company administrator.",
    accept: "I agree — start interview",
    decline: "Cancel",
    points: CONSENT_POINTS_EN,
  },
  hi: {
    title: "सहमति और डेटा उपयोग",
    intro:
      "शुरू करने से पहले, कृपया पुष्टि करें कि आप समझते हैं कि आपका इंटरव्यू डेटा कैसे एकत्र और उपयोग किया जाएगा।",
    footer:
      "जारी रखकर, आप सहमति देते हैं कि यह इंटरव्यू टेक्स्ट (और आपके द्वारा अपलोड की गई फाइलें) के रूप में रिकॉर्ड किया जाएगा।",
    accept: "मैं सहमत हूँ — इंटरव्यू शुरू करें",
    decline: "रद्द करें",
    points: [
      "यह इंटरव्यू आपके कार्य अनुभव और परिचालन ज्ञान को कैप्चर करता है।",
      "आपके उत्तर सुरक्षित रूप से संग्रहीत होते हैं और केवल अधिकृत एडमिन देख सकते हैं।",
      "डेटा की समीक्षा और आंतरिक रिपोर्ट/ट्रेनिंग के लिए उपयोग हो सकता है।",
      "पासवर्ड या OTP साझा न करें।",
    ],
  },
  or: {
    title: "ସମ୍ମତି ଏବଂ ତଥ୍ୟ ବ୍ୟବହାର",
    intro: "ଆରମ୍ଭ କରିବା ପୂର୍ବରୁ, ଆପଣଙ୍କ ସାକ୍ଷାତ୍କାର ତଥ୍ୟ କିପରି ସଂଗ୍ରହ ଏବଂ ବ୍ୟବହାର ହେବ ତାହା ନିଶ୍ଚିତ କରନ୍ତୁ।",
    footer: "ଜାରି ରଖିବା ଦ୍ୱାରା, ଆପଣ ଏହି ସାକ୍ଷାତ୍କାର ରେକର୍ଡ କରିବାକୁ ସମ୍ମତି ଦିଅନ୍ତି।",
    accept: "ମୁଁ ସହମତ — ସାକ୍ଷାତ୍କାର ଆରମ୍ଭ କରନ୍ତୁ",
    decline: "ବାତିଲ୍",
    points: [
      "ଏହି ସାକ୍ଷାତ୍କାର ଆପଣଙ୍କ କାର୍ଯ୍ୟ ଅନୁଭବ ସଂଗ୍ରହ କରେ।",
      "ଉତ୍ତର ସୁରକ୍ଷିତ ଭାବରେ ସଂରକ୍ଷିତ ହୁଏ।",
      "ତଥ୍ୟ ସମୀକ୍ଷା ଏବଂ ପ୍ରଶିକ୍ଷଣ ଡାଟାସେଟ୍ ପାଇଁ ବ୍ୟବହୃତ ହୋଇପାରେ।",
      "ପାସୱାର୍ଡ କିମ୍ବା OTP ସାଝା କରନ୍ତୁ ନାହିଁ।",
    ],
  },
  bn: {
    title: "সম্মতি ও ডেটা ব্যবহার",
    intro: "শুরু করার আগে, আপনার ইন্টারভিউ ডেটা কীভাবে সংগ্রহ ও ব্যবহার হবে তা নিশ্চিত করুন।",
    footer: "চালিয়ে গেলে, আপনি এই ইন্টারভিউ টেক্সট হিসেবে রেকর্ড করতে সম্মত হন।",
    accept: "আমি সম্মত — ইন্টারভিউ শুরু করুন",
    decline: "বাতিল",
    points: [
      "এই ইন্টারভিউ আপনার কাজের অভিজ্ঞতা সংগ্রহ করে।",
      "উত্তর নিরাপদে সংরক্ষিত হয় এবং শুধু অনুমোদিত অ্যাডমিন দেখতে পারেন।",
      "ডেটা পর্যালোচনা ও প্রশিক্ষণ ডেটাসেটে ব্যবহার হতে পারে।",
      "পাসওয়ার্ড বা OTP শেয়ার করবেন না।",
    ],
  },
};

export function getConsentCopy(language: Language): ConsentCopy {
  return CONSENT_COPY[language] ?? CONSENT_COPY.en;
}

/** @deprecated use getConsentCopy */
export const CONSENT_POINTS = CONSENT_POINTS_EN;

export function detectDeviceType(): DeviceType {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;
  if (/ipad|tablet/.test(ua) || (width >= 768 && width < 1280 && "ontouchstart" in window)) {
    return "tablet";
  }
  if (/mobi|android|iphone|ipod/.test(ua) || width < 768) {
    return "mobile";
  }
  return "desktop";
}

export function isDesktopInterviewEligible(): boolean {
  if (typeof window === "undefined") return true;
  const width = window.innerWidth;
  const device = detectDeviceType();
  return width >= 768 && (device === "desktop" || device === "tablet");
}

export const DESKTOP_MIN_WIDTH_PX = 768;
