"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface AuthSwitchProps {
  isSignUp: boolean;
  onModeChange: (signUp: boolean) => void;
  signInForm: ReactNode;
  signUpForm: ReactNode;
  signInTitle?: string;
  signUpTitle?: string;
  signInPanelHeading?: string;
  signInPanelText?: string;
  signUpPanelHeading?: string;
  signUpPanelText?: string;
  className?: string;
}

export function AuthSwitch({
  isSignUp,
  onModeChange,
  signInForm,
  signUpForm,
  signInTitle = "Sign in",
  signUpTitle = "Create profile",
  signInPanelHeading = "One of us?",
  signInPanelText = "Welcome back! Sign in with your email to continue your interview.",
  signUpPanelHeading = "New here?",
  signUpPanelText = "Register once with your work details — then talk with AURA anytime.",
  className,
}: AuthSwitchProps) {
  return (
    <>
      <style>{`
        .aura-auth-switch {
          position: relative;
          width: 100%;
          max-width: 920px;
          min-height: 560px;
          background: #111111;
          border-radius: 16px;
          box-shadow:
            0 32px 64px rgba(0, 0, 0, 0.55),
            0 0 0 1px rgba(255, 255, 255, 0.06),
            0 0 80px rgba(127, 29, 29, 0.12);
          overflow: hidden;
        }

        .aura-auth-switch .forms-container {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        }

        .aura-auth-switch .signin-signup {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          left: 75%;
          width: 50%;
          transition: 1s 0.7s ease-in-out;
          display: grid;
          grid-template-columns: 1fr;
          z-index: 5;
        }

        .aura-auth-switch .auth-form {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 0 3rem;
          transition: all 0.2s 0.7s;
          overflow: hidden;
          grid-column: 1 / 2;
          grid-row: 1 / 2;
          width: 100%;
        }

        .aura-auth-switch .auth-form.sign-up-form {
          opacity: 0;
          z-index: 1;
          pointer-events: none;
        }

        .aura-auth-switch .auth-form.sign-in-form {
          z-index: 2;
        }

        .aura-auth-switch.sign-up-mode .auth-form.sign-up-form {
          opacity: 1;
          z-index: 2;
          pointer-events: auto;
        }

        .aura-auth-switch.sign-up-mode .auth-form.sign-in-form {
          opacity: 0;
          z-index: 1;
          pointer-events: none;
        }

        .aura-auth-switch .auth-title {
          font-size: 1.65rem;
          color: #f5f5f5;
          margin-bottom: 0.35rem;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .aura-auth-switch .auth-subtitle {
          font-size: 0.84rem;
          color: #a3a3a3;
          margin-bottom: 1.1rem;
          text-align: center;
          max-width: 340px;
          line-height: 1.55;
        }

        .aura-auth-switch .input-field {
          max-width: 380px;
          width: 100%;
          background-color: #1c1c1c;
          margin: 7px 0;
          min-height: 50px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          padding: 0 1rem 0 0.85rem;
          gap: 0.65rem;
          transition: 0.2s;
          border: 1px solid #333333;
        }

        .aura-auth-switch .input-field:focus-within {
          background-color: #242424;
          border-color: #b91c1c;
          box-shadow: 0 0 0 3px rgba(185, 28, 28, 0.18);
        }

        .aura-auth-switch .input-field:focus-within svg {
          color: #f87171;
        }

        .aura-auth-switch .input-field svg {
          color: #737373;
          flex-shrink: 0;
        }

        .aura-auth-switch .input-field input {
          background: none;
          outline: none;
          border: none;
          font-weight: 500;
          font-size: 0.95rem;
          color: #f5f5f5;
          width: 100%;
          line-height: 1.4;
          padding: 0.65rem 0;
        }

        .aura-auth-switch .input-field input::placeholder {
          color: #737373;
          font-weight: 400;
        }

        .aura-auth-switch .auth-btn {
          width: 100%;
          max-width: 380px;
          background: linear-gradient(135deg, #262626 0%, #171717 55%, #450a0a 100%);
          border: 1px solid rgba(185, 28, 28, 0.45);
          outline: none;
          min-height: 48px;
          border-radius: 10px;
          color: #fafafa;
          font-weight: 600;
          margin: 14px 0 4px;
          cursor: pointer;
          transition: 0.25s;
          font-size: 0.875rem;
          letter-spacing: 0.01em;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .aura-auth-switch .auth-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          background: linear-gradient(135deg, #404040 0%, #262626 45%, #991b1b 100%);
          border-color: rgba(248, 113, 113, 0.55);
          box-shadow: 0 10px 28px rgba(127, 29, 29, 0.35);
        }

        .aura-auth-switch .auth-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .aura-auth-switch .auth-otp-wrap {
          width: 100%;
          max-width: 380px;
          margin: 6px 0;
        }

        .aura-auth-switch .auth-otp-verified {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-radius: 10px;
          border: 1px solid rgba(34, 197, 94, 0.35);
          background: rgba(22, 101, 52, 0.2);
          padding: 0.65rem 0.85rem;
          font-size: 0.75rem;
          color: #86efac;
        }

        .aura-auth-switch .auth-otp-panel {
          border-radius: 10px;
          border: 1px solid #333333;
          background: #141414;
          padding: 0.75rem;
          width: 100%;
        }

        .aura-auth-switch .auth-otp-send {
          width: 100%;
          min-height: 44px;
          border-radius: 10px;
          border: 1px solid #404040;
          background: #1c1c1c;
          color: #e5e5e5;
          font-size: 0.8rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          cursor: pointer;
          transition: 0.2s;
        }

        .aura-auth-switch .auth-otp-send:hover:not(:disabled) {
          border-color: #b91c1c;
          background: #242424;
        }

        .aura-auth-switch .auth-otp-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .aura-auth-switch .auth-otp-input {
          flex: 1;
          background: #1c1c1c;
          border: 1px solid #333333;
          border-radius: 10px;
          padding: 0.6rem 0.75rem;
          text-align: center;
          font-size: 1rem;
          letter-spacing: 0.35em;
          font-family: ui-monospace, monospace;
          color: #f5f5f5;
          outline: none;
        }

        .aura-auth-switch .auth-otp-input:focus {
          border-color: #b91c1c;
          box-shadow: 0 0 0 3px rgba(185, 28, 28, 0.18);
        }

        .aura-auth-switch .auth-otp-verify {
          min-height: 44px;
          padding: 0 1rem;
          border-radius: 10px;
          border: 1px solid rgba(185, 28, 28, 0.55);
          background: linear-gradient(135deg, #450a0a, #991b1b);
          color: #fafafa;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }

        .aura-auth-switch .auth-otp-verify:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .aura-auth-switch .auth-otp-hint {
          font-size: 0.7rem;
          color: #737373;
          text-align: center;
          margin-bottom: 0.35rem;
        }

        .aura-auth-switch .auth-otp-resend {
          font-size: 0.68rem;
          color: #737373;
          margin: 0.5rem auto 0;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: none;
          border: none;
          cursor: pointer;
        }

        .aura-auth-switch .auth-otp-resend:hover:not(:disabled) {
          color: #fca5a5;
        }

        .aura-auth-switch .auth-otp-resend:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .aura-auth-switch .panels-container {
          position: absolute;
          height: 100%;
          width: 100%;
          top: 0;
          left: 0;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
        }

        .aura-auth-switch .panel {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: space-around;
          text-align: center;
          z-index: 6;
        }

        .aura-auth-switch .left-panel {
          pointer-events: all;
          padding: 3rem 17% 2rem 12%;
        }

        .aura-auth-switch .right-panel {
          pointer-events: none;
          padding: 3rem 12% 2rem 17%;
        }

        .aura-auth-switch .panel .content {
          color: #fff;
          transition: transform 0.9s ease-in-out;
          transition-delay: 0.6s;
        }

        .aura-auth-switch .panel h3 {
          font-weight: 600;
          line-height: 1.2;
          font-size: 1.4rem;
          margin-bottom: 10px;
          letter-spacing: -0.01em;
        }

        .aura-auth-switch .panel p {
          font-size: 0.9rem;
          padding: 0.65rem 0;
          line-height: 1.55;
          opacity: 0.92;
          color: rgba(255, 255, 255, 0.92);
        }

        .aura-auth-switch .btn-transparent {
          margin: 0 auto;
          background: transparent;
          border: 1.5px solid rgba(255, 255, 255, 0.85);
          width: 140px;
          min-height: 42px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.78rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #fff;
          cursor: pointer;
          transition: 0.25s;
        }

        .aura-auth-switch .btn-transparent:hover {
          background: rgba(185, 28, 28, 0.15);
          border-color: #fca5a5;
          transform: translateY(-1px);
        }

        .aura-auth-switch .right-panel .content {
          transform: translateX(800px);
        }

        .aura-auth-switch:before {
          content: "";
          position: absolute;
          height: 2000px;
          width: 2000px;
          top: -10%;
          right: 48%;
          transform: translateY(-50%);
          background: linear-gradient(145deg, #0a0a0a 0%, #262626 38%, #7f1d1d 100%);
          transition: 1.8s ease-in-out;
          border-radius: 50%;
          z-index: 6;
        }

        .aura-auth-switch.sign-up-mode:before {
          transform: translate(100%, -50%);
          right: 52%;
        }

        .aura-auth-switch.sign-up-mode .left-panel .content {
          transform: translateX(-800px);
        }

        .aura-auth-switch.sign-up-mode .signin-signup {
          left: 25%;
        }

        .aura-auth-switch.sign-up-mode .right-panel .content {
          transform: translateX(0%);
        }

        .aura-auth-switch.sign-up-mode .left-panel {
          pointer-events: none;
        }

        .aura-auth-switch.sign-up-mode .right-panel {
          pointer-events: all;
        }

        @media (max-width: 870px) {
          .aura-auth-switch {
            min-height: 720px;
          }
          .aura-auth-switch .signin-signup {
            width: 100%;
            top: 95%;
            transform: translate(-50%, -100%);
            transition: 1s 0.8s ease-in-out;
          }
          .aura-auth-switch .signin-signup,
          .aura-auth-switch.sign-up-mode .signin-signup {
            left: 50%;
          }
          .aura-auth-switch .panels-container {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr 2fr 1fr;
          }
          .aura-auth-switch .panel {
            flex-direction: row;
            justify-content: space-around;
            align-items: center;
            padding: 2rem 8%;
            grid-column: 1 / 2;
          }
          .aura-auth-switch .right-panel {
            grid-row: 3 / 4;
          }
          .aura-auth-switch .left-panel {
            grid-row: 1 / 2;
          }
          .aura-auth-switch .panel .content {
            padding-right: 10%;
            transition: transform 0.9s ease-in-out;
            transition-delay: 0.8s;
          }
          .aura-auth-switch .panel h3 {
            font-size: 1.15rem;
          }
          .aura-auth-switch .panel p {
            font-size: 0.75rem;
            padding: 0.4rem 0;
          }
          .aura-auth-switch:before {
            width: 1500px;
            height: 1500px;
            transform: translateX(-50%);
            left: 30%;
            bottom: 68%;
            right: initial;
            top: initial;
            transition: 2s ease-in-out;
          }
          .aura-auth-switch.sign-up-mode:before {
            transform: translate(-50%, 100%);
            bottom: 32%;
            right: initial;
          }
          .aura-auth-switch.sign-up-mode .left-panel .content {
            transform: translateY(-300px);
          }
          .aura-auth-switch.sign-up-mode .right-panel .content {
            transform: translateY(0px);
          }
          .aura-auth-switch .right-panel .content {
            transform: translateY(300px);
          }
          .aura-auth-switch.sign-up-mode .signin-signup {
            top: 5%;
            transform: translate(-50%, 0);
          }
        }

        @media (max-width: 570px) {
          .aura-auth-switch .auth-form {
            padding: 0 1.25rem;
          }
          .aura-auth-switch .panel .content {
            padding: 0.5rem 0.75rem;
          }
        }
      `}</style>

      <div className={cn("aura-auth-switch", isSignUp && "sign-up-mode", className)}>
        <div className="forms-container">
          <div className="signin-signup">
            <div className="auth-form sign-in-form" aria-hidden={isSignUp}>
              <h2 className="auth-title">{signInTitle}</h2>
              {signInForm}
            </div>
            <div className="auth-form sign-up-form" aria-hidden={!isSignUp}>
              <h2 className="auth-title">{signUpTitle}</h2>
              {signUpForm}
            </div>
          </div>
        </div>

        <div className="panels-container">
          <div className="panel left-panel">
            <div className="content">
              <h3>{signUpPanelHeading}</h3>
              <p>{signUpPanelText}</p>
              <button
                type="button"
                className="btn-transparent"
                onClick={() => onModeChange(true)}
              >
                Register
              </button>
            </div>
          </div>

          <div className="panel right-panel">
            <div className="content">
              <h3>{signInPanelHeading}</h3>
              <p>{signInPanelText}</p>
              <button
                type="button"
                className="btn-transparent"
                onClick={() => onModeChange(false)}
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

interface AuthInputFieldProps {
  icon: ReactNode;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  name?: string;
  autoComplete?: string;
}

export function AuthInputField({
  icon,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  name,
  autoComplete,
}: AuthInputFieldProps) {
  return (
    <div className="input-field">
      {icon}
      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
      />
    </div>
  );
}

export function AuthFieldHint({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] text-neutral-500 -mt-1 mb-1 w-full max-w-[380px] text-center">
      {children}
    </p>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <p className="mt-3 w-full max-w-[380px] text-sm text-red-300 bg-red-950/50 border border-red-900/60 rounded-xl px-4 py-2.5 text-center">
      {message}
    </p>
  );
}
