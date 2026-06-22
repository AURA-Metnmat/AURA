import { db } from "@/lib/db";
import { chatJson } from "./chat";
import { CLAUDE_RETRIEVAL_MODEL } from "./models";
import type { ChatMessage } from "./providers";
import { SOURCE_TYPE } from "@/lib/knowledge/indexer";
import {
  isDualModelActive,
  mergeRetrievalIndices,
  RETRIEVAL_OPENAI_SYSTEM,
} from "./ai-config";

const MAX_CORPUS_CHARS = 24_000;
const MAX_RETRIEVED_CHARS = 6_000;

export interface RetrievalChunk {
  source: string;
  category: string;
  content: string;
}

export interface RetrievedKnowledge {
  chunks: RetrievalChunk[];
  formattedContext: string;
  provider: "claude" | "openai" | "dual" | "heuristic" | "none";
}

async function loadLegacyCorpus(companySlug: string): Promise<RetrievalChunk[]> {
  const [pdfs, insights, dataFiles] = await Promise.all([
    db.pdfDocument.findMany({
      where: { companySlug },
      select: { fileName: true, content: true, summary: true },
      orderBy: { createdAt: "asc" },
    }),
    db.dataInsight.findMany({
      where: { file: { companySlug } },
      select: { title: true, category: true, content: true, priority: true },
      orderBy: { priority: "asc" },
      take: 30,
    }),
    db.dataFile.findMany({
      where: { companySlug },
      select: {
        fileName: true,
        category: true,
        description: true,
        rowCount: true,
        sheetCount: true,
      },
      orderBy: { importedAt: "desc" },
      take: 20,
    }),
  ]);

  const chunks: RetrievalChunk[] = [];

  for (const pdf of pdfs) {
    const body = (pdf.content || pdf.summary || "").trim();
    if (!body) continue;
    chunks.push({
      source: pdf.fileName,
      category: "pdf",
      content: body.slice(0, 8000),
    });
  }

  for (const insight of insights) {
    chunks.push({
      source: insight.title,
      category: insight.category,
      content: insight.content.trim(),
    });
  }

  for (const file of dataFiles) {
    const desc = [
      file.description,
      `Category: ${file.category}`,
      `Rows: ${file.rowCount}`,
      `Sheets: ${file.sheetCount}`,
    ]
      .filter(Boolean)
      .join(" · ");
    chunks.push({
      source: file.fileName,
      category: file.category,
      content: desc,
    });
  }

  return chunks;
}

async function loadIndexedCorpus(companySlug: string): Promise<RetrievalChunk[]> {
  const indexed = await db.knowledgeChunk.findMany({
    where: { companySlug },
    orderBy: { updatedAt: "desc" },
    take: 180,
    select: {
      sourceLabel: true,
      sourceType: true,
      sourceKind: true,
      content: true,
    },
  });

  if (indexed.length === 0) {
    return loadLegacyCorpus(companySlug);
  }

  return indexed.map((c) => ({
    source: c.sourceLabel,
    category:
      c.sourceType === SOURCE_TYPE.EXPERIENCE
        ? `experience:${c.sourceKind}`
        : `reference:${c.sourceKind}`,
    content: c.content,
  }));
}

async function loadKnowledgeCorpus(companySlug: string): Promise<RetrievalChunk[]> {
  return loadIndexedCorpus(companySlug);
}

function heuristicRetrieve(
  chunks: RetrievalChunk[],
  userMessage: string,
  sectionName: string
): RetrievedKnowledge {
  if (chunks.length === 0) {
    return { chunks: [], formattedContext: "", provider: "none" };
  }

  const terms = `${userMessage} ${sectionName}`
    .toLowerCase()
    .split(/[^a-z0-9\u0900-\u097F\u0B00-\u0B7F]+/i)
    .filter((t) => t.length > 3);

  const scored = chunks
    .map((chunk) => {
      const hay = `${chunk.source} ${chunk.category} ${chunk.content}`.toLowerCase();
      const score = terms.reduce((n, term) => (hay.includes(term) ? n + 1 : n), 0);
      return { chunk, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const selected = scored.length > 0 ? scored.map((s) => s.chunk) : chunks.slice(0, 3);
  const formatted = formatChunks(selected);

  return {
    chunks: selected,
    formattedContext: formatted,
    provider: "heuristic",
  };
}

function formatChunks(chunks: RetrievalChunk[]): string {
  if (chunks.length === 0) return "";
  const body = chunks
    .map(
      (c) =>
        `#### ${c.source} (${c.category})\n${c.content.slice(0, 1500)}`
    )
    .join("\n\n");
  return body.length > MAX_RETRIEVED_CHARS
    ? `${body.slice(0, MAX_RETRIEVED_CHARS)}\n\n[Knowledge truncated]`
    : body;
}

async function llmRetrieveWithProvider(
  chunks: RetrievalChunk[],
  userMessage: string,
  sectionName: string,
  designation: string,
  preferClaude: boolean
): Promise<{ indices: number[]; summary: string } | null> {
  const corpus = chunks
    .map(
      (c, i) =>
        `[${i}] source=${c.source} category=${c.category}\n${c.content.slice(0, 2000)}`
    )
    .join("\n\n")
    .slice(0, MAX_CORPUS_CHARS);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: RETRIEVAL_OPENAI_SYSTEM,
    },
    {
      role: "user",
      content: `Section: ${sectionName}
Employee role: ${designation || "not specified"}
Employee message: ${userMessage}

Knowledge chunks:
${corpus}`,
    },
  ];

  const raw = await chatJson({
    messages,
    temperature: 0.2,
    maxTokens: 500,
    claudeModel: CLAUDE_RETRIEVAL_MODEL,
    preferClaude,
  });

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { indices?: number[]; summary?: string };
    const indices = Array.isArray(parsed.indices)
      ? parsed.indices.filter((i) => Number.isInteger(i) && i >= 0 && i < chunks.length)
      : [];
    return { indices, summary: parsed.summary?.trim() ?? "" };
  } catch {
    return null;
  }
}

function buildRetrievalResult(
  chunks: RetrievalChunk[],
  indices: number[],
  summary: string,
  provider: RetrievedKnowledge["provider"]
): RetrievedKnowledge {
  const selected =
    indices.length > 0 ? indices.map((i) => chunks[i]!) : chunks.slice(0, 3);
  const formatted = [
    summary ? `**Retrieved focus:** ${summary}` : "",
    formatChunks(selected),
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    chunks: selected,
    formattedContext: formatted,
    provider,
  };
}

async function llmRetrieve(
  chunks: RetrievalChunk[],
  userMessage: string,
  sectionName: string,
  designation: string
): Promise<RetrievedKnowledge | null> {
  if (isDualModelActive()) {
    const [claudeRank, openaiRank] = await Promise.all([
      llmRetrieveWithProvider(chunks, userMessage, sectionName, designation, true),
      llmRetrieveWithProvider(chunks, userMessage, sectionName, designation, false),
    ]);

    if (claudeRank || openaiRank) {
      const mergedIndices = mergeRetrievalIndices(
        claudeRank?.indices ?? [],
        openaiRank?.indices ?? [],
        6
      );
      const summary = [claudeRank?.summary, openaiRank?.summary].filter(Boolean).join(" ");
      return buildRetrievalResult(chunks, mergedIndices, summary, "dual");
    }
    return null;
  }

  const single = await llmRetrieveWithProvider(
    chunks,
    userMessage,
    sectionName,
    designation,
    true
  );
  if (!single) return null;
  return buildRetrievalResult(
    chunks,
    single.indices,
    single.summary,
    "claude"
  );
}

/**
 * Knowledge retrieval — dual-model ranks with Claude + OpenAI when both keys are set.
 */
export async function retrieveRelevantKnowledge(params: {
  companySlug: string;
  userMessage: string;
  sectionName: string;
  designation?: string;
}): Promise<RetrievedKnowledge> {
  const chunks = await loadKnowledgeCorpus(params.companySlug);
  if (chunks.length === 0) {
    return { chunks: [], formattedContext: "", provider: "none" };
  }

  const llmResult = await llmRetrieve(
    chunks,
    params.userMessage,
    params.sectionName,
    params.designation ?? ""
  );
  if (llmResult?.formattedContext) return llmResult;

  return heuristicRetrieve(chunks, params.userMessage, params.sectionName);
}

export async function getCompanyDocumentContext(companySlug: string): Promise<string> {
  const chunks = await loadKnowledgeCorpus(companySlug);
  if (chunks.length === 0) return "";

  const combined = chunks
    .map((c) => `### ${c.source}\n${c.content}`)
    .join("\n\n");

  return combined.length > 12_000
    ? `${combined.slice(0, 12_000)}\n\n[Document text truncated for context window]`
    : combined;
}
