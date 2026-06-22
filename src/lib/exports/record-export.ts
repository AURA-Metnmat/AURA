import { db } from "@/lib/db";
import type { AdminSession } from "@/lib/auth/admin-rbac";

export const EXPORT_TYPES = {
  INTERVIEW: "interview",
  KNOWLEDGE_ML: "knowledge_ml",
} as const;

export type ExportType = (typeof EXPORT_TYPES)[keyof typeof EXPORT_TYPES];

export const EXPORT_TYPE_LABELS: Record<ExportType, string> = {
  interview: "Interview workbook",
  knowledge_ml: "Experience / ML export",
};

export interface RecordDataExportInput {
  companyId: string;
  exportType: ExportType;
  format: string;
  filter?: string | null;
  recordCount?: number;
  fileName?: string | null;
  session?: AdminSession | null;
  actorEmail?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordDataExport(input: RecordDataExportInput): Promise<void> {
  await db.dataExportLog.create({
    data: {
      companyId: input.companyId,
      exportType: input.exportType,
      format: input.format,
      filter: input.filter ?? null,
      recordCount: input.recordCount ?? 0,
      fileName: input.fileName ?? null,
      actorEmail: input.actorEmail ?? input.session?.email ?? null,
      adminUserId: input.session?.adminUserId ?? null,
      status: "completed",
      metadata:
        input.metadata && Object.keys(input.metadata).length > 0
          ? JSON.stringify(input.metadata)
          : null,
    },
  });
}

export interface ExportLogRow {
  id: string;
  exportType: ExportType;
  exportTypeLabel: string;
  format: string;
  filter: string | null;
  recordCount: number;
  fileName: string | null;
  actorEmail: string | null;
  status: string;
  createdAt: string;
}

export async function listCompanyExportLogs(
  companyId: string,
  limit = 50
): Promise<ExportLogRow[]> {
  const rows = await db.dataExportLog.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
  });

  return rows.map((row) => {
    const exportType = row.exportType as ExportType;
    return {
      id: row.id,
      exportType,
      exportTypeLabel:
        EXPORT_TYPE_LABELS[exportType] ?? row.exportType.replace(/_/g, " "),
      format: row.format,
      filter: row.filter,
      recordCount: row.recordCount,
      fileName: row.fileName,
      actorEmail: row.actorEmail,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    };
  });
}

export function formatExportSummary(row: Pick<ExportLogRow, "format" | "filter" | "recordCount">): string {
  const parts = [row.format.toUpperCase()];
  if (row.filter) parts.push(row.filter.replace(/_/g, " "));
  if (row.recordCount > 0) parts.push(`${row.recordCount} records`);
  return parts.join(" · ");
}
