import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildInterviewReportPdf, wrapText } from "./interview-report-pdf";

describe("interview report PDF", () => {
  it("wraps long lines", () => {
    const lines = wrapText("one two three four five six seven eight nine ten eleven", 20);
    assert.ok(lines.length >= 2);
    assert.ok(lines.every((line) => line.length <= 20));
  });

  it("builds a PDF buffer", async () => {
    const pdf = await buildInterviewReportPdf({
      companyName: "Demo Corp",
      participantName: "Jane Doe",
      department: "Operations",
      designation: "Manager",
      completedAt: "2026-06-20",
      completionPct: 100,
      sections: [
        { title: "Executive Summary", body: "Key findings from the interview." },
        { title: "Recommendations", body: "Automate reporting workflows." },
      ],
    });
    assert.ok(pdf.byteLength > 500);
    assert.equal(String.fromCharCode(pdf[0]!, pdf[1]!, pdf[2]!, pdf[3]!), "%PDF");
  });
});
