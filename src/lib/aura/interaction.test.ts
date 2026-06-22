import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseInteraction, parseAssistantPayload } from "@/lib/aura/interaction";

describe("parseInteraction", () => {
  it("parses mcq with option ids", () => {
    const raw = JSON.stringify({
      type: "mcq",
      options: [
        { id: "a", en: "One", locale: "One" },
        { id: "b", en: "Two", locale: "Two" },
      ],
    });
    const result = parseInteraction(raw);
    assert.equal(result?.type, "mcq");
    if (result?.type === "mcq") {
      assert.equal(result.options[0]?.id, "a");
    }
  });

  it("parses yes_no", () => {
    const result = parseInteraction(JSON.stringify({ type: "yes_no" }));
    assert.deepEqual(result, { type: "yes_no", allowFreeText: true });
  });

  it("parses rating with bounds", () => {
    const result = parseInteraction(
      JSON.stringify({ type: "rating", min: 1, max: 10, minLabel: "Low", maxLabel: "High" })
    );
    assert.equal(result?.type, "rating");
    if (result?.type === "rating") {
      assert.equal(result.min, 1);
      assert.equal(result.max, 10);
    }
  });

  it("parses numeric with unit", () => {
    const result = parseInteraction(
      JSON.stringify({ type: "numeric", unit: "hours", placeholder: "8" })
    );
    assert.equal(result?.type, "numeric");
    if (result?.type === "numeric") {
      assert.equal(result.unit, "hours");
    }
  });
});

describe("parseAssistantPayload", () => {
  it("extracts yes_no interaction from assistant JSON", () => {
    const payload = parseAssistantPayload(
      JSON.stringify({
        en: "Do you use SAP daily?",
        locale: "क्या आप रोज SAP उपयोग करते हैं?",
        interaction: { type: "yes_no" },
      }),
      "fallback"
    );
    assert.equal(payload.interaction?.type, "yes_no");
  });
});
