import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  INTERVIEW_ANSWER_SOURCE_KIND,
  isInterviewAnswerChunk,
} from "./review-sync";

describe("review sync", () => {
  it("detects interview_answer chunks with a source id", () => {
    assert.equal(
      isInterviewAnswerChunk(INTERVIEW_ANSWER_SOURCE_KIND, "ans-1"),
      true
    );
    assert.equal(isInterviewAnswerChunk("interview_message", "ans-1"), false);
    assert.equal(isInterviewAnswerChunk(INTERVIEW_ANSWER_SOURCE_KIND, null), false);
  });
});
