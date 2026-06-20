import type { Language } from "./i18n";
import type { EngagementStrings } from "./engagement";

export type QuickReplyAction = "send" | "prefill" | "attach";

export interface QuickReplyOption {
  id: string;
  label: string;
  message: string;
  messageEn: string;
  action: QuickReplyAction;
  emoji?: string;
}

export interface QuickReplyContext {
  messageCount: number;
  hasUnansweredMcq: boolean;
  completionPct: number;
}

function pick(
  lang: Language,
  en: string,
  hi: string,
  or: string,
  bn: string
): string {
  const map: Record<Language, string> = { en, hi, or, bn };
  return map[lang] ?? en;
}

export function getQuickReplies(
  lang: Language,
  engagement: EngagementStrings,
  context: QuickReplyContext
): QuickReplyOption[] {
  if (context.hasUnansweredMcq) {
    return [
      {
        id: "clarify",
        label: engagement.needClarification,
        message: pick(
          lang,
          "Could you please clarify the question?",
          "क्या आप प्रश्न स्पष्ट कर सकते हैं?",
          "ଆପଣ ପ୍ରଶ୍ନ ସ୍ପଷ୍ଟ କରିପାରିବେ କି?",
          "আপনি কি প্রশ্নটি স্পষ্ট করতে পারেন?"
        ),
        messageEn: "Could you please clarify the question?",
        action: "send",
        emoji: "❓",
      },
      {
        id: "not-sure",
        label: engagement.notSureYet,
        message: pick(
          lang,
          "I'm not sure yet — could you give me a hint?",
          "मुझे अभी यकीन नहीं — क्या आप संकेत दे सकते हैं?",
          "ମୁଁ ଏପର୍ଯ୍ୟନ୍ତ ନିଶ୍ଚିତ ନୁହେଁ — ଏକ ସୂଚନା ଦେଇପାରିବେ କି?",
          "আমি এখনো নিশ্চিত নই — একটু ইঙ্গিত দিতে পারবেন?"
        ),
        messageEn: "I'm not sure yet — could you give me a hint?",
        action: "send",
        emoji: "🤔",
      },
    ];
  }

  const starter: QuickReplyOption[] =
    context.messageCount <= 3
      ? [
          {
            id: "yes-got-it",
            label: engagement.yesGotIt,
            message: pick(
              lang,
              "Yes, I understand. Please continue.",
              "हाँ, मैं समझ गया/गई। कृपया आगे बढ़ें।",
              "ହଁ, ମୁଁ ବୁଝିଗଲି। ଦୟାକରି ଆଗକୁ ବଢ଼ନ୍ତୁ।",
              "হ্যাঁ, বুঝেছি। অনুগ্রহ করে এগিয়ে যান।"
            ),
            messageEn: "Yes, I understand. Please continue.",
            action: "send",
            emoji: "👍",
          },
          {
            id: "sounds-good",
            label: engagement.soundsGood,
            message: pick(
              lang,
              "Sounds good — let's begin.",
              "ठीक है — चलिए शुरू करते हैं।",
              "ଠିକ୍ ଅଛି — ଆରମ୍ଭ କରିବା।",
              "ঠিক আছে — শুরু করি।"
            ),
            messageEn: "Sounds good — let's begin.",
            action: "send",
            emoji: "✨",
          },
        ]
      : [];

  const core: QuickReplyOption[] = [
    {
      id: "share",
      label: engagement.shareKnowledge,
      message: pick(
        lang,
        "Here's what I know about this: ",
        "मैं इसके बारे में जो जानता/जानती हूँ: ",
        "ଏହା ବିଷୟରେ ମୁଁ ଯାହା ଜାଣେ: ",
        "এ বিষয়ে আমি যা জানি: "
      ),
      messageEn: "Here's what I know about this: ",
      action: "prefill",
      emoji: "💡",
    },
    {
      id: "example",
      label: engagement.giveExample,
      message: pick(
        lang,
        "For example, in my daily work I usually…",
        "उदाहरण के लिए, मेरे रोज़मर्रा के काम में मैं आमतौर पर…",
        "ଉଦାହରଣ ସ୍ୱରୂପ, ମୋ ଦୈନିକ କାମରେ ମୁଁ ସାଧାରଣତଃ…",
        "উদাহরণস্বরূপ, আমার দৈনন্দিন কাজে আমি সাধারণত…"
      ),
      messageEn: "For example, in my daily work I usually…",
      action: "prefill",
      emoji: "📋",
    },
    {
      id: "clarify",
      label: engagement.needClarification,
      message: pick(
        lang,
        "Could you please clarify the question?",
        "क्या आप प्रश्न स्पष्ट कर सकते हैं?",
        "ଆପଣ ପ୍ରଶ୍ନ ସ୍ପଷ୍ଟ କରିପାରିବେ କି?",
        "আপনি কি প্রশ্নটি স্পষ্ট করতে পারেন?"
      ),
      messageEn: "Could you please clarify the question?",
      action: "send",
      emoji: "❓",
    },
    {
      id: "repeat",
      label: engagement.repeatQuestion,
      message: pick(
        lang,
        "Could you repeat the last question?",
        "क्या आप पिछला प्रश्न दोहरा सकते हैं?",
        "ଶେଷ ପ୍ରଶ୍ନଟି ପୁନରାବୃତ୍ତି କରିପାରିବେ କି?",
        "শেষ প্রশ্নটা আবার বলতে পারবেন?"
      ),
      messageEn: "Could you repeat the last question?",
      action: "send",
      emoji: "🔁",
    },
    {
      id: "attach",
      label: engagement.uploadDocs,
      message: pick(
        lang,
        "I have files or data to share.",
        "मेरे पास साझा करने के लिए फ़ाइल या डेटा है।",
        "ମୋ ପାଖରେ ସାଝା କରିବାକୁ ଫାଇଲ୍ କିମ୍ବା ଡାଟା ଅଛି।",
        "শেয়ার করার মতো ফাইল বা ডেটা আছে।"
      ),
      messageEn: "I have files or data to share.",
      action: "attach",
      emoji: "📎",
    },
    {
      id: "issue",
      label: engagement.havingIssue,
      message: pick(
        lang,
        "I'm facing an issue with: ",
        "मुझे इसमें समस्या आ रही है: ",
        "ମୋତେ ଏଥିରେ ସମସ୍ୟା ହେଉଛି: ",
        "আমার এই বিষয়ে সমস্যা হচ্ছে: "
      ),
      messageEn: "I'm facing an issue with: ",
      action: "prefill",
      emoji: "⚠️",
    },
    {
      id: "not-sure",
      label: engagement.notSureYet,
      message: pick(
        lang,
        "I'm not sure about this one — can we skip or come back later?",
        "मुझे इस पर यकीन नहीं — क्या हम छोड़ सकते हैं या बाद में आ सकते हैं?",
        "ମୁଁ ଏଥିରେ ନିଶ୍ଚିତ ନୁହେଁ — ଆମେ ଛାଡ଼ି କିମ୍ବା ପରେ ଆସିପାରିବା କି?",
        "এটায় নিশ্চিত নই — এটা এড়িয়ে যাওয়া বা পরে আসা যাবে?"
      ),
      messageEn: "I'm not sure about this one — can we skip or come back later?",
      action: "send",
      emoji: "🤔",
    },
  ];

  if (context.completionPct >= 70) {
    core.push({
      id: "almost-done",
      label: engagement.almostDone,
      message: pick(
        lang,
        "I think we've covered most of it — ready to wrap up when you are.",
        "मुझे लगता है हमने अधिकांश कवर कर लिया — जब आप तैयार हों तो समाप्त करें।",
        "ଆମେ ଅଧିକାଂଶ କଭର କରିସାରିଲୁ ବୋଲି ଲାଗୁଛି — ଆପଣ ପ୍ରସ୍ତୁତ ହେଲେ ଶେଷ କରିବା।",
        "মনে হচ্ছে বেশিরভাগ কভার হয়ে গেছে — আপনি প্রস্তুত হলে শেষ করতে পারি।"
      ),
      messageEn: "I think we've covered most of it — ready to wrap up when you are.",
      action: "send",
      emoji: "✅",
    });
  }

  return [...starter, ...core];
}
