import { db } from "@/lib/db";
import { splitTextIntoChunks } from "./chunk-text";
import {
  REVIEW_STATUS,
  chunkContentHash,
  inferTopicCategory,
} from "./review";

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
  const baseRows = toChunkRows(inputs);
  const isExperience = sourceType === SOURCE_TYPE.EXPERIENCE;

  let reviewByHash = new Map<
    string,
    {
      reviewStatus: string | null;
      topicCategory: string | null;
      reviewNotes: string | null;
      reviewedAt: Date | null;
      reviewedBy: string | null;
    }
  >();

  if (isExperience) {
    const existing = await db.knowledgeChunk.findMany({
      where: { companySlug, sourceType: SOURCE_TYPE.EXPERIENCE },
      select: {
        contentHash: true,
        reviewStatus: true,
        topicCategory: true,
        reviewNotes: true,
        reviewedAt: true,
        reviewedBy: true,
      },
    });
    reviewByHash = new Map(
      existing
        .filter((e) => e.contentHash)
        .map((e) => [
          e.contentHash!,
          {
            reviewStatus: e.reviewStatus,
            topicCategory: e.topicCategory,
            reviewNotes: e.reviewNotes,
            reviewedAt: e.reviewedAt,
            reviewedBy: e.reviewedBy,
          },
        ])
    );
  }

  const rows = baseRows.map((row) => {
    const hash = chunkContentHash(row.content, row.sourceKind, row.sourceId);
    const preserved = isExperience ? reviewByHash.get(hash) : undefined;

    return {
      ...row,
      contentHash: hash,
      reviewStatus: isExperience
        ? (preserved?.reviewStatus ?? REVIEW_STATUS.PENDING)
        : null,
      topicCategory: isExperience
        ? (preserved?.topicCategory ?? inferTopicCategory(row.sourceKind))
        : null,
      reviewNotes: isExperience ? (preserved?.reviewNotes ?? null) : null,
      reviewedAt: isExperience ? (preserved?.reviewedAt ?? null) : null,
      reviewedBy: isExperience ? (preserved?.reviewedBy ?? null) : null,
    };
  });

  if (rows.length === 0) {
    await db.knowledgeChunk.deleteMany({ where: { companySlug, sourceType } });
    return 0;
  }

  await db.knowledgeChunk.deleteMany({ where: { companySlug, sourceType } });

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
      employee: { select: { id: true, employeeCode: true } },
      messages: { orderBy: { createdAt: "asc" } },
      answers: { orderBy: { createdAt: "asc" } },
      painPoints: true,
      requirements: true,
      processes: true,
      integrations: true,
      reporting: true,
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
    const baseMeta = {
      sessionId: session.id,
      participant: person,
      employeeId: session.employeeId,
      employeeCode: session.employee?.employeeCode ?? session.participant?.employeeId ?? null,
      status: session.status,
    };

    const assistantIds = session.answers
      .map((a) => a.assistantMsgId)
      .filter((id): id is string => Boolean(id));
    const assistantMap =
      assistantIds.length > 0
        ? new Map(
            (
              await db.message.findMany({
                where: { id: { in: assistantIds } },
                select: { id: true, content: true },
              })
            ).map((m) => [m.id, m.content])
          )
        : new Map<string, string>();

    for (const answer of session.answers) {
      if (answer.reviewStatus === "REJECTED" || answer.rawText.trim().length < 8) continue;
      const question = answer.assistantMsgId
        ? assistantMap.get(answer.assistantMsgId)
        : null;
      inputs.push({
        companySlug,
        sourceType: SOURCE_TYPE.EXPERIENCE,
        sourceKind: "interview_answer",
        sourceId: answer.id,
        sourceLabel: `${person} — ${answer.interactionType} answer`,
        content: [
          question ? `Question: ${question}` : null,
          `Answer: ${answer.rawText}`,
          answer.structuredJson ? `Structured: ${answer.structuredJson}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        metadata: {
          ...baseMeta,
          answerId: answer.id,
          interactionType: answer.interactionType,
          section: answer.section,
          qualityScore: answer.qualityScore,
          confidenceScore: answer.confidenceScore,
          reviewStatus: answer.reviewStatus,
        },
      });
    }

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
            ...baseMeta,
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
        metadata: { ...baseMeta, severity: pp.severity },
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
        metadata: { ...baseMeta },
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
        metadata: { ...baseMeta },
      });
    }

    for (const integ of session.integrations) {
      inputs.push({
        companySlug,
        sourceType: SOURCE_TYPE.EXPERIENCE,
        sourceKind: "integration",
        sourceId: integ.id,
        sourceLabel: `${person} — integration: ${integ.systemName}`,
        content: `System: ${integ.systemName}\n${integ.purpose ?? ""}`.trim(),
        metadata: { ...baseMeta },
      });
    }

    for (const rep of session.reporting) {
      inputs.push({
        companySlug,
        sourceType: SOURCE_TYPE.EXPERIENCE,
        sourceKind: "reporting",
        sourceId: rep.id,
        sourceLabel: `${person} — reporting: ${rep.reportName}`,
        content: [
          `Report: ${rep.reportName}`,
          rep.kpis ? `KPIs: ${rep.kpis}` : "",
          rep.frequency ? `Frequency: ${rep.frequency}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        metadata: { ...baseMeta },
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
        metadata: { ...baseMeta, fileType: att.fileType },
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
          metadata: { ...baseMeta, status: session.status },
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
  const [reference, experience, byKind, latest, reviewCounts, categoryCounts] =
    await Promise.all([
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
    db.knowledgeChunk.groupBy({
      by: ["reviewStatus"],
      where: { companySlug, sourceType: SOURCE_TYPE.EXPERIENCE },
      _count: { id: true },
    }),
    db.knowledgeChunk.groupBy({
      by: ["topicCategory"],
      where: {
        companySlug,
        sourceType: SOURCE_TYPE.EXPERIENCE,
        reviewStatus: REVIEW_STATUS.VALIDATED,
      },
      _count: { id: true },
    }),
  ]);

  const byReviewStatus = Object.fromEntries(
    reviewCounts.map((r) => [r.reviewStatus ?? REVIEW_STATUS.PENDING, r._count.id])
  );

  return {
    reference,
    experience,
    total: reference + experience,
    lastIndexedAt: latest?.updatedAt?.toISOString() ?? null,
    byKind: Object.fromEntries(byKind.map((k) => [k.sourceKind, k._count.id])),
    review: {
      pending: byReviewStatus[REVIEW_STATUS.PENDING] ?? 0,
      validated: byReviewStatus[REVIEW_STATUS.VALIDATED] ?? 0,
      needsAttention: byReviewStatus[REVIEW_STATUS.NEEDS_ATTENTION] ?? 0,
      rejected: byReviewStatus[REVIEW_STATUS.REJECTED] ?? 0,
    },
    validatedByCategory: Object.fromEntries(
      categoryCounts.map((c) => [c.topicCategory ?? "other", c._count.id])
    ),
  };
}
