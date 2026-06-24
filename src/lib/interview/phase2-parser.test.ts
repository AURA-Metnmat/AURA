import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parsePhase2QuestionFile } from "./phase2-parser";

describe("phase2-parser", () => {
  it("parses plain text lines", async () => {
    const buffer = Buffer.from(
      "What is your primary responsibility?\nHow many years of experience do you have?"
    );
    const rows = await parsePhase2QuestionFile(buffer, "questions.txt");
    assert.equal(rows.length, 2);
    assert.ok(rows[0]?.promptEn.includes("primary responsibility"));
    assert.equal(rows[0]?.questionType, "text");
  });

  it("parses csv with type and options", async () => {
    const buffer = Buffer.from(
      "Do you use ERP daily?,yes_no,\nWhich tool?,mcq,SAP|Oracle|Excel,B"
    );
    const rows = await parsePhase2QuestionFile(buffer, "questions.csv");
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.questionType, "yes_no");
    assert.equal(rows[1]?.questionType, "mcq");
    assert.equal(rows[1]?.section, "B");
  });

  it("skips comment lines", async () => {
    const buffer = Buffer.from("# header\n// note\nValid question here?");
    const rows = await parsePhase2QuestionFile(buffer, "q.txt");
    assert.equal(rows.length, 1);
  });

  it("parses mcq with pipe-separated options in csv", async () => {
    const buffer = Buffer.from("Which ERP do you use?,mcq,SAP|Oracle|Tally");
    const rows = await parsePhase2QuestionFile(buffer, "questions.csv");
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.questionType, "mcq");
    assert.ok(rows[0]?.interactionJson?.includes("mcq"));
  });
});
