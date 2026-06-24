import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isInterviewFastMode,
  isRetrievalLlmEnabled,
  isInterviewDualRefineEnabled,
} from "./performance-config";

describe("performance-config", () => {
  const saved = { ...process.env };

  function restoreEnv() {
    process.env = { ...saved };
  }

  it("defaults to fast interview mode", () => {
    delete process.env.AI_INTERVIEW_FAST;
    assert.equal(isInterviewFastMode(), true);
    assert.equal(isRetrievalLlmEnabled(), false);
    assert.equal(isInterviewDualRefineEnabled(), false);
    restoreEnv();
  });

  it("allows quality mode when fast is disabled", () => {
    process.env.AI_INTERVIEW_FAST = "false";
    process.env.AI_RETRIEVAL_LLM = "true";
    process.env.AI_INTERVIEW_DUAL_REFINE = "true";
    assert.equal(isInterviewFastMode(), false);
    assert.equal(isRetrievalLlmEnabled(), true);
    assert.equal(isInterviewDualRefineEnabled(), true);
    restoreEnv();
  });
});
