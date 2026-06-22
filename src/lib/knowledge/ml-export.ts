import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { SOURCE_TYPE } from "@/lib/knowledge/indexer";
import {
  REVIEW_STATUS,
  TOPIC_CATEGORIES,
  type ReviewStatus,
  parseChunkMetadata,
  topicCategoryLabel,
  type TopicCategoryId,
} from "@/lib/knowledge/review";

export type MlExportFilter = "validated" | "all" | "needs_attention" | "pending" | "rejected";

export interface MlExportRecord {
  id: string;
  text: string;
  reviewStatus: string;
  topicCategory: string;
  topicCategoryLabel: string;
  sourceKind: string;
  sourceLabel: string;
  sourceId: string | null;
  sessionId: string | null;
  participant: string | null;
  charCount: number;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

function statusFilter(filter: MlExportFilter): ReviewStatus[] | undefined {
  switch (filter) {
    case "validated":
      return [REVIEW_STATUS.VALIDATED];
    case "needs_attention":
      return [REVIEW_STATUS.NEEDS_ATTENTION];
    case "pending":
      return [REVIEW_STATUS.PENDING];
    case "rejected":
      return [REVIEW_STATUS.REJECTED];
    default:
      return undefined;
  }
}

export async function fetchExperienceForExport(
  companySlug: string,
  filter: MlExportFilter = "validated"
): Promise<MlExportRecord[]> {
  const statuses = statusFilter(filter);

  const chunks = await db.knowledgeChunk.findMany({
    where: {
      companySlug,
      sourceType: SOURCE_TYPE.EXPERIENCE,
      ...(statuses ? { reviewStatus: { in: statuses } } : {}),
    },
    orderBy: [{ reviewStatus: "asc" }, { updatedAt: "desc" }],
  });

  return chunks.map((c) => {
    const meta = parseChunkMetadata(c.metadata);
    return {
      id: c.id,
      text: c.content,
      reviewStatus: c.reviewStatus ?? REVIEW_STATUS.PENDING,
      topicCategory: c.topicCategory ?? "other",
      topicCategoryLabel: topicCategoryLabel(c.topicCategory),
      sourceKind: c.sourceKind,
      sourceLabel: c.sourceLabel,
      sourceId: c.sourceId,
      sessionId: typeof meta.sessionId === "string" ? meta.sessionId : null,
      participant: typeof meta.participant === "string" ? meta.participant : null,
      charCount: c.charCount,
      reviewedAt: c.reviewedAt?.toISOString() ?? null,
      reviewedBy: c.reviewedBy,
      reviewNotes: c.reviewNotes,
      createdAt: c.createdAt.toISOString(),
    };
  });
}

export function buildMlJsonl(records: MlExportRecord[]): string {
  return records
    .map((r) =>
      JSON.stringify({
        text: r.text,
        label: r.topicCategory,
        label_name: r.topicCategoryLabel,
        status: r.reviewStatus,
        source_kind: r.sourceKind,
        source_label: r.sourceLabel,
        session_id: r.sessionId,
        participant: r.participant,
        metadata: {
          id: r.id,
          reviewed_at: r.reviewedAt,
          reviewed_by: r.reviewedBy,
          review_notes: r.reviewNotes,
        },
      })
    )
    .join("\n");
}

export function buildMlWorkbook(records: MlExportRecord[], companySlug: string): Buffer {
  const wb = XLSX.utils.book_new();

  const mainSheet = XLSX.utils.json_to_sheet(
    records.map((r) => ({
      ID: r.id,
      Text: r.text,
      "Review Status": r.reviewStatus,
      Category: r.topicCategoryLabel,
      "Category ID": r.topicCategory,
      "Source Kind": r.sourceKind,
      "Source Label": r.sourceLabel,
      Participant: r.participant ?? "",
      "Session ID": r.sessionId ?? "",
      "Char Count": r.charCount,
      "Review Notes": r.reviewNotes ?? "",
      "Reviewed By": r.reviewedBy ?? "",
      "Reviewed At": r.reviewedAt ?? "",
      "Created At": r.createdAt,
    }))
  );
  XLSX.utils.book_append_sheet(wb, mainSheet, "Training Data");

  const byCategory = records.reduce<Record<string, number>>((acc, r) => {
    const key = r.topicCategoryLabel;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const summarySheet = XLSX.utils.json_to_sheet(
    Object.entries(byCategory).map(([category, count]) => ({ Category: category, Count: count }))
  );
  XLSX.utils.book_append_sheet(wb, summarySheet, "By Category");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return buffer;
}

export function filterLabel(filter: MlExportFilter): string {
  switch (filter) {
    case "validated":
      return "validated";
    case "needs_attention":
      return "needs-attention";
    case "pending":
      return "pending";
    case "rejected":
      return "rejected";
    default:
      return "all-experience";
  }
}

export function normalizeExportFilter(value: string | null): MlExportFilter {
  if (
    value === "validated" ||
    value === "all" ||
    value === "needs_attention" ||
    value === "pending" ||
    value === "rejected"
  ) {
    return value;
  }
  return "validated";
}

export function normalizeTopicFilter(value: string | null): TopicCategoryId | undefined {
  if (!value) return undefined;
  const found = TOPIC_CATEGORIES.find((c) => c.id === value);
  return found?.id;
}
