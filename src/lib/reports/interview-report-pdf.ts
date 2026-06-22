import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";

export interface InterviewReportPdfInput {
  companyName: string;
  participantName: string | null;
  department: string | null;
  designation: string | null;
  completedAt: string | null;
  completionPct: number;
  sections: { title: string; body: string }[];
}

const PAGE_MARGIN = 50;
const LINE_HEIGHT = 14;
const TITLE_SIZE = 18;
const HEADING_SIZE = 12;
const BODY_SIZE = 10;

export function wrapText(text: string, maxChars: number): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const lines: string[] = [];
  for (const paragraph of normalized.split("\n")) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let current = words[0]!;
    for (const word of words.slice(1)) {
      const candidate = `${current} ${word}`;
      if (candidate.length <= maxChars) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }

  return lines;
}

function ensureSpace(
  doc: PDFDocument,
  state: { page: PDFPage; y: number },
  needed: number
): { page: PDFPage; y: number } {
  if (state.y - needed >= PAGE_MARGIN) return state;

  const page = doc.addPage();
  return { page, y: page.getHeight() - PAGE_MARGIN };
}

function drawLines(
  doc: PDFDocument,
  state: { page: PDFPage; y: number },
  font: PDFFont,
  lines: string[],
  size: number,
  color = rgb(0.12, 0.14, 0.18)
): { page: PDFPage; y: number } {
  let current = state;
  for (const line of lines) {
    current = ensureSpace(doc, current, LINE_HEIGHT);
    if (line) {
      current.page.drawText(line, {
        x: PAGE_MARGIN,
        y: current.y,
        size,
        font,
        color,
      });
    }
    current = { ...current, y: current.y - LINE_HEIGHT };
  }
  return current;
}

export async function buildInterviewReportPdf(
  input: InterviewReportPdfInput
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let state = { page: doc.addPage(), y: doc.getPage(0).getHeight() - PAGE_MARGIN };

  state.page.drawText("AURA Interview Report", {
    x: PAGE_MARGIN,
    y: state.y,
    size: TITLE_SIZE,
    font: bold,
    color: rgb(0.72, 0.45, 0.05),
  });
  state.y -= LINE_HEIGHT * 2;

  const metaLines = [
    `Company: ${input.companyName}`,
    `Participant: ${input.participantName ?? "—"}`,
    `Department: ${input.department ?? "—"}`,
    `Role: ${input.designation ?? "—"}`,
    `Completion: ${input.completionPct}%`,
    input.completedAt ? `Completed: ${input.completedAt}` : "Status: In progress",
  ];

  state = drawLines(doc, state, regular, metaLines, BODY_SIZE, rgb(0.35, 0.38, 0.42));
  state.y -= LINE_HEIGHT;

  for (const section of input.sections) {
    if (!section.body?.trim()) continue;

    state = ensureSpace(doc, state, LINE_HEIGHT * 3);
    state.page.drawText(section.title, {
      x: PAGE_MARGIN,
      y: state.y,
      size: HEADING_SIZE,
      font: bold,
      color: rgb(0.72, 0.45, 0.05),
    });
    state.y -= LINE_HEIGHT * 1.5;

    const bodyLines = wrapText(section.body, 92);
    state = drawLines(doc, state, regular, bodyLines, BODY_SIZE);
    state.y -= LINE_HEIGHT * 0.5;
  }

  return doc.save();
}
