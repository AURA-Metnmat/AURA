import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deriveSystemStatus } from "./system-status";

describe("system status", () => {
  it("marks platform degraded when reindex jobs fail", () => {
    const status = deriveSystemStatus(
      { status: "ok", dbLatencyMs: 120, ai: { claude: true, openai: true, primary: "claude" } },
      2,
      0
    );
    assert.equal(status, "degraded");
  });

  it("marks platform ok when health and jobs are clean", () => {
    const status = deriveSystemStatus(
      { status: "ok", dbLatencyMs: 80, ai: { claude: true, openai: true, primary: "claude" } },
      0,
      1
    );
    assert.equal(status, "ok");
  });
});
