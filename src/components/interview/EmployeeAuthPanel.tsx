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

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
  }

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

  const iconSize = 18;

  const signInForm = (
    <form onSubmit={handleLogin} className="w-full flex flex-col items-center">
      <p className="auth-subtitle">Enter your mobile number to continue where you left off.</p>
      <AuthInputField
        icon={<Phone size={iconSize} />}
        type="tel"
        name="loginMobile"
        value={loginMobile}
        onChange={setLoginMobile}
        placeholder="Mobile number"
        required
        autoComplete="tel"
      />
      {error && mode === "login" && <AuthError message={error} />}
      <button type="submit" disabled={loading} className="auth-btn">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Continue interview
      </button>
    </form>
  );

  const signUpForm = (
    <form onSubmit={handleRegister} className="w-full flex flex-col items-center">
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
        icon={<Phone size={iconSize} />}
        type="tel"
        name="mobile"
        value={mobile}
        onChange={setMobile}
        placeholder="Mobile number"
        required
        autoComplete="tel"
      />
      <AuthFieldHint>Use this same number to sign in later.</AuthFieldHint>
      <AuthInputField
        icon={<Mail size={iconSize} />}
        type="email"
        name="email"
        value={email}
        onChange={setEmail}
        placeholder="Email (optional)"
        autoComplete="email"
      />
      {error && mode === "register" && <AuthError message={error} />}
      <button type="submit" disabled={loading} className="auth-btn">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ArrowRight className="w-4 h-4" />
        )}
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
          <p className="text-sm text-neutral-500 hidden sm:block">
            AURA-METNMAT secure employee access
          </p>
        </div>

        <AuthSwitch
          isSignUp={mode === "register"}
          onModeChange={(signUp) => switchMode(signUp ? "register" : "login")}
          signInTitle="Welcome back"
          signUpTitle="Create your profile"
          signUpPanelHeading="New here?"
          signUpPanelText={`Join ${companyName} on AURA — register once and start your AI interview in seconds.`}
          signInPanelHeading="One of us?"
          signInPanelText="Welcome back! Sign in with your mobile number to resume your interview."
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
