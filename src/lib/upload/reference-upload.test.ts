import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseJsonReferenceUploads,
  validateReferenceUploads,
} from "./reference-upload";

describe("reference upload parsing", () => {
  it("parses JSON base64 uploads", () => {
    const text = Buffer.from("furnace context", "utf8").toString("base64");
    const uploads = parseJsonReferenceUploads([
      { fileName: "context.txt", contentBase64: text },
    ]);
    assert.equal(uploads.length, 1);
    assert.equal(uploads[0]?.fileName, "context.txt");
    assert.equal(uploads[0]?.buffer.toString("utf8"), "furnace context");
  });

  it("rejects unsupported extensions with a clear message", () => {
    const result = validateReferenceUploads([
      {
        fileName: "notes.docx",
        buffer: Buffer.from("hello"),
        size: 5,
      },
    ]);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Unsupported file type/i);
    }
  });
});
