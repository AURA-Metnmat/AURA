import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAnswerExportJsonl } from "./answer-export";
import type { AnswerExportRecord } from "./answer-export";

describe("answer export", () => {
  it("builds jsonl with employee and Q/A fields", () => {
    const records: AnswerExportRecord[] = [
      {
        answerId: "a1",
        sessionId: "s1",
        employeeId: "emp1",
        employeeCode: "E-001",
        participantName: "Rahul",
        department: "Ops",
        designation: "Engineer",
        section: "B",
        interactionType: "mcq",
        questionEn: "What is your role?",
        questionLocale: null,
        answerEn: "I manage furnace operations",
        answerLocale: null,
        structuredJson: { optionId: "opt1" },
        qualityScore: 0.82,
        confidenceScore: 0.78,
        reviewStatus: "VALIDATED",
        contradictionFlags: [],
        campaignId: null,
        campaignName: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const line = buildAnswerExportJsonl(records).trim();
    const parsed = JSON.parse(line) as AnswerExportRecord;
    assert.equal(parsed.employeeId, "emp1");
    assert.equal(parsed.questionEn, "What is your role?");
    assert.equal(parsed.reviewStatus, "VALIDATED");
  });
});
