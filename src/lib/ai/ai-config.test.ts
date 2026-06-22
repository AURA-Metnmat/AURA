import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeRetrievalIndices, mergeReportFields } from "./ai-config";

describe("dual model helpers", () => {
  it("merges retrieval indices with interleaving priority", () => {
    const merged = mergeRetrievalIndices([0, 2, 5], [2, 3, 7], 6);
    assert.deepEqual(merged, [0, 2, 3, 5, 7]);
  });

  it("enhances selected report fields from secondary draft", () => {
    const base = {
      executiveSummary: "Short summary",
      requirements: "Req A",
      recommendations: "Do X",
    };
    const enhanced = {
      executiveSummary: "Expanded executive summary with more detail",
      requirements: "Should not replace",
      recommendations: "Prioritize X with timeline",
      actionItems: "1. Review process",
    };
    const out = mergeReportFields(base, enhanced);
    assert.equal(out.executiveSummary, enhanced.executiveSummary);
    assert.equal(out.recommendations, enhanced.recommendations);
    assert.equal(out.actionItems, enhanced.actionItems);
    assert.equal(out.requirements, "Req A");
  });
});
