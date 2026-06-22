import { NextResponse } from "next/server";
import { chatJson } from "@/lib/ai/chat";
import { isDualModelActive } from "@/lib/ai/ai-config";
import { hasClaudeProvider, hasOpenAIProvider } from "@/lib/ai/providers";
import { CLAUDE_INTERVIEW_MODEL, OPENAI_CHAT_MODEL } from "@/lib/ai/models";

const PROBE_MESSAGE = [{ role: "user" as const, content: 'Return JSON: {"ok":true}' }];

async function probeProvider(preferClaude: boolean) {
  const started = Date.now();
  try {
    const raw = await chatJson({
      messages: PROBE_MESSAGE,
      temperature: 0,
      maxTokens: 32,
      preferClaude,
    });
    const latencyMs = Date.now() - started;
    if (!raw) {
      return { ok: false, latencyMs, error: "empty response" };
    }
    const parsed = JSON.parse(raw) as { ok?: boolean };
    return { ok: parsed.ok === true, latencyMs };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : "probe failed",
    };
  }
}

export async function GET() {
  const configured = {
    claude: hasClaudeProvider(),
    openai: hasOpenAIProvider(),
    dual: isDualModelActive(),
  };

  if (!configured.claude && !configured.openai) {
    return NextResponse.json({
      status: "error",
      configured,
      message: "No AI providers configured",
      timestamp: new Date().toISOString(),
    });
  }

  const [claude, openai] = await Promise.all([
    configured.claude ? probeProvider(true) : Promise.resolve(null),
    configured.openai ? probeProvider(false) : Promise.resolve(null),
  ]);

  const claudeOk = claude?.ok ?? false;
  const openaiOk = openai?.ok ?? false;
  const allRequiredOk = configured.dual ? claudeOk && openaiOk : claudeOk || openaiOk;

  return NextResponse.json({
    status: allRequiredOk ? "ok" : "degraded",
    configured,
    models: {
      claude: CLAUDE_INTERVIEW_MODEL,
      openai: OPENAI_CHAT_MODEL,
    },
    probes: {
      claude,
      openai,
    },
    strategy: configured.dual
      ? "dual (Claude draft + OpenAI refine)"
      : configured.claude
        ? "claude-primary"
        : "openai-only",
    timestamp: new Date().toISOString(),
  });
}
