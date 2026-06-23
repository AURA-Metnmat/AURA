import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const models = [
  "claude-sonnet-4-20250514",
  "claude-3-5-sonnet-latest",
  "claude-3-5-haiku-latest",
  "claude-sonnet-4-6",
  "claude-3-7-sonnet-latest",
  "claude-haiku-4-5",
];

async function main() {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    console.error("ANTHROPIC_API_KEY not set");
    process.exit(1);
  }
  const client = new Anthropic({ apiKey: key });
  for (const model of models) {
    try {
      await client.messages.create({
        model,
        max_tokens: 10,
        messages: [{ role: "user", content: "ok" }],
      });
      console.log(`${model}: OK`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`${model}: FAIL - ${msg.slice(0, 140)}`);
    }
  }
}

main();
