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

  it("accepts any file extension", () => {
    const result = validateReferenceUploads([
      {
        fileName: "diagram.png",
        buffer: Buffer.from("fake-png"),
        size: 8,
      },
    ]);
    assert.equal(result.ok, true);
  });

  it("accepts extensionless files with resolved names", () => {
    const uploads = parseJsonReferenceUploads([
      {
        fileName: "",
        mimeType: "application/pdf",
        contentBase64: Buffer.from("pdf-bytes").toString("base64"),
      },
    ]);
    assert.equal(uploads.length, 1);
    assert.equal(uploads[0]?.fileName, "reference-1.pdf");
  });
});
