import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isAllowedReferenceUpload,
  isReferenceFileCategory,
  normalizeReferenceCategory,
} from "./reference-categories";

describe("reference categories", () => {
  it("allows supported upload extensions", () => {
    assert.equal(isAllowedReferenceUpload("report.pdf"), true);
    assert.equal(isAllowedReferenceUpload("data.xlsx"), true);
    assert.equal(isAllowedReferenceUpload("notes.md"), true);
    assert.equal(isAllowedReferenceUpload("image.png"), false);
  });

  it("normalizes categories", () => {
    assert.equal(normalizeReferenceCategory("process"), "process");
    assert.equal(normalizeReferenceCategory("invalid"), "general");
    assert.equal(isReferenceFileCategory("quality"), true);
  });
});
