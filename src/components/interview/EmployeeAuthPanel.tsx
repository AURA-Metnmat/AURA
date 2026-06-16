"use client";

import { useState } from "react";
import { UserPlus, LogIn, Loader2, ArrowLeft, Phone, Mail, User } from "lucide-react";
import { cn } from "@/lib/utils";

type AuthMode = "register" | "login";

interface EmployeeAuthPanelProps {
  companyName: string;
  companyId: string;
  onBack: () => void;
  onSuccess: (payload: {
    isFirstLogin: boolean;
    employeeName: string;
    username: string;
    mobile: string;
    email: string;
  }) => void;
}

export function EmployeeAuthPanel({
  companyName,
  companyId,
  onBack,
  onSuccess,
}: EmployeeAuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("register");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [employeeName, setEmployeeName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/employees/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_name: employeeName,
          mobile_number: mobile,
          email: email || undefined,
          company_id: companyId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed");

      onSuccess({
        isFirstLogin: true,
        employeeName: employeeName.trim(),
        username: data.username,
        mobile: mobile.replace(/\D/g, "").slice(-10),
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
      const res = await fetch("/api/employees/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          company_id: companyId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");

      onSuccess({
        isFirstLogin: data.is_first_login,
        employeeName: data.employee_name,
        username: data.username,
        mobile: data.mobile_number,
        email: data.email ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
      <div className="w-full max-w-md space-y-6">
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
              ? "Register once — your credentials will be sent by SMS."
              : "Log in to continue your interview where you left off."}
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
            Login
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
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50"
                  placeholder="Rahul Sharma"
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
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Register & receive credentials
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400">Username</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50"
                  placeholder="Your registered name"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  inputMode="numeric"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50"
                  placeholder="4-digit code from SMS"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Log in & continue
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
