import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EXPORT_TYPE_LABELS, EXPORT_TYPES, formatExportSummary } from "./record-export";

describe("export history", () => {
  it("labels export types", () => {
    assert.equal(EXPORT_TYPE_LABELS[EXPORT_TYPES.INTERVIEW], "Interview workbook");
    assert.equal(EXPORT_TYPE_LABELS[EXPORT_TYPES.KNOWLEDGE_ML], "Experience / ML export");
  });

  it("formats export summary", () => {
    assert.equal(
      formatExportSummary({ format: "xlsx", filter: "validated", recordCount: 42 }),
      "XLSX · validated · 42 records"
    );
    assert.equal(formatExportSummary({ format: "jsonl", filter: null, recordCount: 0 }), "JSONL");
  });
});
