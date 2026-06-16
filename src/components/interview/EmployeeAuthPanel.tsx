"use client";

import { useState } from "react";
import {
  UserPlus,
  LogIn,
  Loader2,
  ArrowLeft,
  Phone,
  Mail,
  User,
  Briefcase,
  Building2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/aura/i18n";

type AuthMode = "register" | "login";

export interface EmployeeProfileForm {
  fullName: string;
  designation: string;
  department: string;
  mobile: string;
  email: string;
}

interface ActiveSessionPayload {
  sessionId: string;
  language: Language;
  currentSection: string;
  completionPct: number;
  interviewDurationMinutes: number;
  messages: {
    role: "user" | "assistant";
    contentEn: string;
    contentLocale: string;
  }[];
  participant: EmployeeProfileForm;
  startedAt: string;
}

interface EmployeeAuthPanelProps {
  companyName: string;
  companyId: string;
  onBack: () => void;
  onRegistered: (form: EmployeeProfileForm) => void;
  onLoggedIn: (payload: { form: EmployeeProfileForm; activeSession: ActiveSessionPayload | null }) => void;
}

export function EmployeeAuthPanel({
  companyName,
  companyId,
  onBack,
  onRegistered,
  onLoggedIn,
}: EmployeeAuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("register");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [loginMobile, setLoginMobile] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const normalizedMobile = mobile.replace(/\D/g, "").slice(-10);
      const res = await fetch("/api/employees/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_name: fullName,
          designation,
          department,
          mobile_number: normalizedMobile,
          email: email || undefined,
          company_id: companyId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed");

      onRegistered({
        fullName: fullName.trim(),
        designation: designation.trim(),
        department: department.trim(),
        mobile: normalizedMobile,
        email: email.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const normalizedMobile = loginMobile.replace(/\D/g, "").slice(-10);
      const res = await fetch("/api/employees/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile_number: normalizedMobile,
          company_id: companyId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sign in failed");

      onLoggedIn({
        form: {
          fullName: data.employee_name ?? "",
          designation: data.designation ?? "",
          department: data.department ?? "",
          mobile: data.mobile_number ?? normalizedMobile,
          email: data.email ?? "",
        },
        activeSession: data.active_session ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 overflow-y-auto">
      <div className="w-full max-w-md space-y-6 my-auto">
        <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
          <span className="text-emerald-400">● Language</span>
          <span>—</span>
          <span className="text-amber-400">● Account</span>
          <span>—</span>
          <span className="text-slate-600">○ Interview</span>
        </div>

        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-widest text-amber-400/90">{companyName}</p>
          <h2 className="text-2xl font-semibold text-slate-100">
            {mode === "register" ? "Create your profile" : "Welcome back"}
          </h2>
          <p className="text-sm text-slate-400">
            {mode === "register"
              ? "Fill in your details once — then start talking with AURA."
              : "Enter your mobile number to continue where you left off."}
          </p>
        </div>

        <div className="flex rounded-xl border border-white/10 bg-slate-900/60 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
              mode === "register"
                ? "bg-amber-500/20 text-amber-200 border border-amber-500/30"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <UserPlus className="w-4 h-4" />
            Register
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
              mode === "login"
                ? "bg-amber-500/20 text-amber-200 border border-amber-500/30"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <LogIn className="w-4 h-4" />
            Sign in
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-sm p-6 shadow-xl">
          {mode === "register" ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Employee Name *
                </span>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50"
                  placeholder="Rahul Sharma"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> Designation *
                </span>
                <input
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50"
                  placeholder="Production Manager"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Department *
                </span>
                <input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50"
                  placeholder="Operations"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Mobile Number *
                </span>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50"
                  placeholder="9876543210"
                />
                <p className="text-[11px] text-slate-500">Use this same number to sign in later.</p>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email (optional)
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50"
                  placeholder="rahul@company.com"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Register & start interview
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Mobile Number *
                </span>
                <input
                  type="tel"
                  value={loginMobile}
                  onChange={(e) => setLoginMobile(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50"
                  placeholder="9876543210"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Continue interview
              </button>
            </form>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-300 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3">
              {error}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to language
        </button>
      </div>
    </main>
  );
}
