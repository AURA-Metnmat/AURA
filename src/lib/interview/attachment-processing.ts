import * as XLSX from "xlsx";

const MAX_EXTRACT_CHARS = 50_000;
const EXCEL_MAX_ROWS_PER_SHEET = 25;

function truncate(text: string, max = MAX_EXTRACT_CHARS): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}\n\n[Truncated — download file for full content]`;
}

async function extractPdfText(buffer: Buffer, fileName: string): Promise<string> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    const text = (data.text ?? "").trim();
    if (!text) {
      return `[PDF: ${fileName} — no extractable text (may be scanned/image-based)]`;
    }
    return truncate(text);
  } catch {
    return `[PDF: ${fileName} — stored (${buffer.length} bytes); text extraction failed]`;
  }
}

function extractExcelText(buffer: Buffer, fileName: string): string {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const parts: string[] = [`Excel file: ${fileName}`, `Sheets: ${workbook.SheetNames.length}`];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: "",
        raw: false,
      }) as unknown[][];

      if (rows.length === 0) continue;

      parts.push(`\n--- Sheet: ${sheetName} (${rows.length} rows) ---`);
      const sample = rows.slice(0, EXCEL_MAX_ROWS_PER_SHEET);
      for (const row of sample) {
        parts.push((row as unknown[]).map((c) => String(c ?? "")).join("\t"));
      }
      if (rows.length > EXCEL_MAX_ROWS_PER_SHEET) {
        parts.push(`… ${rows.length - EXCEL_MAX_ROWS_PER_SHEET} more rows`);
      }
    }

    return truncate(parts.join("\n"));
  } catch {
    return `[Excel: ${fileName} — stored (${buffer.length} bytes); parse failed]`;
  }
}

export async function extractAttachmentText(
  buffer: Buffer,
  fileName: string,
  fileType: string
): Promise<string | null> {
  const lower = fileName.toLowerCase();

  if (fileType.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(lower)) {
    return `[Image: ${fileName} — stored; open download link to view]`;
  }

  if (lower.endsWith(".pdf") || fileType === "application/pdf") {
    return extractPdfText(buffer, fileName);
  }

  if (
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".csv") ||
    lower.endsWith(".json") ||
    lower.endsWith(".xml") ||
    lower.endsWith(".html") ||
    lower.endsWith(".htm") ||
    fileType.startsWith("text/")
  ) {
    try {
      return truncate(buffer.toString("utf-8"));
    } catch {
      return `[Text file: ${fileName} — stored (${buffer.length} bytes)]`;
    }
  }

  if (
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls") ||
    fileType.includes("spreadsheet") ||
    fileType.includes("excel")
  ) {
    return extractExcelText(buffer, fileName);
  }

  if (lower.endsWith(".doc") || lower.endsWith(".docx")) {
    return `[Word document: ${fileName} — stored; download file for full content]`;
  }

  return `[File: ${fileName} (${fileType || "unknown"}) — stored at upload URL]`;
}

export function previewExtractedText(text: string | null | undefined, max = 240): string {
  if (!text?.trim()) return "";
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max)}…`;
}
