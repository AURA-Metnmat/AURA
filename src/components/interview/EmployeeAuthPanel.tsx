"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Loader2,
  ArrowLeft,
  Phone,
  Mail,
  User,
  Briefcase,
  Building2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import type { Language } from "@/lib/aura/i18n";
import { cn } from "@/lib/utils";

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

function normalizeMobile(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

function isValidMobile(value: string): boolean {
  return /^\d{10}$/.test(normalizeMobile(value));
}

function AuthField({
  icon,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  name,
  autoComplete,
  disabled,
}: {
  icon: React.ReactNode;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
  name?: string;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative w-full">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">{icon}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        disabled={disabled}
        className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/15 disabled:opacity-50"
      />
    </div>
  );
}

function OtpBlock({
  mobile,
  otpSent,
  otpVerified,
  otpCode,
  setOtpCode,
  otpLoading,
  resendCooldown,
  error,
  devOtpHint,
  onSendOtp,
  onVerifyOtp,
}: {
  mobile: string;
  otpSent: boolean;
  otpVerified: boolean;
  otpCode: string;
  setOtpCode: (v: string) => void;
  otpLoading: boolean;
  resendCooldown: number;
  error: string | null;
  devOtpHint: string | null;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
}) {
  const normalized = normalizeMobile(mobile);
  const canVerify = otpCode.replace(/\D/g, "").length === 6 && !otpLoading;

  if (!isValidMobile(normalized)) return null;

  if (otpVerified) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <p className="text-xs text-emerald-300">+91 {normalized} verified</p>
      </div>
    );
  }

  if (!otpSent) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-slate-500 px-1">We&apos;ll send a 6-digit code to verify this number.</p>
        <button
          type="button"
          disabled={otpLoading}
          onClick={onSendOtp}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-white/10 text-sm text-slate-200 disabled:opacity-40 transition-colors"
        >
          {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-amber-400" />}
          Send OTP to +91 {normalized}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl bg-slate-900/40 border border-white/8 p-3">
      <p className="text-xs text-slate-400">
        Enter OTP sent to <span className="text-slate-200">+91 {normalized}</span>
      </p>
      {devOtpHint && (
        <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-center">
          Local dev: your code is <span className="font-mono font-semibold tracking-widest">{devOtpHint}</span>
        </p>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="6-digit code"
          autoFocus
          className="flex-1 bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-center text-base tracking-[0.35em] font-mono text-slate-100 placeholder:text-slate-600 placeholder:tracking-normal focus:outline-none focus:border-amber-500/40"
        />
        <button
          type="button"
          disabled={!canVerify}
          onClick={onVerifyOtp}
          className="shrink-0 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold disabled:opacity-40"
        >
          {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
        </button>
      </div>
      <button
        type="button"
        disabled={resendCooldown > 0 || otpLoading}
        onClick={onSendOtp}
        className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 disabled:opacity-40 mx-auto"
      >
        <RefreshCw className="w-3 h-3" />
        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
      </button>
      {error && <p className="text-xs text-red-300 text-center">{error}</p>}
    </div>
  );
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
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const autoSendAttempted = useRef<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [loginMobile, setLoginMobile] = useState("");

  const activeMobile = mode === "register" ? mobile : loginMobile;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  const resetOtpState = useCallback(() => {
    setOtpSent(false);
    setOtpVerified(false);
    setOtpToken(null);
    setOtpCode("");
    setError(null);
    setDevOtpHint(null);
    autoSendAttempted.current = null;
  }, []);

  function switchMode(next: AuthMode) {
    setMode(next);
    resetOtpState();
  }

  function handleMobileChange(value: string) {
    if (mode === "register") setMobile(value);
    else setLoginMobile(value);
    resetOtpState();
  }

  const sendOtp = useCallback(async () => {
    const normalized = normalizeMobile(activeMobile);
    if (!isValidMobile(normalized)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    setOtpLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/employees/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile_number: normalized,
          company_id: companyId,
          purpose: mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send OTP");

      setOtpSent(true);
      setOtpVerified(false);
      setOtpToken(null);
      setOtpCode("");
      setResendCooldown(60);
      setDevOtpHint(typeof data.dev_otp === "string" ? data.dev_otp : null);
      autoSendAttempted.current = `${mode}:${normalized}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  }, [activeMobile, companyId, mode]);

  useEffect(() => {
    const normalized = normalizeMobile(activeMobile);
    const key = `${mode}:${normalized}`;
    if (!isValidMobile(normalized) || otpSent || otpVerified || otpLoading) return;
    if (autoSendAttempted.current === key) return;

    const timer = window.setTimeout(() => {
      autoSendAttempted.current = key;
      void sendOtp();
    }, 600);

    return () => window.clearTimeout(timer);
  }, [activeMobile, mode, otpSent, otpVerified, otpLoading, sendOtp]);

  async function verifyOtp() {
    const normalized = normalizeMobile(activeMobile);
    const code = otpCode.replace(/\D/g, "");
    if (code.length !== 6) {
      setError("Enter the 6-digit OTP.");
      return;
    }

    setOtpLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/employees/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile_number: normalized,
          company_id: companyId,
          purpose: mode,
          code,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "OTP verification failed");

      setOtpVerified(true);
      setOtpToken(data.otp_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!otpToken) {
      setError("Verify your mobile number with OTP first.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const normalizedMobile = normalizeMobile(mobile);
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
          otp_token: otpToken,
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
    if (!otpToken) {
      setError("Verify your mobile number with OTP first.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const normalizedMobile = normalizeMobile(loginMobile);
      const res = await fetch("/api/employees/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile_number: normalizedMobile,
          company_id: companyId,
          otp_token: otpToken,
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

  const iconSize = 17;

  const otpBlock = (
    <OtpBlock
      mobile={activeMobile}
      otpSent={otpSent}
      otpVerified={otpVerified}
      otpCode={otpCode}
      setOtpCode={setOtpCode}
      otpLoading={otpLoading}
      resendCooldown={resendCooldown}
      error={error}
      devOtpHint={devOtpHint}
      onSendOtp={() => void sendOtp()}
      onVerifyOtp={() => void verifyOtp()}
    />
  );

  return (
    <main className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center px-4 sm:px-6 py-6">
      <div className="w-full max-w-md space-y-5 my-auto">
        <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
          <span className="text-slate-400">Language</span>
          <span>·</span>
          <span className="text-amber-400/90 font-medium">Account</span>
          <span>·</span>
          <span>Interview</span>
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-widest text-slate-400">{companyName}</p>
          <h2 className="text-xl font-semibold text-slate-100">
            {mode === "register" ? "Create your profile" : "Welcome back"}
          </h2>
          <p className="text-sm text-slate-500">Mobile OTP verification required</p>
        </div>

        <div className="flex rounded-xl bg-slate-900/60 border border-white/10 p-1">
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors",
              mode === "register"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors",
              mode === "login"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            Sign in
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 sm:p-6 space-y-4">
          {mode === "register" ? (
            <div className="space-y-3">
              <AuthField icon={<User size={iconSize} />} value={fullName} onChange={setFullName} placeholder="Employee name" required autoComplete="name" />
              <AuthField icon={<Briefcase size={iconSize} />} value={designation} onChange={setDesignation} placeholder="Designation" required autoComplete="organization-title" />
              <AuthField icon={<Building2 size={iconSize} />} value={department} onChange={setDepartment} placeholder="Department" required autoComplete="organization" />
              <AuthField icon={<Phone size={iconSize} />} type="tel" value={mobile} onChange={handleMobileChange} placeholder="Mobile number" required autoComplete="tel" />
              {otpBlock}
              <AuthField icon={<Mail size={iconSize} />} type="email" value={email} onChange={setEmail} placeholder="Email (optional)" autoComplete="email" />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-400 text-center">Sign in with your registered mobile number.</p>
              <AuthField icon={<Phone size={iconSize} />} type="tel" value={loginMobile} onChange={handleMobileChange} placeholder="Mobile number" required autoComplete="tel" />
              {otpBlock}
            </div>
          )}

          {error && !otpSent && (
            <p className="text-sm text-red-300 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-2.5 text-center">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={loading || !otpVerified}
            onClick={(e) => {
              if (mode === "register") void handleRegister(e as unknown as React.FormEvent);
              else void handleLogin(e as unknown as React.FormEvent);
            }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm disabled:opacity-40 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {mode === "register" ? "Register & start interview" : "Continue interview"}
          </button>
        </div>

        <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 mx-auto">
          <ArrowLeft className="w-4 h-4" />
          Back to language
        </button>
      </div>
    </main>
  );
}
