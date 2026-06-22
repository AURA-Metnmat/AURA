"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Shield } from "lucide-react";
import {
  REGISTRATION_MODE_LABELS,
  type RegistrationPolicyFields,
} from "@/lib/companies/registration-policy";
import type { RegistrationMode } from "@/lib/auth/employee-otp/types";

interface RegistrationPolicyPanelProps {
  companyId: string;
  glassCard: string;
}

export default function RegistrationPolicyPanel({
  companyId,
  glassCard,
}: RegistrationPolicyPanelProps) {
  const [policy, setPolicy] = useState<RegistrationPolicyFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load registration policy");
      setPolicy(data.company.registrationPolicy);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load registration policy");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!policy) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowEmployeeSelfRegistration: policy.allowEmployeeSelfRegistration,
          requireMobileOtpForEmployeeLogin: policy.requireMobileOtpForEmployeeLogin,
          allowedEmailDomains: policy.allowedEmailDomains,
          registrationMode: policy.registrationMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save registration policy");
      setPolicy(data.company.registrationPolicy);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save registration policy");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (!policy) {
    return (
      <div className={`${glassCard} p-4 text-sm text-red-400`}>
        {error ?? "Registration policy unavailable"}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-violet-400" />
        <h3 className="font-semibold text-slate-100">Employee registration policy</h3>
      </div>
      <p className="text-xs text-slate-500">
        Control who can create new employee accounts before starting an interview. Existing employees can
        always sign in unless their account is deactivated.
      </p>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Registration policy saved.
        </div>
      )}

      <div className={`${glassCard} p-4 space-y-4`}>
        <label className="block space-y-2">
          <span className="text-xs text-slate-400 uppercase tracking-wide">Registration mode</span>
          <select
            value={policy.registrationMode}
            onChange={(e) =>
              setPolicy((p) =>
                p ? { ...p, registrationMode: e.target.value as RegistrationMode } : p
              )
            }
            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm"
          >
            {(Object.entries(REGISTRATION_MODE_LABELS) as [RegistrationMode, string][]).map(
              ([mode, label]) => (
                <option key={mode} value={mode}>
                  {label}
                </option>
              )
            )}
          </select>
        </label>

        <label className="flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={policy.allowEmployeeSelfRegistration}
            onChange={(e) =>
              setPolicy((p) =>
                p ? { ...p, allowEmployeeSelfRegistration: e.target.checked } : p
              )
            }
            className="rounded border-white/20"
          />
          Allow employee self-registration
        </label>

        <label className="flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={policy.requireMobileOtpForEmployeeLogin}
            onChange={(e) =>
              setPolicy((p) =>
                p ? { ...p, requireMobileOtpForEmployeeLogin: e.target.checked } : p
              )
            }
            className="rounded border-white/20"
          />
          Require mobile OTP for employee login (OTP flow endpoints)
        </label>

        <label className="block space-y-2">
          <span className="text-xs text-slate-400 uppercase tracking-wide">
            Allowed email domains (optional)
          </span>
          <input
            value={policy.allowedEmailDomains ?? ""}
            onChange={(e) =>
              setPolicy((p) =>
                p ? { ...p, allowedEmailDomains: e.target.value || null } : p
              )
            }
            placeholder="metnmat.com, subsidiary.in"
            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm"
          />
          <p className="text-[11px] text-slate-600">Comma-separated. Leave empty to allow any domain.</p>
        </label>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-200 disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save registration policy
      </button>
    </section>
  );
}
