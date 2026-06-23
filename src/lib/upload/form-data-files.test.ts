import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseFormDataUploads } from "./form-data-files";

describe("parseFormDataUploads", () => {
  it("reads File entries without relying on instanceof File in the route", async () => {
    const formData = new FormData();
    const file = new File(["hello furnace"], "context.txt", { type: "text/plain" });
    formData.append("files", file);

    const uploads = await parseFormDataUploads(formData);
    assert.equal(uploads.length, 1);
    assert.equal(uploads[0]?.fileName, "context.txt");
    assert.equal(uploads[0]?.buffer.toString("utf8"), "hello furnace");
  });

  it("accepts singular file field name", async () => {
    const formData = new FormData();
    const file = new File(["a,b\n1,2"], "data.csv", { type: "text/csv" });
    formData.append("file", file);

    const uploads = await parseFormDataUploads(formData);
    assert.equal(uploads.length, 1);
    assert.equal(uploads[0]?.fileName, "data.csv");
  });
});
