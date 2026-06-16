import type { Language } from "./i18n";
import { getTenureMcqInteraction, type McqInteraction } from "./interaction";

export interface OpeningBilingual {
  en: string;
  locale: string;
  interaction?: McqInteraction;
}

const OPENING_Q1: Record<Language, (name: string) => string> = {
  en: (name) =>
    `Welcome, ${name}. Thank you for taking the time to participate today. To begin, could you please introduce yourself and briefly walk us through your professional journey?`,
  hi: (name) =>
    `स्वागत है, ${name}। आज समय देने के लिए धन्यवाद। शुरू करने के लिए, कृपया अपना परिचय दें और अपनी पेशेवर यात्रा संक्षेप में बताएं?`,
  or: (name) =>
    `ସ୍ୱାଗତ, ${name}। ଆଜି ସମୟ ଦେବା ପାଇଁ ଧନ୍ୟବାଦ। ଆରମ୍ଭ କରିବା ପାଇଁ, ଦୟାକରି ନିଜ ପରିଚୟ ଦିଅନ୍ତୁ ଏବଂ ଆପଣଙ୍କ professional journey ସଂକ୍ଷେପରେ କହନ୍ତୁ?`,
  bn: (name) =>
    `স্বাগতম, ${name}। আজ সময় দেওয়ার জন্য ধন্যবাদ। শুরু করতে, অনুগ্রহ করে নিজের পরিচয় দিন এবং আপনার পেশাদারি যাত্রা সংক্ষেপে বলুন?`,
};

const OPENING_Q1_WITH_ROLE: Record<Language, (name: string, designation: string) => string> = {
  en: (name, designation) =>
    `Welcome, ${name}. Thank you for joining today as ${designation}. To begin, could you briefly describe your day-to-day responsibilities in this role and the teams or systems you work with most?`,
  hi: (name, designation) =>
    `स्वागत है, ${name}। ${designation} के रूप में आज समय देने के लिए धन्यवाद। शुरू करने के लिए, कृपया इस भूमिका में अपनी दैनिक जिम्मेदारियाँ और जिन टीमों/सिस्टम के साथ आप सबसे अधिक काम करते हैं, संक्षेप में बताएं?`,
  or: (name, designation) =>
    `ସ୍ୱାଗତ, ${name}। ${designation} ଭାବରେ ଆଜି ସମୟ ଦେବା ପାଇଁ ଧନ୍ୟବାଦ। ଆରମ୍ଭ କରିବା ପାଇଁ, ଏହି role ରେ ଆପଣଙ୍କ daily responsibilities ଏବଂ ଯେଉଁ teams/systems ସହିତ ଆପଣ ସର୍ବାଧିକ କାମ କରନ୍ତି, ସଂକ୍ଷେପରେ ବର୍ଣ୍ଣନା କରନ୍ତୁ?`,
  bn: (name, designation) =>
    `স্বাগতম, ${name}। ${designation} হিসেবে আজ সময় দেওয়ার জন্য ধন্যবাদ। শুরু করতে, এই ভূমিকায় আপনার দৈনন্দিন দায়িত্ব এবং যে দল/সিস্টেমের সাথে আপনি সবচেয়ে বেশি কাজ করেন, সংক্ষেপে বর্ণনা করুন?`,
};

export const OPENING_Q2_EN =
  "How long have you been associated with this organization? Please pick the option that best matches your tenure.";

const OPENING_Q2: Record<Language, (companyName: string) => string> = {
  en: () => OPENING_Q2_EN,
  hi: () =>
    "आप इस संगठन से कितने समय से जुड़े हैं? कृपया वह विकल्प चुनें जो आपके कार्यकाल से सबसे अच्छा मेल खाता हो।",
  or: () =>
    "ଆପଣ ଏହି organization ସହିତ କେତେ ଦିନ ଧରି ଯୁକ୍ତ? ଦୟାକରି ଆପଣଙ୍କ tenure ସହିତ ସବୁଠାରୁ ଭଲ ମେଳ ଖାଉଥିବା option ବାଛନ୍ତୁ।",
  bn: () =>
    "আপনি এই প্রতিষ্ঠানের সঙ্গে কতদিন যুক্ত? অনুগ্রহ করে আপনার কর্মকালের সাথে সবচেয়ে ভালো মিলে এমন বিকল্পটি বেছে নিন।",
};

export const OPENING_Q1_EN_PREFIX =
  "Thank you for taking the time to participate today. To begin, could you please introduce yourself";

export function getOpeningQuestion1(
  lang: Language,
  name: string,
  designation?: string | null
): OpeningBilingual {
  const role = designation?.trim();
  if (role) {
    const en = OPENING_Q1_WITH_ROLE.en(name, role);
    const locale = OPENING_Q1_WITH_ROLE[lang](name, role);
    return { en, locale: lang === "en" ? en : locale };
  }

  const en = OPENING_Q1.en(name);
  const locale = OPENING_Q1[lang](name);
  return { en, locale: lang === "en" ? en : locale };
}

export function getOpeningQuestion2(lang: Language, _companyName: string): OpeningBilingual {
  const en = OPENING_Q2.en(_companyName);
  const locale = OPENING_Q2[lang](_companyName);
  return {
    en,
    locale: lang === "en" ? en : locale,
    interaction: getTenureMcqInteraction(lang),
  };
}
