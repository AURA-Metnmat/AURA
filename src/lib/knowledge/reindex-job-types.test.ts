import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  REINDEX_JOB_STATUS,
  formatReindexJobMessage,
  isTerminalReindexStatus,
  parseReindexScope,
} from "./reindex-job-types";

describe("reindex job types", () => {
  it("parses scope", () => {
    assert.equal(parseReindexScope("reference"), "reference");
    assert.equal(parseReindexScope("experience"), "experience");
    assert.equal(parseReindexScope("invalid"), "all");
  });

  it("detects terminal statuses", () => {
    assert.equal(isTerminalReindexStatus(REINDEX_JOB_STATUS.COMPLETED), true);
    assert.equal(isTerminalReindexStatus(REINDEX_JOB_STATUS.FAILED), true);
    assert.equal(isTerminalReindexStatus(REINDEX_JOB_STATUS.RUNNING), false);
  });

  it("formats completion message", () => {
    const message = formatReindexJobMessage({
      status: REINDEX_JOB_STATUS.COMPLETED,
      scope: "all",
      referenceCount: 12,
      experienceCount: 34,
      errorMessage: null,
    });
    assert.match(message, /12 reference/);
    assert.match(message, /34 experience/);
  });
});
