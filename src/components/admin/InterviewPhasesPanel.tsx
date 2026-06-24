"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Clock,
  FileUp,
  ListChecks,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface PhaseConfig {
  phase1DurationMinutes: number;
  phase2DurationMinutes: number;
  phase2Enabled: boolean;
  phase1Title: string;
  phase2Title: string;
  totalDurationMinutes: number;
  phase2QuestionCount: number;
}

interface Phase2Question {
  id: string;
  sortOrder: number;
  promptEn: string;
  promptLocale: string | null;
  questionType: string;
  optionsJson: string | null;
  section: string | null;
  isActive: boolean;
  sourceFile: string | null;
}

interface InterviewPhasesPanelProps {
  companyId: string;
  glassCard: string;
}

export default function InterviewPhasesPanel({ companyId, glassCard }: InterviewPhasesPanelProps) {
  const [config, setConfig] = useState<PhaseConfig | null>(null);
  const [questions, setQuestions] = useState<Phase2Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [phase1Minutes, setPhase1Minutes] = useState(8);
  const [phase2Minutes, setPhase2Minutes] = useState(7);
  const [phase2Enabled, setPhase2Enabled] = useState(true);
  const [phase1Title, setPhase1Title] = useState("AI Discovery");
  const [phase2Title, setPhase2Title] = useState("Domain Questions");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [configRes, questionsRes] = await Promise.all([
        fetch(`/api/companies/${companyId}/interview-phases`, { credentials: "include" }),
        fetch(`/api/companies/${companyId}/phase2-questions`, { credentials: "include" }),
      ]);
      const configData = await configRes.json();
      const questionsData = await questionsRes.json();
      if (!configRes.ok) throw new Error(configData.error ?? "Failed to load phase config");
      if (!questionsRes.ok) throw new Error(questionsData.error ?? "Failed to load questions");

      setConfig(configData);
      setPhase1Minutes(configData.phase1DurationMinutes);
      setPhase2Minutes(configData.phase2DurationMinutes);
      setPhase2Enabled(configData.phase2Enabled);
      setPhase1Title(configData.phase1Title);
      setPhase2Title(configData.phase2Title);
      setQuestions(questionsData.questions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load interview phases");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveConfig() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/interview-phases`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase1DurationMinutes: phase1Minutes,
          phase2DurationMinutes: phase2Minutes,
          phase2Enabled,
          phase1Title,
          phase2Title,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setConfig(data);
      setSuccess("Interview timeline saved.");
      window.setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save timeline");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/companies/${companyId}/phase2-questions/upload`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setSuccess(data.message ?? `Imported ${data.questionCount} questions`);
      await load();
      window.setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function deleteQuestion(id: string) {
    if (!confirm("Remove this question from Phase 2?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/phase2-questions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function toggleQuestionActive(q: Phase2Question) {
    try {
      const res = await fetch(`/api/companies/${companyId}/phase2-questions/${q.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !q.isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Update failed");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  const totalMinutes = phase2Enabled ? phase1Minutes + phase2Minutes : phase1Minutes;

  if (loading && !config) {
    return (
      <div className={`${glassCard} p-8 flex items-center justify-center gap-2 text-slate-400`}>
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading interview phases…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Two-Phase Interview</h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Phase 1 is an AI-led discovery conversation. Phase 2 presents fixed objective questions
            from your uploaded file — asked verbatim in order.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="shrink-0 p-2 rounded-lg border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      )}

      {/* Timeline visual */}
      <div className={`${glassCard} p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-amber-400" />
          <h3 className="font-medium text-slate-200">Interview timeline</h3>
          <span className="ml-auto text-xs text-slate-500 tabular-nums">
            Total: {totalMinutes} min
          </span>
        </div>

        <div className="flex h-3 rounded-full overflow-hidden border border-white/10 mb-6">
          <div
            className="bg-gradient-to-r from-amber-600 to-amber-400 transition-all"
            style={{
              width: `${totalMinutes > 0 ? (phase1Minutes / totalMinutes) * 100 : 50}%`,
            }}
            title={phase1Title}
          />
          {phase2Enabled && (
            <div
              className="bg-gradient-to-r from-sky-600 to-sky-400 transition-all"
              style={{
                width: `${totalMinutes > 0 ? (phase2Minutes / totalMinutes) * 100 : 50}%`,
              }}
              title={phase2Title}
            />
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-950/10 p-4">
            <p className="text-xs uppercase tracking-wider text-amber-400">Phase 1 — AI conversation</p>
            <label className="block text-xs text-slate-400">
              Display title
              <input
                value={phase1Title}
                onChange={(e) => setPhase1Title(e.target.value)}
                className="mt-1 w-full rounded-lg bg-slate-900/80 border border-white/10 px-3 py-2 text-sm text-slate-100"
                maxLength={80}
              />
            </label>
            <label className="block text-xs text-slate-400">
              Duration (minutes)
              <input
                type="number"
                min={1}
                max={120}
                value={phase1Minutes}
                onChange={(e) => setPhase1Minutes(Number(e.target.value))}
                className="mt-1 w-full rounded-lg bg-slate-900/80 border border-white/10 px-3 py-2 text-sm text-slate-100"
              />
            </label>
          </div>

          <div
            className={`space-y-3 rounded-xl border p-4 ${
              phase2Enabled
                ? "border-sky-500/20 bg-sky-950/10"
                : "border-white/5 bg-slate-900/30 opacity-60"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-sky-400">Phase 2 — Fixed questions</p>
              <button
                type="button"
                onClick={() => setPhase2Enabled((v) => !v)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
              >
                {phase2Enabled ? (
                  <ToggleRight className="w-5 h-5 text-sky-400" />
                ) : (
                  <ToggleLeft className="w-5 h-5" />
                )}
                {phase2Enabled ? "Enabled" : "Disabled"}
              </button>
            </div>
            <label className="block text-xs text-slate-400">
              Display title
              <input
                value={phase2Title}
                onChange={(e) => setPhase2Title(e.target.value)}
                disabled={!phase2Enabled}
                className="mt-1 w-full rounded-lg bg-slate-900/80 border border-white/10 px-3 py-2 text-sm text-slate-100 disabled:opacity-50"
                maxLength={80}
              />
            </label>
            <label className="block text-xs text-slate-400">
              Duration (minutes)
              <input
                type="number"
                min={1}
                max={120}
                value={phase2Minutes}
                onChange={(e) => setPhase2Minutes(Number(e.target.value))}
                disabled={!phase2Enabled}
                className="mt-1 w-full rounded-lg bg-slate-900/80 border border-white/10 px-3 py-2 text-sm text-slate-100 disabled:opacity-50"
              />
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void saveConfig()}
          disabled={saving}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save timeline
        </button>
      </div>

      {/* Question upload */}
      <div className={`${glassCard} p-6`}>
        <div className="flex items-center gap-2 mb-2">
          <FileUp className="w-4 h-4 text-sky-400" />
          <h3 className="font-medium text-slate-200">Phase 2 question bank</h3>
          <span className="ml-auto text-xs text-slate-500">
            {config?.phase2QuestionCount ?? questions.filter((q) => q.isActive).length} active
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Upload a .txt, .csv, .xlsx, .xls, or text-based .pdf file. One question per line, or columns:
          Question, Type (text/mcq/yes_no/rating), Options (pipe-separated), Section. For MCQ use at least 2
          options — e.g. <code className="text-slate-400">Which ERP?,mcq,SAP|Oracle|Excel</code>
        </p>

        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-white/20 hover:border-sky-500/50 hover:bg-sky-950/20 cursor-pointer text-sm text-slate-300">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
          {uploading ? "Uploading…" : "Upload question file (replaces existing)"}
          <input
            type="file"
            accept=".txt,.csv,.xlsx,.xls,.pdf"
            className="hidden"
            disabled={uploading}
            onChange={(e) => void handleUpload(e)}
          />
        </label>
      </div>

      {/* Question list */}
      <div className={`${glassCard} p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <ListChecks className="w-4 h-4 text-slate-400" />
          <h3 className="font-medium text-slate-200">Questions ({questions.length})</h3>
        </div>

        {questions.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            No Phase 2 questions yet. Upload a file to define the objective question set.
          </p>
        ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const options = q.optionsJson ? (JSON.parse(q.optionsJson) as string[]) : [];
              return (
                <div
                  key={q.id}
                  className={`flex gap-3 items-start rounded-lg border px-4 py-3 ${
                    q.isActive
                      ? "border-white/10 bg-slate-900/40"
                      : "border-white/5 bg-slate-900/20 opacity-50"
                  }`}
                >
                  <span className="text-xs text-slate-500 tabular-nums w-6 shrink-0 pt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200">{q.promptEn}</p>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {q.questionType}
                      </span>
                      {q.section && (
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          §{q.section}
                        </span>
                      )}
                      {options.length > 0 && (
                        <span className="text-[10px] text-slate-500 truncate max-w-xs">
                          {options.join(" | ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => void toggleQuestionActive(q)}
                      className="p-1.5 rounded text-slate-500 hover:text-slate-300"
                      title={q.isActive ? "Deactivate" : "Activate"}
                    >
                      {q.isActive ? (
                        <ToggleRight className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteQuestion(q.id)}
                      className="p-1.5 rounded text-slate-500 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
