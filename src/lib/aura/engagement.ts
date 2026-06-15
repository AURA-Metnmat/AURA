import type { Language, PreferredLanguage } from "./i18n";

export interface EngagementStrings {
  detailsDesc: string;
  stepLabel: string;
  secureNote: string;
  speakAnswer: string;
  listening: string;
  stopListening: string;
  micUnsupported: string;
  havingIssue: string;
  uploadDocs: string;
  needClarification: string;
  shareKnowledge: string;
  chatCoachTip: string;
  beSpecificTip: string;
  auraTyping: string;
  youLabel: string;
  dropFilesHint: string;
}

export const ENGAGEMENT: Record<Language, EngagementStrings> = {
  en: {
    detailsDesc: "Just a few details so we can personalize your conversation. Takes under a minute.",
    stepLabel: "Step 2 of 3 — Your profile",
    secureNote: "Your data stays private and is only shared with your company admin.",
    speakAnswer: "Hold to speak",
    listening: "Listening…",
    stopListening: "Stop",
    micUnsupported: "Voice input is not supported in this browser. Please type your answer.",
    havingIssue: "I'm facing an issue with…",
    uploadDocs: "I have files/data to share",
    needClarification: "Can you clarify the question?",
    shareKnowledge: "Here's what I know about this…",
    chatCoachTip: "Tip: Share real examples from your daily work — the more specific, the better AURA understands.",
    beSpecificTip: "Names, numbers, and steps help us capture accurate requirements.",
    auraTyping: "AURA is preparing the next question…",
    youLabel: "You",
    dropFilesHint: "Attach Excel, PDF, images, or photos of forms & screens",
  },
  hi: {
    detailsDesc: "बातचीत शुरू करने के लिए कुछ बुनियादी जानकारी। एक मिनट से कम समय लगेगा।",
    stepLabel: "चरण 2 / 3 — आपकी प्रोफ़ाइल",
    secureNote: "आपका डेटा निजी रहता है और केवल कंपनी एडमिन के साथ साझा होता है।",
    speakAnswer: "बोलने के लिए दबाए रखें",
    listening: "सुन रहा है…",
    stopListening: "रोकें",
    micUnsupported: "इस ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है। कृपया टाइप करें।",
    havingIssue: "मुझे इसमें समस्या आ रही है…",
    uploadDocs: "मेरे पास फ़ाइल/डेटा है",
    needClarification: "क्या आप प्रश्न स्पष्ट कर सकते हैं?",
    shareKnowledge: "मैं इसके बारे में जो जानता/जानती हूँ…",
    chatCoachTip: "सुझाव: अपने रोज़मर्रा के काम के वास्तविक उदाहरण दें — जितना विशिष्ट, उतना बेहतर।",
    beSpecificTip: "नाम, संख्याएँ और चरण सटीक जानकारी में मदद करते हैं।",
    auraTyping: "AURA अगला प्रश्न तैयार कर रहा है…",
    youLabel: "आप",
    dropFilesHint: "Excel, PDF, छवि या फॉर्म की फोटो संलग्न करें",
  },
  or: {
    detailsDesc: "କଥୋପକଥନ ଆରମ୍ଭ କରିବା ପାଇଁ କିଛି ମୂଳ ତଥ୍ୟ। ଏକ ମିନିଟରୁ କମ ସମୟ।",
    stepLabel: "ପଦକ୍ଷେପ 2 / 3 — ଆପଣଙ୍କ ପ୍ରୋଫାଇଲ୍",
    secureNote: "ଆପଣଙ୍କ ତଥ୍ୟ ଗୋପନୀୟ ରହେ ଏବଂ କେବଳ କମ୍ପାନୀ ଆଡମିନ୍ ସହ ସାଝା ହୁଏ।",
    speakAnswer: "କହିବା ପାଇଁ ଦବାଇ ରଖନ୍ତୁ",
    listening: "ଶୁଣୁଛି…",
    stopListening: "ବନ୍ଦ",
    micUnsupported: "ଏହି ବ୍ରାଉଜରରେ ଭଏସ୍ ଉପଲବ୍ଧ ନାହିଁ। ଦୟାକରି ଟାଇପ୍ କରନ୍ତୁ।",
    havingIssue: "ମୋତେ ଏଥିରେ ସମସ୍ୟା ହେଉଛି…",
    uploadDocs: "ମୋ ପାଖରେ ଫାଇଲ୍/ଡାଟା ଅଛି",
    needClarification: "ଆପଣ ପ୍ରଶ୍ନ ସ୍ପଷ୍ଟ କରିପାରିବେ କି?",
    shareKnowledge: "ଏହା ବିଷୟରେ ମୁଁ ଯାହା ଜାଣେ…",
    chatCoachTip: "ଟିପ୍: ଦୈନିକ କାମର ପ୍ରକୃତ ଉଦାହରଣ ଦିଅନ୍ତୁ — ଯେତେ ନିର୍ଦ୍ଦିଷ୍ଟ, ସେତେ ଭଲ।",
    beSpecificTip: "ନାମ, ସଂଖ୍ୟା ଏବଂ ପଦକ୍ଷେପ ସଠିକ ତଥ୍ୟ ପାଇଁ ସାହାଯ୍ୟ କରେ।",
    auraTyping: "AURA ପରବର୍ତ୍ତୀ ପ୍ରଶ୍ନ ପ୍ରସ୍ତୁତ କରୁଛି…",
    youLabel: "ଆପଣ",
    dropFilesHint: "Excel, PDF, ଛବି କିମ୍ବା ଫର୍ମ ଫଟୋ ସଂଲଗ୍ନ କରନ୍ତୁ",
  },
  bn: {
    detailsDesc: "কথোপকথন শুরু করতে কয়েকটি মৌলিক তথ্য। এক মিনিটেরও কম সময় লাগবে।",
    stepLabel: "ধাপ ২ / ৩ — আপনার প্রোফাইল",
    secureNote: "আপনার তথ্য গোপন থাকে এবং শুধু কোম্পানি অ্যাডমিনের সাথে শেয়ার হয়।",
    speakAnswer: "বলতে ধরে রাখুন",
    listening: "শুনছি…",
    stopListening: "বন্ধ",
    micUnsupported: "এই ব্রাউজারে ভয়েস ইনপুট নেই। টাইপ করুন।",
    havingIssue: "আমার এই বিষয়ে সমস্যা হচ্ছে…",
    uploadDocs: "আমার কাছে ফাইল/ডেটা আছে",
    needClarification: "আপনি কি প্রশ্নটি স্পষ্ট করতে পারেন?",
    shareKnowledge: "এ বিষয়ে আমি যা জানি…",
    chatCoachTip: "পরামর্শ: দৈনন্দিন কাজের বাস্তব উদাহরণ দিন — যত বিস্তারিত, তত ভালো।",
    beSpecificTip: "নাম, সংখ্যা ও ধাপ সঠিক তথ্য ধরে রাখতে সাহায্য করে।",
    auraTyping: "AURA পরের প্রশ্ন প্রস্তুত করছে…",
    youLabel: "আপনি",
    dropFilesHint: "Excel, PDF, ছবি বা ফর্মের ফটো সংযুক্ত করুন",
  },
};

export function getEngagement(lang: PreferredLanguage): EngagementStrings {
  return ENGAGEMENT[lang];
}
