import type { Language } from "./i18n";

export interface OpeningBilingual {
  en: string;
  locale: string;
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

export const OPENING_Q2_EN =
  "How long have you been working with this organization, and how has your role evolved during that time?";

const OPENING_Q2: Record<Language, (companyName: string) => string> = {
  en: () => OPENING_Q2_EN,
  hi: () =>
    "आप इस संगठन में कितने समय से काम कर रहे हैं, और इस दौरान आपकी भूमिका कैसे विकसित हुई है?",
  or: () =>
    "ଆପଣ ଏହି organization ରେ କେତେ ଦିନ ଧରି କାମ କରୁଛନ୍ତି, ଏବଂ ସେହି ସମୟରେ ଆପଣଙ୍କ role କିପରି ବିକଶିତ ହୋଇଛି?",
  bn: () =>
    "আপনি এই প্রতিষ্ঠানে কতদিন ধরে কাজ করছেন, এবং সেই সময়ে আপনার ভূমিকা কীভাবে বিকশিত হয়েছে?",
};

export const OPENING_Q1_EN_PREFIX =
  "Thank you for taking the time to participate today. To begin, could you please introduce yourself";

export function getOpeningQuestion1(lang: Language, name: string): OpeningBilingual {
  const en = OPENING_Q1.en(name);
  const locale = OPENING_Q1[lang](name);
  return { en, locale: lang === "en" ? en : locale };
}

export function getOpeningQuestion2(lang: Language, _companyName: string): OpeningBilingual {
  const en = OPENING_Q2.en(_companyName);
  const locale = OPENING_Q2[lang](_companyName);
  return { en, locale: lang === "en" ? en : locale };
}
