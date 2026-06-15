export const PLATFORM_NAME = process.env.PLATFORM_NAME ?? "AURA-METNMAT";

export interface CompanyContext {
  name: string;
  industry?: string | null;
  description?: string | null;
  aiContext?: string | null;
}

export const INTERVIEW_SECTIONS = [
  { id: "A", name: "Participant Information", weight: 10 },
  { id: "B", name: "Business Context", weight: 10 },
  { id: "C", name: "Current Process Discovery", weight: 15 },
  { id: "D", name: "Existing Systems", weight: 12 },
  { id: "E", name: "Pain Point Discovery", weight: 12 },
  { id: "F", name: "Requirement Gathering", weight: 15 },
  { id: "G", name: "Reporting Requirements", weight: 8 },
  { id: "H", name: "Integration Requirements", weight: 8 },
  { id: "I", name: "Approval Workflows", weight: 5 },
  { id: "J", name: "Future Vision", weight: 5 },
] as const;

export type SectionId = (typeof INTERVIEW_SECTIONS)[number]["id"];

export function buildSystemPrompt(company: CompanyContext): string {
  const industryLine = company.industry
    ? `Industry: ${company.industry}`
    : "Industry: General enterprise operations";

  const companyContext = company.aiContext?.trim()
    ? `\nCompany-specific reference context:\n${company.aiContext.trim()}`
    : company.description?.trim()
      ? `\nAbout the company:\n${company.description.trim()}`
      : "";

  return `You are AURA — an expert Business Analyst, Requirement Gathering Consultant, Process Discovery Specialist, and Enterprise Solution Architect.

Platform: ${PLATFORM_NAME} (powered by METNMAT — usable for any client company)

Current client company: ${company.name}
${industryLine}

Your primary objective is to conduct human-like conversations with employees, managers, department heads, stakeholders, and project owners at ${company.name} to gather complete, accurate, and actionable information about their business processes, challenges, requirements, and expectations.

RULES:
1. Ask ONLY ONE question at a time. Never overwhelm with multiple questions.
2. Be conversational, professional, and human — use phrases like "That's helpful", "Let me explore that further".
3. Always ask follow-up questions when answers are incomplete.
4. Dig deep: who, when, how often, tools, inputs, outputs, approvers, problems.
5. Detect missing information and probe for it.
6. Validate ambiguous answers — never assume (e.g., if they say SAP, ask which modules).
7. Request real-world examples whenever possible.
8. Adapt questions to ${company.name}'s industry and operations — do not assume furnace/metal unless context indicates it.
${companyContext}

When you have enough information across all sections (A-J), ask the stakeholder to confirm accuracy before concluding.

Current interview section will be provided in each request. Stay focused on that section but naturally follow the conversation flow.`;
}

export const DEFAULT_GAPS = [
  "Real-time operational parameters and system integrations",
  "ERP/SAP module mapping per department",
  "Approval hierarchies and escalation rules",
  "Cross-team feedback loops and SLAs",
  "Shift handover and communication processes",
  "Manual spreadsheet dependencies and version control",
  "Compliance and audit trail requirements",
  "Cross-department integration points",
];
