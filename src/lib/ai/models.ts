export const CLAUDE_INTERVIEW_MODEL =
  process.env.AI_CLAUDE_INTERVIEW_MODEL?.trim() || "claude-sonnet-4-6";

export const CLAUDE_RETRIEVAL_MODEL =
  process.env.AI_CLAUDE_RETRIEVAL_MODEL?.trim() || "claude-haiku-4-5";

export const CLAUDE_REPORT_MODEL =
  process.env.AI_CLAUDE_REPORT_MODEL?.trim() || "claude-sonnet-4-6";

export const OPENAI_CHAT_MODEL =
  process.env.AI_OPENAI_MODEL?.trim() || "gpt-4o-mini";
