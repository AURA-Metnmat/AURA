"use client";

import { useState } from "react";
import { Shield, Loader2, ArrowLeft } from "lucide-react";

interface EmployeeChangePasswordFormProps {
  companyId: string;
  username: string;
  onBack: () => void;
  onSuccess: () => void;
}

export function EmployeeChangePasswordForm({
  companyId,
  username,
  onBack,
  onSuccess,
}: EmployeeChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/employees/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          company_id: companyId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to change password");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <Shield className="w-6 h-6 text-amber-400" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-100">Change your password</h2>
          <p className="text-sm text-slate-400">
            Hi <span className="text-amber-200">{username}</span> — for security, set a new password
            before continuing.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-sm p-6 space-y-4 shadow-xl"
        >
          <label className="block space-y-1.5">
            <span className="text-xs text-slate-400">Current password (from SMS)</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-slate-400">New password (min 6 characters)</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-slate-400">Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50"
            />
          </label>

          {error && (
            <p className="text-sm text-red-300 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save password & continue
          </button>
        </form>

        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>
    </main>
  );
}
