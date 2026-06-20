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
import {
  AuthSwitch,
  AuthInputField,
  AuthFieldHint,
  AuthError,
} from "@/components/ui/auth-switch";
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

function normalizeMobile(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

function isValidMobile(value: string): boolean {
  return /^\d{10}$/.test(normalizeMobile(value));
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function OtpBlock({
  email,
  otpSent,
  otpVerified,
  otpCode,
  setOtpCode,
  otpLoading,
  resendCooldown,
  error,
  devOtpHint,
  deliveryHint,
  onSendOtp,
  onVerifyOtp,
}: {
  email: string;
  otpSent: boolean;
  otpVerified: boolean;
  otpCode: string;
  setOtpCode: (v: string) => void;
  otpLoading: boolean;
  resendCooldown: number;
  error: string | null;
  devOtpHint: string | null;
  deliveryHint: string | null;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
}) {
  const normalized = normalizeEmail(email);
  const canVerify = otpCode.replace(/\D/g, "").length === 6 && !otpLoading;

  if (!isValidEmail(normalized)) return null;

  if (otpVerified) {
    return (
      <div className="auth-otp-wrap">
        <div className="auth-otp-verified">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>{normalized} verified</span>
        </div>
      </div>
    );
  }

  if (!otpSent) {
    return (
      <div className="auth-otp-wrap">
        <p className="auth-otp-hint">A 6-digit code will be sent to your email.</p>
        <button type="button" disabled={otpLoading} onClick={onSendOtp} className="auth-otp-send">
          {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          Send OTP to {normalized}
        </button>
        {error && <p className="text-xs text-red-300 text-center mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="auth-otp-wrap">
      <div className="auth-otp-panel">
        <p className="auth-otp-hint">
          {deliveryHint ?? `Enter OTP sent to ${normalized}`}
        </p>
        {devOtpHint && (
          <p className="text-[11px] text-red-300/90 bg-red-950/40 border border-red-900/50 rounded-lg px-2 py-1.5 text-center mb-2">
            Dev code: <span className="font-mono font-semibold tracking-widest">{devOtpHint}</span>
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
            className="auth-otp-input"
          />
          <button type="button" disabled={!canVerify} onClick={onVerifyOtp} className="auth-otp-verify">
            {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
          </button>
        </div>
        <button
          type="button"
          disabled={resendCooldown > 0 || otpLoading}
          onClick={onSendOtp}
          className="auth-otp-resend"
        >
          <RefreshCw className="w-3 h-3" />
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
        </button>
        {error && <p className="text-xs text-red-300 text-center mt-2">{error}</p>}
      </div>
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
  const [deliveryHint, setDeliveryHint] = useState<string | null>(null);
  const autoSendAttempted = useRef<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");

  const activeEmail = mode === "register" ? email : loginEmail;

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
    setDeliveryHint(null);
    autoSendAttempted.current = null;
  }, []);

  function switchMode(next: AuthMode) {
    setMode(next);
    resetOtpState();
  }

  function handleEmailChange(value: string) {
    if (mode === "register") setEmail(value);
    else setLoginEmail(value);
    resetOtpState();
  }

  const sendOtp = useCallback(async () => {
    const normalized = normalizeEmail(activeEmail);
    if (!isValidEmail(normalized)) {
      setError("Enter a valid email address.");
      return;
    }

    setOtpLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/employees/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalized,
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
      setDeliveryHint(
        data.delivery_method === "email"
          ? `Code sent to ${normalized}. Check your inbox.`
          : null
      );
      autoSendAttempted.current = `${mode}:${normalized}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  }, [activeEmail, companyId, mode]);

  useEffect(() => {
    if (mode !== "login") return;
    const normalized = normalizeEmail(activeEmail);
    const key = `${mode}:${normalized}`;
    if (!isValidEmail(normalized) || otpSent || otpVerified || otpLoading) return;
    if (autoSendAttempted.current === key) return;

    const timer = window.setTimeout(() => {
      autoSendAttempted.current = key;
      void sendOtp();
    }, 600);

    return () => window.clearTimeout(timer);
  }, [activeEmail, mode, otpSent, otpVerified, otpLoading, sendOtp]);

  async function verifyOtp() {
    const normalized = normalizeEmail(activeEmail);
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
          email: normalized,
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

  async function handleRegister() {
    if (!otpToken) {
      setError("Verify your email with OTP first.");
      return;
    }
    if (!isValidMobile(mobile)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const normalizedMobile = normalizeMobile(mobile);
      const normalizedEmail = normalizeEmail(email);
      const res = await fetch("/api/employees/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_name: fullName,
          designation,
          department,
          mobile_number: normalizedMobile,
          email: normalizedEmail,
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
        email: normalizedEmail,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    if (!otpToken) {
      setError("Verify your email with OTP first.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const normalizedEmail = normalizeEmail(loginEmail);
      const res = await fetch("/api/employees/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
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
          mobile: data.mobile_number ?? "",
          email: data.email ?? normalizedEmail,
        },
        activeSession: data.active_session ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  const iconSize = 18;

  const otpBlock = (
    <OtpBlock
      email={activeEmail}
      otpSent={otpSent}
      otpVerified={otpVerified}
      otpCode={otpCode}
      setOtpCode={setOtpCode}
      otpLoading={otpLoading}
      resendCooldown={resendCooldown}
      error={error}
      devOtpHint={devOtpHint}
      deliveryHint={deliveryHint}
      onSendOtp={() => void sendOtp()}
      onVerifyOtp={() => void verifyOtp()}
    />
  );

  const signInForm = (
    <div className="w-full flex flex-col items-center">
      <p className="auth-subtitle">Enter your email — we&apos;ll send a one-time code to sign in.</p>
      <AuthInputField
        icon={<Mail size={iconSize} />}
        type="email"
        name="loginEmail"
        value={loginEmail}
        onChange={handleEmailChange}
        placeholder="Email address"
        required
        autoComplete="email"
      />
      {otpBlock}
      {error && mode === "login" && !otpSent && <AuthError message={error} />}
      <button
        type="button"
        disabled={loading || !otpVerified}
        onClick={() => void handleLogin()}
        className="auth-btn"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        Continue interview
      </button>
    </div>
  );

  const signUpForm = (
    <div className="w-full flex flex-col items-center">
      <p className="auth-subtitle">
        Fill in your details once — verify your email, then start talking with AURA.
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
        onChange={handleEmailChange}
        placeholder="Email address"
        required
        autoComplete="email"
      />
      {otpBlock}
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
      <AuthFieldHint>Mobile is saved to your profile — sign in uses email OTP.</AuthFieldHint>
      {error && mode === "register" && !otpSent && <AuthError message={error} />}
      <button
        type="button"
        disabled={loading || !otpVerified}
        onClick={() => void handleRegister()}
        className="auth-btn"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        Register & start interview
      </button>
    </div>
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
          <p className="text-sm text-neutral-500">Email OTP verification required</p>
        </div>

        <AuthSwitch
          isSignUp={mode === "register"}
          onModeChange={(signUp) => switchMode(signUp ? "register" : "login")}
          signInTitle="Welcome back"
          signUpTitle="Create your profile"
          signUpPanelHeading="New here?"
          signUpPanelText={`Join ${companyName} on AURA — register once and start your AI interview in seconds.`}
          signInPanelHeading="One of us?"
          signInPanelText="Welcome back! Sign in with your email to resume your interview."
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
