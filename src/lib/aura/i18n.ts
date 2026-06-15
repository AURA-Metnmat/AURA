import type { SectionId } from "./config";

export type Language = "en" | "hi" | "or" | "bn";
export type PreferredLanguage = Exclude<Language, "en">;

/** Languages employees can choose as their preferred interaction language */
export const PREFERRED_LANGUAGES: { id: PreferredLanguage; label: string; native: string }[] = [
  { id: "hi", label: "Hindi", native: "हिन्दी" },
  { id: "or", label: "Odia", native: "ଓଡ଼ିଆ" },
  { id: "bn", label: "Bangla", native: "বাংলা" },
];

export const LANGUAGES: { id: Language; label: string; native: string }[] = [
  { id: "en", label: "English", native: "English" },
  ...PREFERRED_LANGUAGES,
];

export interface UiStrings {
  welcome: string;
  welcomeDesc: string;
  selectLanguage: string;
  selectCompany: string;
  yourDetails: string;
  fullName: string;
  designation: string;
  department: string;
  mobile: string;
  email: string;
  emailOptional: string;
  startInterview: string;
  required: string;
  invalidMobile: string;
  typeResponse: string;
  send: string;
  attachFile: string;
  attachHint: string;
  thinking: string;
  finishReport: string;
  reportComplete: string;
  viewAdmin: string;
  section: string;
  uploaded: string;
  removeFile: string;
  nameRequired: string;
  designationRequired: string;
  departmentRequired: string;
  mobileRequired: string;
}

export const UI: Record<Language, UiStrings> = {
  en: {
    welcome: "Welcome to AURA",
    welcomeDesc:
      "I'll guide you through a natural conversation to capture your operations knowledge, processes, and requirements. One question at a time — like a senior consultant interview.",
    selectLanguage: "Select your preferred language",
    selectCompany: "Select your company",
    yourDetails: "Enter your details to begin",
    fullName: "Full Name",
    designation: "Designation",
    department: "Department",
    mobile: "Mobile Number",
    email: "Email",
    emailOptional: "Email (optional)",
    startInterview: "Start Interview",
    required: "Required",
    invalidMobile: "Enter a valid 10-digit mobile number",
    typeResponse: "Type your response...",
    send: "Send",
    attachFile: "Attach file or image",
    attachHint: "Images, PDF, Excel, Word (max 10 MB)",
    thinking: "AURA is thinking...",
    finishReport: "Finish interview & generate report",
    reportComplete: "Interview Complete",
    viewAdmin: "View in Admin →",
    section: "Section",
    uploaded: "Attached",
    removeFile: "Remove",
    nameRequired: "Name is required",
    designationRequired: "Designation is required",
    departmentRequired: "Department is required",
    mobileRequired: "Mobile number is required",
  },
  hi: {
    welcome: "AURA में आपका स्वागत है",
    welcomeDesc:
      "मैं आपके संचालन, प्रक्रियाओं और आवश्यकताओं को समझने के लिए एक प्राकृतिक बातचीत के माध्यम से मार्गदर्शन करूँगा। एक समय में एक प्रश्न — जैसे एक वरिष्ठ सलाहकार साक्षात्कार।",
    selectLanguage: "अपनी पसंदीदा भाषा चुनें",
    selectCompany: "अपनी कंपनी चुनें",
    yourDetails: "शुरू करने के लिए अपना विवरण दर्ज करें",
    fullName: "पूरा नाम",
    designation: "पदनाम",
    department: "विभाग",
    mobile: "मोबाइल नंबर",
    email: "ईमेल",
    emailOptional: "ईमेल (वैकल्पिक)",
    startInterview: "साक्षात्कार शुरू करें",
    required: "आवश्यक",
    invalidMobile: "वैध 10 अंकों का मोबाइल नंबर दर्ज करें",
    typeResponse: "अपना उत्तर लिखें...",
    send: "भेजें",
    attachFile: "फ़ाइल या छवि संलग्न करें",
    attachHint: "छवि, PDF, Excel, Word (अधिकतम 10 MB)",
    thinking: "AURA सोच रहा है...",
    finishReport: "साक्षात्कार समाप्त करें और रिपोर्ट बनाएं",
    reportComplete: "साक्षात्कार पूर्ण",
    viewAdmin: "एडमिन में देखें →",
    section: "अनुभाग",
    uploaded: "संलग्न",
    removeFile: "हटाएं",
    nameRequired: "नाम आवश्यक है",
    designationRequired: "पदनाम आवश्यक है",
    departmentRequired: "विभाग आवश्यक है",
    mobileRequired: "मोबाइल नंबर आवश्यक है",
  },
  or: {
    welcome: "AURA କୁ ସ୍ୱାଗତ",
    welcomeDesc:
      "ମୁଁ ଆପଣଙ୍କ operations, ପ୍ରକ୍ରିୟା ଏବଂ ଆବଶ୍ୟକତା ବୁଝିବା ପାଇଁ ଏକ ସ୍ୱାଭାବିକ କଥୋପକଥନ ମାଧ୍ୟମରେ ମାର୍ଗଦର୍ଶନ କରିବି। ଏକ ସମୟରେ ଗୋଟିଏ ପ୍ରଶ୍ନ — ଜଣେ ଜ୍ୟେଷ୍ଠ ପରାମର୍ଶଦାତା ସାକ୍ଷାତକାର ଭଳି।",
    selectLanguage: "ଆପଣଙ୍କ ପସନ୍ଦିତ ଭାଷା ବାଛନ୍ତୁ",
    selectCompany: "ଆପଣଙ୍କ କମ୍ପାନୀ ବାଛନ୍ତୁ",
    yourDetails: "ଆରମ୍ଭ କରିବା ପାଇଁ ଆପଣଙ୍କ ବିବରଣୀ ଦିଅନ୍ତୁ",
    fullName: "ପୂରା ନାମ",
    designation: "ପଦବୀ",
    department: "ବିଭାଗ",
    mobile: "ମୋବାଇଲ୍ ନମ୍ବର",
    email: "ଇମେଲ",
    emailOptional: "ଇମେଲ (ଐଚ୍ଛିକ)",
    startInterview: "ସାକ୍ଷାତକାର ଆରମ୍ଭ କରନ୍ତୁ",
    required: "ଆବଶ୍ୟକ",
    invalidMobile: "ଏକ ବୈଧ 10 ଅଙ୍କର ମୋବାଇଲ୍ ନମ୍ବର ଦିଅନ୍ତୁ",
    typeResponse: "ଆପଣଙ୍କ ଉତ୍ତର ଲେଖନ୍ତୁ...",
    send: "ପଠାନ୍ତୁ",
    attachFile: "ଫାଇଲ୍ କିମ୍ବା ଛବି ସଂଲଗ୍ନ କରନ୍ତୁ",
    attachHint: "ଛବି, PDF, Excel, Word (ସର୍ବୋଚ୍ଚ 10 MB)",
    thinking: "AURA ଭାବୁଛି...",
    finishReport: "ସାକ୍ଷାତକାର ସମାପ୍ତ କରି ରିପୋର୍ଟ ତିଆରି କରନ୍ତୁ",
    reportComplete: "ସାକ୍ଷାତକାର ସମ୍ପୂର୍ଣ୍ଣ",
    viewAdmin: "ଆଡମିନ୍ ରେ ଦେଖନ୍ତୁ →",
    section: "ଅଂଶ",
    uploaded: "ସଂଲଗ୍ନ",
    removeFile: "ହଟାନ୍ତୁ",
    nameRequired: "ନାମ ଆବଶ୍ୟକ",
    designationRequired: "ପଦବୀ ଆବଶ୍ୟକ",
    departmentRequired: "ବିଭାଗ ଆବଶ୍ୟକ",
    mobileRequired: "ମୋବାଇଲ୍ ନମ୍ବର ଆବଶ୍ୟକ",
  },
  bn: {
    welcome: "AURA-তে স্বাগতম",
    welcomeDesc:
      "আমি আপনার অপারেশন, প্রক্রিয়া এবং প্রয়োজনীয়তা বোঝার জন্য একটি স্বাভাবিক কথোপকথনের মাধ্যমে আপনাকে গাইড করব। একবারে একটি প্রশ্ন — যেন একজন সিনিয়র পরামর্শদাতার সাক্ষাৎকার।",
    selectLanguage: "আপনার পছন্দের ভাষা নির্বাচন করুন",
    selectCompany: "আপনার কোম্পানি নির্বাচন করুন",
    yourDetails: "শুরু করতে আপনার বিবরণ দিন",
    fullName: "পুরো নাম",
    designation: "পদবি",
    department: "বিভাগ",
    mobile: "মোবাইল নম্বর",
    email: "ইমেইল",
    emailOptional: "ইমেইল (ঐচ্ছিক)",
    startInterview: "সাক্ষাৎকার শুরু করুন",
    required: "আবশ্যক",
    invalidMobile: "একটি বৈধ ১০ অঙ্কের মোবাইল নম্বর দিন",
    typeResponse: "আপনার উত্তর লিখুন...",
    send: "পাঠান",
    attachFile: "ফাইল বা ছবি সংযুক্ত করুন",
    attachHint: "ছবি, PDF, Excel, Word (সর্বোচ্চ ১০ MB)",
    thinking: "AURA চিন্তা করছে...",
    finishReport: "সাক্ষাৎকার শেষ করুন ও রিপোর্ট তৈরি করুন",
    reportComplete: "সাক্ষাৎকার সম্পন্ন",
    viewAdmin: "অ্যাডমিনে দেখুন →",
    section: "অংশ",
    uploaded: "সংযুক্ত",
    removeFile: "সরান",
    nameRequired: "নাম আবশ্যক",
    designationRequired: "পদবি আবশ্যক",
    departmentRequired: "বিভাগ আবশ্যক",
    mobileRequired: "মোবাইল নম্বর আবশ্যক",
  },
};

export const SECTION_NAMES: Record<Language, Record<string, string>> = {
  en: {
    A: "Participant Info",
    B: "Business Context",
    C: "Process Discovery",
    D: "Existing Systems",
    E: "Pain Points",
    F: "Requirements",
    G: "Reporting",
    H: "Integrations",
    I: "Approvals",
    J: "Future Vision",
  },
  hi: {
    A: "प्रतिभागी जानकारी",
    B: "व्यापारिक संदर्भ",
    C: "प्रक्रिया खोज",
    D: "मौजूदा प्रणालियाँ",
    E: "समस्याएँ",
    F: "आवश्यकताएँ",
    G: "रिपोर्टिंग",
    H: "एकीकरण",
    I: "अनुमोदन",
    J: "भविष्य की दृष्टि",
  },
  or: {
    A: "ଅଂଶୀଦାର ସୂଚନା",
    B: "ବ୍ୟବସାୟିକ ପ୍ରସଙ୍ଗ",
    C: "ପ୍ରକ୍ରିୟା ଅନୁସନ୍ଧାନ",
    D: "ବର୍ତ୍ତମାନ ସିଷ୍ଟମ",
    E: "ସମସ୍ୟା",
    F: "ଆବଶ୍ୟକତା",
    G: "ରିପୋର୍ଟିଂ",
    H: "ଏକୀକରଣ",
    I: "ଅନୁମୋଦନ",
    J: "ଭବିଷ୍ୟତ ଦୃଷ୍ଟି",
  },
  bn: {
    A: "অংশগ্রহণকারীর তথ্য",
    B: "ব্যবসায়িক প্রসঙ্গ",
    C: "প্রক্রিয়া আবিষ্কার",
    D: "বিদ্যমান সিস্টেম",
    E: "সমস্যা",
    F: "প্রয়োজনীয়তা",
    G: "রিপোর্টিং",
    H: "ইন্টিগ্রেশন",
    I: "অনুমোদন",
    J: "ভবিষ্যৎ দৃষ্টি",
  },
};


export const SECTION_QUESTIONS_I18N: Record<Language, Record<SectionId, string[]>> = {
  en: {
    A: [],
    B: [
      "What are the primary objectives of your department?",
      "What KPIs does your team track for performance and quality?",
      "What are the biggest challenges your department faces today?",
    ],
    C: [
      "Could you walk me through your main daily process — what triggers it and what are the key steps?",
      "Who owns this process, and what inputs and outputs does it involve?",
      "Are there approval levels or escalation paths when something goes wrong?",
    ],
    D: [
      "Which software systems or tools do you use daily — SAP modules, Excel, lab systems, or internal apps?",
      "For each tool, what works well and what causes problems?",
      "How much of your work still depends on manual Excel sheets or email?",
    ],
    E: [
      "What delays or bottlenecks do you experience most often in your workflow?",
      "Can you describe a recent example where rework or duplicate effort occurred?",
      "How frequently does this happen, and what is the business impact?",
    ],
    F: [
      "If we built an ideal system for your team, what should it be able to do?",
      "What performance, security, or mobile access requirements matter to you?",
      "What user roles would need access, and what should each role see or do?",
    ],
    G: [
      "What reports or dashboards do you need — daily, weekly, or monthly?",
      "Which KPIs must appear on those reports, and who receives them?",
      "In what format do you need exports — Excel, PDF, or live dashboards?",
    ],
    H: [
      "Which systems should integrate with a new solution — SAP, ERP, lab LIMS, HRMS, or email?",
      "What data needs to flow between systems, and how often?",
      "Are there security or compliance constraints for data exchange?",
    ],
    I: [
      "What approval hierarchy exists for charge mix changes, lab results, or production decisions?",
      "What are the SLA expectations for each approval stage?",
      "How does delegation work when approvers are unavailable?",
    ],
    J: [
      "What would an ideal system for your team look like?",
      "If you could automate one thing first, what would it be?",
      "What parts of the current process should never change?",
    ],
  },
  hi: {
    A: [],
    B: [
      "SAF भट्टी संचालन में आपके विभाग के प्रमुख उद्देश्य क्या हैं?",
      "भट्टी प्रदर्शन और धातु गुणवत्ता के लिए आपकी टीम कौन से KPI ट्रैक करती है?",
      "आज आपके विभाग को सबसे बड़ी चुनौतियाँ क्या हैं?",
    ],
    C: [
      "क्या आप मुझे भट्टी संचालन से संबंधित अपनी मुख्य दैनिक प्रक्रिया बता सकते हैं — यह कब शुरू होती है और मुख्य चरण क्या हैं?",
      "इस प्रक्रिया का स्वामी कौन है, और इसमें क्या इनपुट और आउटपुट शामिल हैं?",
      "जब कुछ गलत हो जाता है तो क्या अनुमोदन स्तर या वृद्धि मार्ग हैं?",
    ],
    D: [
      "आप रोजाना कौन से सॉफ्टवेयर सिस्टम या टूल उपयोग करते हैं — SAP मॉड्यूल, Excel, लैब सिस्टम, या आंतरिक ऐप?",
      "प्रत्येक टूल के लिए, क्या अच्छा काम करता है और क्या समस्या पैदा करता है?",
      "आपके काम का कितna हिस्सा अभी भी मैन्युअल Excel शीट या ईमेल पर निर्भर है?",
    ],
    E: [
      "आप अपने कार्यप्रवाह में सबसे अधिक किस प्रकार की देरी या बाधाएँ अनुभव करते हैं?",
      "क्या आप एक हालिया उदाहरण बता सकते हैं जहाँ पुनः कार्य या दोहराव प्रयास हुआ?",
      "यह कितनी बार होता है, और व्यापारिक प्रभाव क्या है?",
    ],
    F: [
      "यदि हम आपकी टीम के लिए एक आदर्श सिस्टम बनाएँ, तो उसे क्या करना चाहिए?",
      "आपके लिए कौन से प्रदर्शन, सुरक्षा, या मोबाइल एक्सेस आवश्यकताएँ महत्वपूर्ण हैं?",
      "किन उपयोगकर्ता भूमिकाओं को एक्सेस चाहिए, और प्रत्येक भूमिका को क्या देखना या करना चाहिए?",
    ],
    G: [
      "आपको कौन से रिपोर्ट या डैशबोर्ड चाहिए — दैनिक, साप्ताहिक, या मासिक?",
      "उन रिपोर्ट में कौन से KPI होने चाहिए, और कौन प्राप्त करता है?",
      "आपको निर्यात किस प्रारूप में चाहिए — Excel, PDF, या लाइव डैशबोर्ड?",
    ],
    H: [
      "कौन से सिस्टम नए समाधान के साथ एकीकृत होने चाहिए — SAP, ERP, लैब LIMS, HRMS, या ईमेल?",
      "सिस्टम के बीच कौन सा डेटा प्रवाहित होना चाहिए, और कितनी बार?",
      "डेटा विनिमय के लिए क्या सुरक्षा या अनुपालन बाधाएँ हैं?",
    ],
    I: [
      "चार्ज मिक्स परिवर्तन, लैब परिणाम, या उत्पादन निर्णयों के लिए क्या अनुमोदन पदानुक्रम है?",
      "प्रत्येक अनुमोदन चरण के लिए SLA अपेक्षाएँ क्या हैं?",
      "जब अनुमोदक उपलब्ध नहीं होते तो प्रतिनिधिमंडल कैसे काम करता है?",
    ],
    J: [
      "आपके लिए एक आदर्श भट्टी डेटा और संचालन सिस्टम कैसा दिखेगा?",
      "यदि आप पहले एक चीज़ स्वचालित कर सकते हैं, तो वह क्या होगी?",
      "वर्तमान प्रक्रिया के कौन से हिस्से कभी नहीं बदलने चाहिए?",
    ],
  },
  or: {
    A: [],
    B: [
      "SAF ଭଟ୍ଟି କାର୍ଯ୍ୟରେ ଆପଣଙ୍କ ବିଭାଗର ମୁଖ୍ୟ ଉଦ୍ଦେଶ୍ୟ କ'ଣ?",
      "ଭଟ୍ଟି କାର୍ଯ୍ୟଦକ୍ଷତା ଏବଂ ଧାତୁ ଗୁଣବत्तା ପାଇଁ ଆପଣଙ୍କ ଟିମ୍ କେଉଁ KPI ଟ୍ରାକ୍ କରେ?",
      "ଆଜି ଆପଣଙ୍କ ବିଭାଗର ସବୁଠାରୁ ବଡ଼ ସମସ୍ୟା କ'ଣ?",
    ],
    C: [
      "ଭଟ୍ଟି କାର୍ଯ୍ୟ ସହ ଜଡିତ ଆପଣଙ୍କ ମୁଖ୍ୟ ଦୈନିକ ପ୍ରକ୍ରିୟା ବର୍ଣ୍ଣନା କରିପାରିବେ କି — ଏହା କେବେ ଆରମ୍ଭ ହୁଏ ଏବଂ ମୁଖ୍ୟ ପଦକ୍ଷେପ କ'ଣ?",
      "ଏହି ପ୍ରକ୍ରିୟାର ମାଲିକ କିଏ, ଏବଂ ଏଥିରେ କ'ଣ input ଏବଂ output ଅଛି?",
      "କିଛି ଭୁଲ ହେଲେ ଅନୁମୋଦନ ସ୍ତର କିମ୍ବା escalation path ଅଛି କି?",
    ],
    D: [
      "ଆପଣ ଦୈନିକ କେଉଁ software system କିମ୍ବା tool ବ୍ୟବହାର କରନ୍ତି — SAP module, Excel, lab system, କିମ୍ବା internal app?",
      "ପ୍ରତ୍ୟେକ tool ପାଇଁ, କ'ଣ ଭଲ କାମ କରେ ଏବଂ କ'ଣ ସମସ୍ୟା ସୃଷ୍ଟି କରେ?",
      "ଆପଣଙ୍କ କାମର କେତେ ଅଂଶ ଏବେ ବି manual Excel sheet କିମ୍ବା email ଉପରେ ନିର୍ଭର?",
    ],
    E: [
      "ଆପଣ ଆପଣଙ୍କ workflow ରେ ସବୁଠାରୁ ଅଧିକ କେଉଁ ପ୍ରକାର delay କିମ୍ବା bottleneck ଅନୁଭବ କରନ୍ତି?",
      "ଏକ recent example ଦେଇପାରିବେ ଯେଉଁଠାରେ rework କିମ୍ବା duplicate effort ହୋଇଥିଲା?",
      "ଏହା କେତେ ଥର ଘଟେ, ଏବଂ business impact କ'ଣ?",
    ],
    F: [
      "ଯଦି ଆମେ ଆପଣଙ୍କ ଟିମ୍ ପାଇଁ ଏକ ideal system ବନାଉ, ତେବେ ଏହା କ'ଣ କରିବା ଉଚିତ?",
      "ଆପଣଙ୍କ ପାଇଁ କେଉଁ performance, security, କିମ୍ବା mobile access requirements ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ?",
      "କେଉଁ user role କୁ access ଦରକାର, ଏବଂ ପ୍ରତ୍ୟେକ role କ'ଣ ଦେଖିବା କିମ୍ବା କରିବା ଉଚିତ?",
    ],
    G: [
      "ଆପଣଙ୍କୁ କେଉଁ report କିମ୍ବା dashboard ଦରକାର — daily, weekly, କିମ୍ବା monthly?",
      "ସେହି report ରେ କେଉଁ KPI ରହିବା ଉଚିତ, ଏବଂ କିଏ ଗ୍ରହଣ କରେ?",
      "export ଆପଣଙ୍କୁ କେଉଁ format ରେ ଦରକାର — Excel, PDF, କିମ୍ବା live dashboard?",
    ],
    H: [
      "କେଉଁ system ନୂଆ solution ସହ integrate ହେବା ଉଚିତ — SAP, ERP, lab LIMS, HRMS, କିମ୍ବା email?",
      "system ମଧ୍ୟରେ କେଉଁ data flow ହେବା ଉଚିତ, ଏବଂ କେତେ ଥର?",
      "data exchange ପାଇଁ security କିମ୍ବା compliance constraints ଅଛି କି?",
    ],
    I: [
      "charge mix change, lab result, କିମ୍ବା production decision ପାଇଁ approval hierarchy କ'ଣ?",
      "ପ୍ରତ୍ୟେକ approval stage ପାଇଁ SLA expectation କ'ଣ?",
      "approver unavailable ଥିଲେ delegation କିପରି କାମ କରେ?",
    ],
    J: [
      "ଆପଣଙ୍କ ପାଇଁ ଏକ ideal furnace data ଏବଂ operations system କେମିତି ଦେଖାଯିବ?",
      "ଯଦି ଆପଣ ପ୍ରଥମେ ଗୋଟିଏ ଜିନିଷ automate କରିପାରନ୍ତେ, ତାହା କ'ଣ ହେବ?",
      "ବର୍ତ୍ତମାନ ପ୍ରକ୍ରିୟାର କେଉଁ ଅଂଶ କେବେ ବି ବଦଳିବା ଉଚିତ ନୁହେଁ?",
    ],
  },
  bn: {
    A: [],
    B: [
      "আপনার বিভাগের প্রাথমিক উদ্দেশ্যগুলো কী?",
      "কর্মক্ষমতা ও মানের জন্য আপনার দল কোন KPI ট্র্যাক করে?",
      "আজ আপনার বিভাগের সবচেয়ে বড় চ্যালেঞ্জগুলো কী?",
    ],
    C: [
      "আপনি আপনার প্রধান দৈনন্দিন প্রক্রিয়াটি বর্ণনা করতে পারেন — এটি কীভাবে শুরু হয় এবং মূল ধাপগুলো কী?",
      "এই প্রক্রিয়ার দায়িত্ব কার, এবং এর ইনপুট ও আউটপুট কী?",
      "কিছু ভুল হলে অনুমোদনের স্তর বা এসক্যালেশন পথ আছে কি?",
    ],
    D: [
      "আপনি প্রতিদিন কোন সফটওয়্যার সিস্টেম বা টুল ব্যবহার করেন — SAP, Excel, ল্যাব সিস্টেম, বা অভ্যন্তরীণ অ্যাপ?",
      "প্রতিটি টুলের জন্য, কী ভালো কাজ করে এবং কী সমস্যা সৃষ্টি করে?",
      "আপনার কাজের কতটা এখনও ম্যানুয়াল Excel বা ইমেইলের উপর নির্ভরশীল?",
    ],
    E: [
      "আপনি আপনার ওয়ার্কফ্লোতে সবচেয়ে বেশি কোন ধরনের দেরি বা বাধা অনুভব করেন?",
      "সম্প্রতি এমন একটি উদাহরণ দিতে পারেন যেখানে পুনরায় কাজ বা ডুপ্লিকেট প্রচেষ্টা হয়েছিল?",
      "এটি কতবার ঘটে, এবং ব্যবসায়িক প্রভাব কী?",
    ],
    F: [
      "আমরা যদি আপনার দলের জন্য একটি আদর্শ সিস্টেম তৈরি করি, তাহলে এটি কী করতে পারবে?",
      "কোন পারফরম্যান্স, নিরাপত্তা, বা মোবাইল অ্যাক্সেস প্রয়োজনীয়তা আপনার জন্য গুরুত্বপূর্ণ?",
      "কোন ব্যবহারকারী ভূমিকাগুলোর অ্যাক্সেস দরকার, এবং প্রতিটি ভূমিকা কী দেখবে বা করবে?",
    ],
    G: [
      "আপনার কোন রিপোর্ট বা ড্যাশবোর্ড দরকার — দৈনিক, সাপ্তাহিক, বা মাসিক?",
      "সেই রিপোর্টে কোন KPI থাকতে হবে, এবং কে গ্রহণ করে?",
      "আপনার এক্সপোর্ট কোন ফরম্যাটে দরকার — Excel, PDF, বা লাইভ ড্যাশবোর্ড?",
    ],
    H: [
      "কোন সিস্টেমগুলো নতুন সমাধানের সাথে ইন্টিগ্রেট হওয়া উচিত — SAP, ERP, ল্যাব LIMS, HRMS, বা ইমেইল?",
      "সিস্টেমগুলোর মধ্যে কোন ডেটা প্রবাহিত হওয়া উচিত, এবং কতবার?",
      "ডেটা বিনিময়ের জন্য নিরাপত্তা বা সম্মতি সীমাবদ্ধতা আছে কি?",
    ],
    I: [
      "চার্জ মিক্স পরিবর্তন, ল্যাব ফলাফল, বা উৎপাদন সিদ্ধান্তের জন্য অনুমোদনের কাঠামো কী?",
      "প্রতিটি অনুমোদন 단계ের SLA প্রত্যাশা কী?",
      "অনুমোদনকারী অনুপলব্ধ থাকলে প্রতিনিধিত্ব কীভাবে কাজ করে?",
    ],
    J: [
      "আপনার জন্য একটি আদর্শ সিস্টেম কেমন দেখাবে?",
      "আপনি যদি প্রথমে একটি জিনিস অটোমেট করতে পারেন, তাহলে সেটা কী হবে?",
      "বর্তমান প্রক্রিয়ার কোন অংশ কখনো পরিবর্তন হওয়া উচিত নয়?",
    ],
  },
};

export function getWelcomeMessage(
  lang: Language,
  name: string,
  designation: string,
  companyName: string
): string {
  if (lang === "en") {
    return `Thank you, ${name}. I've recorded your details as ${designation} at ${companyName}.\n\nLet's begin our conversation about your operations and processes. I'll ask one question at a time.\n\n${SECTION_QUESTIONS_I18N.en.B[0]}`;
  }
  return getWelcomeMessageBilingual(lang, name, designation, companyName).locale;
}

export function getWelcomeMessageBilingual(
  lang: PreferredLanguage,
  name: string,
  designation: string,
  companyName: string
): { en: string; locale: string } {
  const en = `Thank you, ${name}. I've recorded your details as ${designation} at ${companyName}.\n\nLet's begin our conversation about your operations and processes. I'll ask one question at a time.\n\n${SECTION_QUESTIONS_I18N.en.B[0]}`;
  const localeTemplates: Record<PreferredLanguage, string> = {
    hi: `धन्यवाद, ${name}। मैंने ${companyName} में आपका विवरण ${designation} के रूप में दर्ज कर लिया है।\n\nआइए आपके संचालन और प्रक्रियाओं के बारे में बातचीत शुरू करें। मैं एक समय में एक प्रश्न पूछूँगा।\n\n${SECTION_QUESTIONS_I18N.hi.B[0]}`,
    or: `ଧନ୍ୟବାଦ, ${name}। ମୁଁ ${companyName} ରେ ${designation} ଭାବରେ ଆପଣଙ୍କ ବିବରଣୀ ରେକର୍ଡ କରିଛି।\n\nଆପଣଙ୍କ operations ଏବଂ processes ବିଷୟରେ ଆମ କଥୋପକଥନ ଆରମ୍ଭ କରିବା। ମୁଁ ଏକ ସମୟରେ ଗୋଟିଏ ପ୍ରଶ୍ନ ପଚରିବି।\n\n${SECTION_QUESTIONS_I18N.or.B[0]}`,
    bn: `ধন্যবাদ, ${name}। আমি ${companyName}-এ ${designation} হিসেবে আপনার বিবরণ রেকর্ড করেছি।\n\nআপনার অপারেশন ও প্রক্রিয়া নিয়ে আমাদের কথোপকথন শুরু করি। আমি একবারে একটি প্রশ্ন করব।\n\n${SECTION_QUESTIONS_I18N.bn.B[0]}`,
  };
  return { en, locale: localeTemplates[lang] };
}

export function getAcknowledgments(lang: Language): string[] {
  const acks: Record<Language, string[]> = {
    en: [
      "That's helpful — thank you for sharing that.",
      "I understand. Let me explore this further.",
      "Interesting. That gives me good context.",
    ],
    hi: [
      "यह सहायक है — साझा करने के लिए धन्यवाद।",
      "मैं समझ गया। मुझे इसे और जानने दें।",
      "दिलचस्प। इससे मुझे अच्छा संदर्भ मिला।",
    ],
    or: [
      "ଏହା ସ helpful — ସାଝା କରିଥିବା ପାଇଁ ଧନ୍ୟବାଦ।",
      "ମୁଁ ବୁଝିଲି। ମୁଁ ଏହାକୁ ଆହୁରି ଜାଣିବି।",
      "ଆକର୍ଷଣୀୟ। ଏହା ମୋତେ ଭଲ context ଦେଇଛି।",
    ],
    bn: [
      "এটি সহায়ক — শেয়ার করার জন্য ধন্যবাদ।",
      "আমি বুঝেছি। আমাকে আরও জানতে দিন।",
      "আকর্ষণীয়। এটি আমাকে ভালো প্রসঙ্গ দিয়েছে।",
    ],
  };
  return acks[lang];
}

export function getFollowUps(lang: Language): {
  short: string;
  excel: string;
  sap: string;
  furnace: string;
  lab: string;
} {
  const followUps: Record<
    Language,
    { short: string; excel: string; sap: string; furnace: string; lab: string }
  > = {
    en: {
      short:
        "Could you help me understand that better — perhaps with a specific example from your recent work?",
      excel: "Approximately how many Excel files are involved, and who maintains them?",
      sap: "Which SAP modules are currently involved in this process?",
      furnace: "Which furnace(s) does this relate to — SAF-3, SAF-4, or both?",
      lab: "What is the typical turnaround from sample collection to reported results?",
    },
    hi: {
      short:
        "क्या आप इसे बेहतर समझाने में मदद कर सकते हैं — शायद अपने हाल के काम से एक उदाहरण देकर?",
      excel: "लगभग कितनी Excel फ़ाइलें शामिल हैं, और उन्हें कौन बनाए रखता है?",
      sap: "इस प्रक्रिया में वर्तमान में कौन से SAP मॉड्यूल शामिल हैं?",
      furnace: "यह किस भट्टी से संबंधित है — SAF-3, SAF-4, या दोनों?",
      lab: "नमूना संग्रह से रिपोर्ट परिणाम तक की typical turnaround क्या है?",
    },
    or: {
      short:
        "ଆପଣ ଏହାକୁ ଭଲ ଭାବରେ ବୁଝାଇପାରିବେ କି — ଆପଣଙ୍କ recent work ରୁ ଏକ example ଦେଇ?",
      excel: "ପ୍ରାୟ କେତେ Excel file ଅଛି, ଏବଂ କିଏ maintain କରେ?",
      sap: "ଏହି ପ୍ରକ୍ରିୟାରେ ବର୍ତ୍ତମାନ କେଉଁ SAP module ଅଛି?",
      furnace: "ଏହା କେଉଁ furnace ସହ ଜଡିତ — SAF-3, SAF-4, କିମ୍ବା ଉଭୟ?",
      lab: "sample collection ରୁ reported result ପର୍ଯ୍ୟନ୍ତ typical turnaround କ'ଣ?",
    },
    bn: {
      short:
        "আপনি কি এটি আরও ভালোভাবে বুঝতে সাহায্য করতে পারেন — হয়তো আপনার সাম্প্রতিক কাজ থেকে একটি উদাহরণ দিয়ে?",
      excel: "প্রায় কতগুলো Excel ফাইল জড়িত, এবং কে সেগুলো রক্ষণাবেক্ষণ করে?",
      sap: "এই প্রক্রিয়ায় বর্তমানে কোন SAP মডিউলগুলো জড়িত?",
      furnace: "এটি কোন ফার্নেসের সাথে সম্পর্কিত — SAF-3, SAF-4, নাকি উভয়?",
      lab: "নমুনা সংগ্রহ থেকে রিপোর্টেড ফলাফল পর্যন্ত সাধারণ সময় কত?",
    },
  };
  return followUps[lang];
}

export function languageInstruction(lang: Language): string {
  const names: Record<Language, string> = {
    en: "English",
    hi: "Hindi (हिन्दी)",
    or: "Odia (ଓଡ଼ିଆ)",
    bn: "Bengali (বাংলা)",
  };
  return `IMPORTANT: Respond ONLY in ${names[lang]}. All questions and acknowledgments must be in ${names[lang]}.`;
}
