"use client";

import { useState } from "react";
import {
  Loader2,
  ArrowLeft,
  Phone,
  Mail,
  User,
  Briefcase,
  Building2,
  ArrowRight,
  Lock,
} from "lucide-react";
import {
  AuthSwitch,
  AuthInputField,
  AuthFieldHint,
  AuthError,
} from "@/components/ui/auth-switch";
import type { Language } from "@/lib/aura/i18n";

type AuthMode = "register" | "signIn";

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

function toProfile(data: {
  employee_name?: string;
  designation?: string | null;
  department?: string | null;
  mobile_number?: string;
  email?: string | null;
}): EmployeeProfileForm {
  return {
    fullName: data.employee_name ?? "",
    designation: data.designation ?? "",
    department: data.department ?? "",
    mobile: data.mobile_number ?? "",
    email: data.email ?? "",
  };
}

export function EmployeeAuthPanel({
  companyName,
  companySlug,
  inviteToken,
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
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signInIdentifier, setSignInIdentifier] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  const MIN_PASSWORD_LENGTH = 6;

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
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
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const normalizedMobile = normalizeMobile(mobile);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/employee/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          companySlug,
          name: fullName.trim(),
          designation: designation.trim(),
          department: department.trim(),
          email: normalizeEmail(email),
          mobileNumber: normalizedMobile,
          password,
          inviteToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed.");

      const profile = toProfile(data);
      if (data.active_session) {
        onLoggedIn({ form: profile, activeSession: data.active_session });
      } else {
        onRegistered(profile);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidIdentifier(signInIdentifier)) {
      setError("Enter your registered mobile number or email.");
      return;
    }
    if (!signInPassword.trim()) {
      setError("Enter your password.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/employee/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          companySlug,
          identifier: signInIdentifier.trim(),
          password: signInPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sign in failed.");

      onLoggedIn({
        form: toProfile(data),
        activeSession: data.active_session ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  const iconSize = 18;

  const signInForm = (
    <form onSubmit={(e) => void handleSignIn(e)} className="w-full flex flex-col items-center">
      <p className="auth-subtitle">
        Sign in with your mobile number or email and the password you set during registration.
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
      <AuthInputField
        icon={<Lock size={iconSize} />}
        type="password"
        name="signInPassword"
        value={signInPassword}
        onChange={setSignInPassword}
        placeholder="Password"
        required
        autoComplete="current-password"
      />
      {error && mode === "signIn" && <AuthError message={error} />}
      <button type="submit" disabled={loading} className="auth-btn">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        Continue interview
      </button>
    </form>
  );

  const signUpForm = (
    <form onSubmit={(e) => void handleRegister(e)} className="w-full flex flex-col items-center">
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
      <AuthInputField
        icon={<Lock size={iconSize} />}
        type="password"
        name="password"
        value={password}
        onChange={setPassword}
        placeholder="Create password"
        required
        autoComplete="new-password"
      />
      <AuthInputField
        icon={<Lock size={iconSize} />}
        type="password"
        name="confirmPassword"
        value={confirmPassword}
        onChange={setConfirmPassword}
        placeholder="Confirm password"
        required
        autoComplete="new-password"
      />
      <AuthFieldHint>Minimum 6 characters. Use this password to sign in later.</AuthFieldHint>
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
          <p className="text-sm text-neutral-500">Create an account or sign in with your password</p>
        </div>

        <AuthSwitch
          isSignUp={mode === "register"}
          onModeChange={(signUp) => switchMode(signUp ? "register" : "signIn")}
          signInTitle="Welcome back"
          signUpTitle="Create your profile"
          signUpPanelHeading="New here?"
          signUpPanelText={`Join ${companyName} on AURA — register once and start your AI interview in seconds.`}
          signInPanelHeading="One of us?"
          signInPanelText="Welcome back! Sign in with your mobile or email and password."
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
