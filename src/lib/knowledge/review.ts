import { createHash } from "crypto";

export const REVIEW_STATUS = {
  PENDING: "PENDING",
  VALIDATED: "VALIDATED",
  NEEDS_ATTENTION: "NEEDS_ATTENTION",
  REJECTED: "REJECTED",
} as const;

export type ReviewStatus = (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS];

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  PENDING: "Pending review",
  VALIDATED: "Validated",
  NEEDS_ATTENTION: "Needs attention",
  REJECTED: "Rejected",
};

export const TOPIC_CATEGORIES = [
  { id: "process", label: "Process & Workflow" },
  { id: "equipment", label: "Equipment & Operations" },
  { id: "safety", label: "Safety & Compliance" },
  { id: "quality", label: "Quality & Standards" },
  { id: "tacit", label: "Tacit / Tribal Knowledge" },
  { id: "pain_point", label: "Pain Point" },
  { id: "requirement", label: "Requirement" },
  { id: "integration", label: "Systems & Integration" },
  { id: "reporting", label: "Reporting & KPIs" },
  { id: "people", label: "People & Roles" },
  { id: "gap", label: "Knowledge Gap" },
  { id: "other", label: "Other" },
] as const;

export type TopicCategoryId = (typeof TOPIC_CATEGORIES)[number]["id"];

const TOPIC_SET = new Set<string>(TOPIC_CATEGORIES.map((c) => c.id));

export function isReviewStatus(value: string): value is ReviewStatus {
  return Object.values(REVIEW_STATUS).includes(value as ReviewStatus);
}

export function isTopicCategory(value: string): value is TopicCategoryId {
  return TOPIC_SET.has(value);
}

export function chunkContentHash(
  content: string,
  sourceKind: string,
  sourceId?: string | null
): string {
  return createHash("sha256")
    .update(`${sourceKind}|${sourceId ?? ""}|${content}`)
    .digest("hex")
    .slice(0, 24);
}

export function inferTopicCategory(sourceKind: string): TopicCategoryId {
  switch (sourceKind) {
    case "pain_point":
      return "pain_point";
    case "requirement":
      return "requirement";
    case "process":
      return "process";
    case "attachment":
      return "tacit";
    case "report":
      return "process";
    case "interview_message":
      return "tacit";
    case "integration":
      return "integration";
    case "reporting":
      return "reporting";
    default:
      return "other";
  }
}

export function parseChunkMetadata(metadata: string | null): Record<string, unknown> {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function topicCategoryLabel(id: string | null | undefined): string {
  if (!id) return "Uncategorized";
  return TOPIC_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
