"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import {
  AuthSwitch,
  AuthInputField,
  AuthFieldHint,
  AuthError,
} from "@/components/ui/auth-switch";
import type { Language } from "@/lib/aura/i18n";

type AuthMode = "register" | "signIn";
type AuthStep = "form" | "otp";

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
    attachments?: {
      id: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      filePath: string;
    }[];
  }[];
  participant: EmployeeProfileForm;
  startedAt: string;
}

interface EmployeeAuthPanelProps {
  companyName: string;
  companySlug: string;
  companyId: string;
  inviteToken?: string;
  onBack: () => void;
  onRegistered: (form: EmployeeProfileForm) => void;
  onLoggedIn: (payload: {
    form: EmployeeProfileForm;
    activeSession: ActiveSessionPayload | null;
  }) => void;
}

const RESEND_COOLDOWN = 60;

function normalizeMobile(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(-10);
  return digits.slice(-10);
}

function isValidMobile(value: string): boolean {
  const m = normalizeMobile(value);
  return /^[6-9]\d{9}$/.test(m);
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function isValidIdentifier(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.includes("@")) return isValidEmail(trimmed);
  return isValidMobile(trimmed);
}

export function EmployeeAuthPanel({
  companyName,
  companySlug,
  companyId,
  inviteToken,
  onBack,
  onRegistered,
  onLoggedIn,
}: EmployeeAuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("register");
  const [step, setStep] = useState<AuthStep>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maskedMobile, setMaskedMobile] = useState("******0000");
  const [otp, setOtp] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);

  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [signInIdentifier, setSignInIdentifier] = useState("");

  const [pendingMobile, setPendingMobile] = useState("");
  const [pendingIdentifier, setPendingIdentifier] = useState("");

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = window.setInterval(() => {
      setResendSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendSeconds]);

  const resetOtpStep = useCallback(() => {
    setStep("form");
    setOtp("");
    setError(null);
    setResendSeconds(0);
  }, []);

  function switchMode(next: AuthMode) {
    setMode(next);
    resetOtpStep();
    setError(null);
  }

  async function requestSignupOtp() {
    if (!fullName.trim() || !designation.trim() || !department.trim()) {
      setError("Please complete all profile fields.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!isValidMobile(mobile)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    const normalizedMobile = normalizeMobile(mobile);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/employee/signup/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companySlug,
          name: fullName.trim(),
          designation: designation.trim(),
          department: department.trim(),
          email: normalizeEmail(email),
          mobileNumber: normalizedMobile,
          inviteToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send OTP.");

      setPendingMobile(normalizedMobile);
      setMaskedMobile(data.maskedMobile ?? `******${normalizedMobile.slice(-4)}`);
      setStep("otp");
      setResendSeconds(RESEND_COOLDOWN);
      setOtp("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function verifySignupOtp() {
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/employee/signup/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          companySlug,
          mobileNumber: pendingMobile,
          otp,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Invalid or expired OTP.");

      const profile: EmployeeProfileForm = {
        fullName: data.employee_name ?? fullName.trim(),
        designation: data.designation ?? designation.trim(),
        department: data.department ?? department.trim(),
        mobile: data.mobile_number ?? pendingMobile,
        email: data.email ?? normalizeEmail(email),
      };

      if (data.active_session) {
        onLoggedIn({ form: profile, activeSession: data.active_session });
      } else {
        onRegistered(profile);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function requestSigninOtp() {
    if (!isValidIdentifier(signInIdentifier)) {
      setError("Enter your registered mobile number or email.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const identifier = signInIdentifier.trim();
      const res = await fetch("/api/auth/employee/signin/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companySlug, identifier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send OTP.");

      setPendingIdentifier(identifier);
      setMaskedMobile(data.maskedMobile ?? "******0000");
      setStep("otp");
      setResendSeconds(RESEND_COOLDOWN);
      setOtp("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function verifySigninOtp() {
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/employee/signin/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          companySlug,
          identifier: pendingIdentifier,
          otp,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Invalid or expired OTP.");

      onLoggedIn({
        form: {
          fullName: data.employee_name ?? "",
          designation: data.designation ?? "",
          department: data.department ?? "",
          mobile: data.mobile_number ?? "",
          email: data.email ?? "",
        },
        activeSession: data.active_session ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendSeconds > 0 || loading) return;
    if (mode === "register") {
      await requestSignupOtp();
    } else {
      await requestSigninOtp();
    }
  }

  function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    void requestSignupOtp();
  }

  function handleSignInSubmit(e: React.FormEvent) {
    e.preventDefault();
    void requestSigninOtp();
  }

  function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "register") void verifySignupOtp();
    else void verifySigninOtp();
  }

  const iconSize = 18;

  if (step === "otp") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-10 overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-950/40 border border-red-900/40 mx-auto mb-4">
              <ShieldCheck className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white text-center">Verify your mobile</h2>
            <p className="text-sm text-neutral-400 text-center mt-2 leading-relaxed">
              We sent a 6-digit OTP to your mobile number ending with{" "}
              <span className="text-neutral-200 font-medium">{maskedMobile.slice(-4)}</span>.
            </p>

            <form onSubmit={handleOtpSubmit} className="mt-6 space-y-4">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="• • • • • •"
                className="w-full bg-[#1c1c1c] border border-[#333] rounded-xl px-4 py-3.5 text-center text-xl tracking-[0.35em] font-mono text-white focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-900/30"
                disabled={loading}
                aria-label="6-digit OTP"
              />

              {error && <AuthError message={error} />}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[#450a0a] to-[#991b1b] border border-red-800/50 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:from-[#7f1d1d] hover:to-[#b91c1c] disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Verify & continue
              </button>

              <button
                type="button"
                onClick={() => void handleResendOtp()}
                disabled={loading || resendSeconds > 0}
                className="w-full text-xs text-neutral-500 hover:text-red-300 disabled:opacity-40 py-2"
              >
                {resendSeconds > 0
                  ? `Resend OTP in ${resendSeconds}s`
                  : "Resend OTP"}
              </button>

              <button
                type="button"
                onClick={resetOtpStep}
                className="w-full text-xs text-neutral-500 hover:text-neutral-300 py-1"
              >
                ← Back and edit details
              </button>
            </form>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 mx-auto mt-5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to language
          </button>
        </div>
      </main>
    );
  }

  const signInForm = (
    <form onSubmit={handleSignInSubmit} className="w-full flex flex-col items-center">
      <p className="auth-subtitle">
        Enter your registered mobile number or email to continue where you left off.
      </p>
      <AuthInputField
        icon={<Phone size={iconSize} />}
        name="signInIdentifier"
        value={signInIdentifier}
        onChange={setSignInIdentifier}
        placeholder="Mobile number or email"
        required
        autoComplete="username"
      />
      {error && mode === "signIn" && <AuthError message={error} />}
      <button type="submit" disabled={loading} className="auth-btn">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        Continue interview
      </button>
    </form>
  );

  const signUpForm = (
    <form onSubmit={handleRegisterSubmit} className="w-full flex flex-col items-center">
      <p className="auth-subtitle">
        Fill in your details once — then start talking with AURA at {companyName}.
      </p>
      <AuthInputField
        icon={<User size={iconSize} />}
        name="fullName"
        value={fullName}
        onChange={setFullName}
        placeholder="Employee name"
        required
        autoComplete="name"
      />
      <AuthInputField
        icon={<Briefcase size={iconSize} />}
        name="designation"
        value={designation}
        onChange={setDesignation}
        placeholder="Designation"
        required
        autoComplete="organization-title"
      />
      <AuthInputField
        icon={<Building2 size={iconSize} />}
        name="department"
        value={department}
        onChange={setDepartment}
        placeholder="Department"
        required
        autoComplete="organization"
      />
      <AuthInputField
        icon={<Mail size={iconSize} />}
        type="email"
        name="email"
        value={email}
        onChange={setEmail}
        placeholder="Email address"
        required
        autoComplete="email"
      />
      <AuthInputField
        icon={<Phone size={iconSize} />}
        type="tel"
        name="mobile"
        value={mobile}
        onChange={setMobile}
        placeholder="Mobile number"
        required
        autoComplete="tel"
      />
      <AuthFieldHint>Use your registered mobile number to sign in later.</AuthFieldHint>
      {error && mode === "register" && <AuthError message={error} />}
      <button type="submit" disabled={loading} className="auth-btn">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        Register & start interview
      </button>
    </form>
  );

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-10 overflow-y-auto">
      <div className="w-full max-w-[920px] space-y-5 my-auto">
        <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          <span className="text-neutral-400">● Language</span>
          <span className="text-neutral-700">—</span>
          <span className="text-red-400/90 font-medium">● Account</span>
          <span className="text-neutral-700">—</span>
          <span className="text-neutral-600">○ Interview</span>
        </div>

        <div className="text-center space-y-1 px-2">
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-200 font-medium">
            {companyName}
          </p>
          <p className="text-sm text-neutral-500">Secure mobile OTP verification</p>
        </div>

        <AuthSwitch
          isSignUp={mode === "register"}
          onModeChange={(signUp) => switchMode(signUp ? "register" : "signIn")}
          signInTitle="Welcome back"
          signUpTitle="Create your profile"
          signUpPanelHeading="New here?"
          signUpPanelText={`Join ${companyName} on AURA — register once and start your AI interview in seconds.`}
          signInPanelHeading="One of us?"
          signInPanelText="Welcome back! Sign in with your registered mobile number to resume your interview."
          signInForm={signInForm}
          signUpForm={signUpForm}
        />

        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 mx-auto pt-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to language
        </button>
      </div>
    </main>
  );
}
