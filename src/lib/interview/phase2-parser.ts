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

function parseDelimitedText(text: string): ParsedPhase2Question[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: ParsedPhase2Question[] = [];

  for (const line of lines) {
    if (line.startsWith("#") || line.startsWith("//")) continue;

    if (line.includes("\t")) {
      const [q, type, options, section] = line.split("\t");
      const parsed = rowToQuestion(q ?? "", type, options, section);
      if (parsed) results.push(parsed);
      continue;
    }

    if (line.includes(",")) {
      const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
      const parsed = rowToQuestion(parts[0] ?? "", parts[1], parts[2], parts[3]);
      if (parsed) results.push(parsed);
      continue;
    }

    const parsed = rowToQuestion(line);
    if (parsed) results.push(parsed);
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

export function parsePhase2QuestionFile(
  buffer: Buffer,
  fileName: string
): ParsedPhase2Question[] {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return parseExcelBuffer(buffer);
  }

  const text = buffer.toString("utf-8");
  return parseDelimitedText(text);
}
