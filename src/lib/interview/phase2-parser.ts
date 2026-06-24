import * as XLSX from "xlsx";
import { serializeInteraction, type MessageInteraction } from "@/lib/aura/interaction";
import type { SectionId } from "@/lib/aura/config";

export interface ParsedPhase2Question {
  promptEn: string;
  questionType: string;
  optionsJson: string | null;
  interactionJson: string | null;
  section: string | null;
}

const VALID_SECTIONS = new Set(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]);

function normalizeSection(value: string | undefined | null): string | null {
  const s = value?.trim().toUpperCase();
  if (s && VALID_SECTIONS.has(s)) return s;
  return null;
}

function buildInteraction(
  questionType: string,
  options: string[]
): MessageInteraction | null {
  const type = questionType.toLowerCase();
  if (type === "yes_no" || type === "yesno" || type === "boolean") {
    return { type: "yes_no" };
  }
  if (type === "mcq" || type === "multiple_choice" || type === "choice") {
    const opts = options.filter(Boolean).slice(0, 8);
    if (opts.length < 2) return null;
    return {
      type: "mcq",
      options: opts.map((label, i) => ({
        id: `opt_${i}`,
        en: label,
        locale: label,
      })),
    };
  }
  if (type === "rating") {
    return { type: "rating", min: 1, max: 5 };
  }
  return null;
}

function rowToQuestion(
  question: string,
  typeRaw?: string,
  optionsRaw?: string,
  sectionRaw?: string
): ParsedPhase2Question | null {
  const promptEn = question.trim();
  if (!promptEn || promptEn.length < 3) return null;

  const questionType = (typeRaw?.trim().toLowerCase() || "text").replace(/\s+/g, "_");
  const options = (optionsRaw ?? "")
    .split(/[|;]/)
    .map((o) => o.trim())
    .filter(Boolean);
  const interaction = buildInteraction(questionType, options);

  return {
    promptEn,
    questionType: interaction?.type ?? "text",
    optionsJson: options.length > 0 ? JSON.stringify(options) : null,
    interactionJson: interaction ? serializeInteraction(interaction) : null,
    section: normalizeSection(sectionRaw),
  };
}

/** Parse "Question text?, mcq, A|B|C" or tab-separated variants. */
function parseStructuredLine(line: string): ParsedPhase2Question | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) return null;

  if (trimmed.includes("\t")) {
    const [q, type, options, section] = trimmed.split("\t");
    return rowToQuestion(q ?? "", type, options, section);
  }

  const pipeParts = trimmed.split("|").map((p) => p.trim());
  if (pipeParts.length >= 3) {
    const maybeType = pipeParts[pipeParts.length - 2]?.toLowerCase() ?? "";
    if (
      ["mcq", "yes_no", "yesno", "rating", "text", "multiple_choice", "choice"].includes(
        maybeType.replace(/\s+/g, "_")
      )
    ) {
      const section = pipeParts[pipeParts.length - 1];
      const sectionIsLetter = /^[A-J]$/i.test(section ?? "");
      const optionsRaw = pipeParts[pipeParts.length - (sectionIsLetter ? 1 : 2)];
      const type = pipeParts[pipeParts.length - (sectionIsLetter ? 2 : 2)];
      const question = pipeParts
        .slice(0, pipeParts.length - (sectionIsLetter ? 3 : 2))
        .join("|");
      return rowToQuestion(
        question,
        type,
        optionsRaw,
        sectionIsLetter ? section : undefined
      );
    }
  }

  if (trimmed.includes(",")) {
    const parts = trimmed.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
    return rowToQuestion(parts[0] ?? "", parts[1], parts[2], parts[3]);
  }

  return rowToQuestion(trimmed);
}

function parseDelimitedText(text: string): ParsedPhase2Question[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: ParsedPhase2Question[] = [];

  for (const line of lines) {
    const parsed = parseStructuredLine(line);
    if (parsed) results.push(parsed);
  }

  return results;
}

/** Heuristic: numbered questions with A/B/C/D option lines (common in PDF exports). */
function parsePdfStyleBlocks(text: string): ParsedPhase2Question[] {
  const results: ParsedPhase2Question[] = [];
  const blocks = text.split(/\n(?=\d+[\).:\-]\s)/);

  for (const block of blocks) {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    const first = lines[0]!.replace(/^\d+[\).:\-]\s*/, "").trim();
    const optionLines = lines.slice(1).filter((l) => /^[A-Da-d][\).:\-]\s+/.test(l));
    const options = optionLines.map((l) => l.replace(/^[A-Da-d][\).:\-]\s+/, "").trim());

    if (first.length >= 3 && options.length >= 2) {
      const parsed = rowToQuestion(first, "mcq", options.join("|"));
      if (parsed) results.push(parsed);
      continue;
    }

    if (first.length >= 3 && optionLines.length === 0) {
      const parsed = rowToQuestion(first);
      if (parsed) results.push(parsed);
    }
  }

  return results;
}

function parseExcelBuffer(buffer: Buffer): ParsedPhase2Question[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const results: ParsedPhase2Question[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    for (const row of rows) {
      const keys = Object.keys(row);
      const questionKey =
        keys.find((k) => /^question$/i.test(k)) ??
        keys.find((k) => /prompt/i.test(k)) ??
        keys[0];
      const typeKey = keys.find((k) => /^type$/i.test(k));
      const optionsKey = keys.find((k) => /^options?$/i.test(k));
      const sectionKey = keys.find((k) => /^section$/i.test(k));

      const parsed = rowToQuestion(
        String(row[questionKey ?? ""] ?? ""),
        typeKey ? String(row[typeKey] ?? "") : undefined,
        optionsKey ? String(row[optionsKey] ?? "") : undefined,
        sectionKey ? String(row[sectionKey] ?? "") : undefined
      );
      if (parsed) results.push(parsed);
    }
  }

  return results;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  return (data.text ?? "").trim();
}

export async function parsePhase2QuestionFile(
  buffer: Buffer,
  fileName: string
): Promise<ParsedPhase2Question[]> {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return parseExcelBuffer(buffer);
  }

  let text: string;
  if (lower.endsWith(".pdf")) {
    text = await extractPdfText(buffer);
    if (!text) {
      throw new Error(
        "Could not extract text from PDF. Use a text-based PDF, or upload Excel/CSV with Question, Type, Options columns."
      );
    }
  } else {
    text = buffer.toString("utf-8");
  }

  const delimited = parseDelimitedText(text);
  if (delimited.length > 0) return delimited;

  const pdfBlocks = parsePdfStyleBlocks(text);
  if (pdfBlocks.length > 0) return pdfBlocks;

  return [];
}

/** @deprecated Use async parsePhase2QuestionFile */
export function parsePhase2QuestionFileSync(
  buffer: Buffer,
  fileName: string
): ParsedPhase2Question[] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return parseExcelBuffer(buffer);
  }
  if (lower.endsWith(".pdf")) {
    throw new Error("PDF parsing requires parsePhase2QuestionFile (async)");
  }
  return parseDelimitedText(buffer.toString("utf-8"));
}
