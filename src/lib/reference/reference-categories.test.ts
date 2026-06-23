import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isAllowedReferenceUpload,
  isReferenceFileCategory,
  isStructuredReferenceDataFile,
  normalizeReferenceCategory,
  resolveReferenceFileName,
  sanitizeReferenceFileName,
} from "./reference-categories";

describe("reference categories", () => {
  it("allows any safe file name for upload", () => {
    assert.equal(isAllowedReferenceUpload("report.pdf"), true);
    assert.equal(isAllowedReferenceUpload("data.xlsx"), true);
    assert.equal(isAllowedReferenceUpload("image.png"), true);
    assert.equal(isAllowedReferenceUpload("notes.docx"), true);
    assert.equal(isAllowedReferenceUpload("evil..txt"), false);
  });

  it("detects structured data files", () => {
    assert.equal(isStructuredReferenceDataFile("plant.xlsx"), true);
    assert.equal(isStructuredReferenceDataFile("context.pdf"), false);
  });

  it("sanitizes file names", () => {
    assert.equal(sanitizeReferenceFileName("C:\\docs\\furnace.pdf"), "furnace.pdf");
  });

  it("resolves fallback names from mime type", () => {
    assert.equal(
      resolveReferenceFileName("", 0, "application/pdf"),
      "reference-1.pdf"
    );
    assert.equal(resolveReferenceFileName("notes", 1, "text/plain"), "notes");
  });

  it("normalizes categories", () => {
    assert.equal(normalizeReferenceCategory("process"), "process");
    assert.equal(normalizeReferenceCategory("invalid"), "general");
    assert.equal(isReferenceFileCategory("quality"), true);
  });
});
