import { db } from "@/lib/db";
import { splitTextIntoChunks } from "./chunk-text";

export const SOURCE_TYPE = {
  REFERENCE: "REFERENCE",
  EXPERIENCE: "EXPERIENCE",
} as const;

type SourceType = (typeof SOURCE_TYPE)[keyof typeof SOURCE_TYPE];

interface ChunkInput {
  companySlug: string;
  sourceType: SourceType;
  sourceKind: string;
  sourceId?: string;
  sourceLabel: string;
  content: string;
  metadata?: Record<string, unknown>;
}

const MAX_RECORDS_PER_COMPANY = 8000;
const ROWS_PER_CHUNK = 25;

function toChunkRows(inputs: ChunkInput[]): {
  companySlug: string;
  sourceType: string;
  sourceKind: string;
  sourceId: string | null;
  sourceLabel: string;
  content: string;
  charCount: number;
  metadata: string | null;
}[] {
  const rows: ReturnType<typeof toChunkRows> = [];

  for (const input of inputs) {
    const parts = splitTextIntoChunks(input.content);
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      rows.push({
        companySlug: input.companySlug,
        sourceType: input.sourceType,
        sourceKind: input.sourceKind,
        sourceId: input.sourceId ?? null,
        sourceLabel:
          parts.length > 1 ? `${input.sourceLabel} (part ${i + 1}/${parts.length})` : input.sourceLabel,
        content: part,
        charCount: part.length,
        metadata: input.metadata ? JSON.stringify({ ...input.metadata, part: i + 1 }) : null,
      });
    }
  }

  return rows;
}

async function replaceChunks(
  companySlug: string,
  sourceType: SourceType,
  inputs: ChunkInput[]
): Promise<number> {
  await db.knowledgeChunk.deleteMany({ where: { companySlug, sourceType } });

  const rows = toChunkRows(inputs);
  if (rows.length === 0) return 0;

  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    await db.knowledgeChunk.createMany({ data: rows.slice(i, i + batchSize) });
  }

  return rows.length;
}

function formatRecordRow(data: string): string {
  try {
    const obj = JSON.parse(data) as Record<string, unknown>;
    return Object.entries(obj)
      .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
      .map(([k, v]) => `${k}: ${v}`)
      .join(" | ");
  } catch {
    return data;
  }
}

export async function indexReferenceKnowledge(companySlug: string): Promise<number> {
  const inputs: ChunkInput[] = [];

  const [pdfs, insights, furnaceSpecs, files] = await Promise.all([
    db.pdfDocument.findMany({ where: { companySlug }, orderBy: { createdAt: "asc" } }),
    db.dataInsight.findMany({
      where: { file: { companySlug } },
      orderBy: { priority: "asc" },
    }),
    db.furnaceSpec.findMany({ where: { companySlug }, orderBy: { parameter: "asc" } }),
    db.dataFile.findMany({ where: { companySlug }, orderBy: { importedAt: "desc" } }),
  ]);

  for (const pdf of pdfs) {
    const body = (pdf.content || pdf.summary || "").trim();
    if (!body) continue;
    const kind = pdf.fileName.toLowerCase().endsWith(".pdf") ? "pdf" : "document";
    inputs.push({
      companySlug,
      sourceType: SOURCE_TYPE.REFERENCE,
      sourceKind: kind,
      sourceId: pdf.id,
      sourceLabel: pdf.fileName,
      content: body,
      metadata: { pageCount: pdf.pageCount },
    });
  }

  for (const insight of insights) {
    inputs.push({
      companySlug,
      sourceType: SOURCE_TYPE.REFERENCE,
      sourceKind: "insight",
      sourceId: insight.id,
      sourceLabel: insight.title,
      content: `${insight.title}\nCategory: ${insight.category}\nPriority: ${insight.priority}\n\n${insight.content}`,
      metadata: { category: insight.category, priority: insight.priority },
    });
  }

  if (furnaceSpecs.length > 0) {
    const grouped = furnaceSpecs.reduce<Record<string, string[]>>((acc, spec) => {
      const key = spec.furnaceNumber;
      if (!acc[key]) acc[key] = [];
      acc[key]!.push(`${spec.parameter}: ${spec.value}${spec.unit ? ` ${spec.unit}` : ""}`);
      return acc;
    }, {});

    for (const [furnace, lines] of Object.entries(grouped)) {
      inputs.push({
        companySlug,
        sourceType: SOURCE_TYPE.REFERENCE,
        sourceKind: "furnace",
        sourceLabel: `Furnace ${furnace} specifications`,
        content: lines.join("\n"),
        metadata: { furnaceNumber: furnace },
      });
    }
  }

  for (const file of files) {
    const records = await db.dataRecord.findMany({
      where: { fileId: file.id },
      orderBy: { rowIndex: "asc" },
      take: MAX_RECORDS_PER_COMPANY,
      include: { sheet: true },
    });

    if (records.length === 0) {
      if (file.description) {
        inputs.push({
          companySlug,
          sourceType: SOURCE_TYPE.REFERENCE,
          sourceKind: "excel_meta",
          sourceId: file.id,
          sourceLabel: file.fileName,
          content: `${file.fileName}\nCategory: ${file.category}\n${file.description}`,
          metadata: { rowCount: file.rowCount, sheetCount: file.sheetCount },
        });
      }
      continue;
    }

    const bySheet = records.reduce<Record<string, typeof records>>((acc, row) => {
      const key = row.sheetId ?? "default";
      if (!acc[key]) acc[key] = [];
      acc[key]!.push(row);
      return acc;
    }, {});

    for (const sheetRows of Object.values(bySheet)) {
      const sheetName = sheetRows[0]?.sheet?.sheetName ?? "Data";
      for (let i = 0; i < sheetRows.length; i += ROWS_PER_CHUNK) {
        const batch = sheetRows.slice(i, i + ROWS_PER_CHUNK);
        const lines = batch.map((r) => formatRecordRow(r.data)).filter(Boolean);
        if (lines.length === 0) continue;
        inputs.push({
          companySlug,
          sourceType: SOURCE_TYPE.REFERENCE,
          sourceKind: "excel_row",
          sourceId: file.id,
          sourceLabel: `${file.fileName} · ${sheetName} (rows ${batch[0]!.rowIndex + 1}–${batch[batch.length - 1]!.rowIndex + 1})`,
          content: lines.join("\n"),
          metadata: {
            fileName: file.fileName,
            category: file.category,
            sheetName,
          },
        });
      }
    }
  }

  return replaceChunks(companySlug, SOURCE_TYPE.REFERENCE, inputs);
}

export async function indexExperienceKnowledge(
  companySlug: string,
  companyId: string
): Promise<number> {
  const inputs: ChunkInput[] = [];

  const sessions = await db.interviewSession.findMany({
    where: { companyId },
    include: {
      participant: true,
      messages: { orderBy: { createdAt: "asc" } },
      painPoints: true,
      requirements: true,
      processes: true,
      attachments: true,
      report: true,
    },
    orderBy: { startedAt: "desc" },
  });

  for (const session of sessions) {
    const person = session.participant?.fullName ?? "Employee";
    const role = [session.participant?.designation, session.participant?.department]
      .filter(Boolean)
      .join(", ");

    const userMessages = session.messages
      .filter((m) => m.role === "user" && m.content.trim().length > 8)
      .map((m) => m.content.trim());

    if (userMessages.length > 0) {
      const header = `Tacit knowledge from ${person}${role ? ` (${role})` : ""} — interview ${new Date(session.startedAt).toLocaleDateString()}`;
      const batchSize = 6;
      for (let i = 0; i < userMessages.length; i += batchSize) {
        const batch = userMessages.slice(i, i + batchSize);
        inputs.push({
          companySlug,
          sourceType: SOURCE_TYPE.EXPERIENCE,
          sourceKind: "interview_message",
          sourceId: session.id,
          sourceLabel: `${person} — conversation excerpt`,
          content: `${header}\n\n${batch.map((m, idx) => `Q/A ${i + idx + 1}: ${m}`).join("\n\n")}`,
          metadata: {
            sessionId: session.id,
            participant: person,
            status: session.status,
          },
        });
      }
    }

    for (const pp of session.painPoints) {
      inputs.push({
        companySlug,
        sourceType: SOURCE_TYPE.EXPERIENCE,
        sourceKind: "pain_point",
        sourceId: pp.id,
        sourceLabel: `${person} — pain point: ${pp.title}`,
        content: `Pain point (${pp.severity}): ${pp.title}\n${pp.description ?? ""}`.trim(),
        metadata: { sessionId: session.id, severity: pp.severity },
      });
    }

    for (const req of session.requirements) {
      inputs.push({
        companySlug,
        sourceType: SOURCE_TYPE.EXPERIENCE,
        sourceKind: "requirement",
        sourceId: req.id,
        sourceLabel: `${person} — requirement: ${req.title}`,
        content: `Requirement [${req.type}/${req.priority}]: ${req.title}\n${req.description ?? ""}`.trim(),
        metadata: { sessionId: session.id },
      });
    }

    for (const proc of session.processes) {
      inputs.push({
        companySlug,
        sourceType: SOURCE_TYPE.EXPERIENCE,
        sourceKind: "process",
        sourceId: proc.id,
        sourceLabel: `${person} — process: ${proc.processName}`,
        content: [
          `Process: ${proc.processName}`,
          proc.objective ? `Objective: ${proc.objective}` : "",
          proc.steps ? `Steps: ${proc.steps}` : "",
          proc.toolsUsed ? `Tools: ${proc.toolsUsed}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        metadata: { sessionId: session.id },
      });
    }

    for (const att of session.attachments) {
      const text = att.extractedText?.trim();
      if (!text || text.length < 20) continue;
      inputs.push({
        companySlug,
        sourceType: SOURCE_TYPE.EXPERIENCE,
        sourceKind: "attachment",
        sourceId: att.id,
        sourceLabel: `${person} — uploaded file: ${att.fileName}`,
        content: `File: ${att.fileName}\n\n${text}`,
        metadata: { sessionId: session.id, fileType: att.fileType },
      });
    }

    if (session.report) {
      const r = session.report;
      const sections = [
        ["Executive Summary", r.executiveSummary],
        ["Process Documentation", r.processDocumentation],
        ["Requirements", r.requirements],
        ["Pain Points", r.painPointsSummary],
        ["Recommendations", r.recommendations],
        ["Action Items", r.actionItems],
        ["Risks", r.risks],
      ].filter(([, v]) => v?.trim());

      if (sections.length > 0) {
        inputs.push({
          companySlug,
          sourceType: SOURCE_TYPE.EXPERIENCE,
          sourceKind: "report",
          sourceId: session.id,
          sourceLabel: `${person} — interview report`,
          content: sections.map(([title, body]) => `## ${title}\n${body}`).join("\n\n"),
          metadata: { sessionId: session.id, status: session.status },
        });
      }
    }
  }

  return replaceChunks(companySlug, SOURCE_TYPE.EXPERIENCE, inputs);
}

export async function reindexCompanyKnowledge(params: {
  companySlug: string;
  companyId: string;
  scope?: "all" | "reference" | "experience";
}): Promise<{ reference: number; experience: number }> {
  const scope = params.scope ?? "all";
  let reference = 0;
  let experience = 0;

  if (scope === "all" || scope === "reference") {
    reference = await indexReferenceKnowledge(params.companySlug);
  }
  if (scope === "all" || scope === "experience") {
    experience = await indexExperienceKnowledge(params.companySlug, params.companyId);
  }

  return { reference, experience };
}

export async function getKnowledgeStats(companySlug: string) {
  const [reference, experience, byKind, latest] = await Promise.all([
    db.knowledgeChunk.count({ where: { companySlug, sourceType: SOURCE_TYPE.REFERENCE } }),
    db.knowledgeChunk.count({ where: { companySlug, sourceType: SOURCE_TYPE.EXPERIENCE } }),
    db.knowledgeChunk.groupBy({
      by: ["sourceKind"],
      where: { companySlug },
      _count: { id: true },
    }),
    db.knowledgeChunk.findFirst({
      where: { companySlug },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  return {
    reference,
    experience,
    total: reference + experience,
    lastIndexedAt: latest?.updatedAt?.toISOString() ?? null,
    byKind: Object.fromEntries(byKind.map((k) => [k.sourceKind, k._count.id])),
  };
}
