import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import {
  CLAUDE_INTERVIEW_MODEL,
  OPENAI_CHAT_MODEL,
} from "../src/lib/ai/models";
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

const openaiKey = process.env.OPENAI_API_KEY?.trim();
const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
const openaiModel = OPENAI_CHAT_MODEL;
const claudeModel = CLAUDE_INTERVIEW_MODEL;

async function main() {
  const result = {
    openai: {
      configured: Boolean(openaiKey),
      ok: false,
      error: null as string | null,
      model: openaiModel,
    },
    claude: {
      configured: Boolean(anthropicKey),
      ok: false,
      error: null as string | null,
      model: claudeModel,
    },
  };

  if (openaiKey) {
    try {
      const client = new OpenAI({ apiKey: openaiKey });
      const response = await client.chat.completions.create({
        model: openaiModel,
        messages: [{ role: "user", content: 'Return JSON only: {"ok":true}' }],
        max_tokens: 20,
        temperature: 0,
      });
      result.openai.ok = Boolean(response.choices[0]?.message?.content);
    } catch (error) {
      result.openai.error = error instanceof Error ? error.message : String(error);
    }
  } else {
    result.openai.error = "OPENAI_API_KEY not set";
  }

  if (anthropicKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicKey });
      const response = await client.messages.create({
        model: claudeModel,
        max_tokens: 20,
        messages: [{ role: "user", content: 'Return JSON only: {"ok":true}' }],
      });
      const text = response.content.find((block) => block.type === "text");
      result.claude.ok = text?.type === "text" && text.text.length > 0;
    } catch (error) {
      result.claude.error = error instanceof Error ? error.message : String(error);
    }
  } else {
    result.claude.error = "ANTHROPIC_API_KEY not set";
  }

  console.log(JSON.stringify(result, null, 2));
  if (!result.openai.ok || !result.claude.ok) process.exit(1);
}

main();
