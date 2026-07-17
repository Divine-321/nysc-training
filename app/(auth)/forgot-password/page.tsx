"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { extractErrorMessage } from "@/app/lib/portal-api";
import ManualLinks from "@/app/components/ManualLinks";
import { STAFF_MANUAL } from "@/app/lib/manuals";

// Two-step reset flow backed by the real backend endpoints:
//   1. POST /api/accounts/auth/forgot-password/  { login } -> emails a 6-digit
//      OTP (valid 10 minutes; always returns 200 to prevent probing).
//   2. POST /api/accounts/auth/reset-password/   { email, otp, new_password,
//      confirm_password } -> password changes immediately.
type Step = "request" | "reset" | "done";

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestOtp = async () => {
    setError("");
    setNotice("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!isValidEmail(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/accounts/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: email.trim() }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(
            payload,
            "Could not send the reset code. Please try again.",
          ),
        );
      }

      setNotice(
        "If an account exists for that email, a 6-digit reset code has been sent. It is valid for 10 minutes.",
      );
      setStep("reset");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setError("");

    if (!otp.trim()) {
      setError("Please enter the 6-digit code from your email.");
      return;
    }

    if (!newPassword) {
      setError("Please choose a new password.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/accounts/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(
            payload,
            "Could not reset your password. Check the code and try again.",
          ),
        );
      }

      setNotice("");
      setStep("done");
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (step === "request") void handleRequestOtp();
    if (step === "reset") void handleResetPassword();
  };

  const inputClass =
    "w-full border border-nysc-green rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-nysc-green";

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left — Branding */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-nysc-green p-12 text-white">
        <Image
          src="/images/nysc-logo.png"
          alt="NYSC Logo"
          width={180}
          height={180}
          priority
          className="mb-8"
        />
        <h1 className="text-4xl md:text-5xl font-extrabold text-center tracking-tight leading-tight mb-4">
          NYSC Staff <br /> E-Training Portal
        </h1>
        <p className="text-green-100 text-center text-lg max-w-md mt-2 font-medium">
          Reset your password to regain access to your dashboard and training
          courses.
        </p>
      </div>

      {/* Right Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-sm">
          {/* Step indicator */}
          {step !== "done" && (
            <div className="mb-5 flex items-center gap-2">
              {(["request", "reset"] as const).map((name, index) => {
                const isActive = step === name;
                const isComplete = step === "reset" && name === "request";

                return (
                  <div key={name} className="flex flex-1 items-center gap-2">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                        isActive || isComplete
                          ? "bg-nysc-green text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {isComplete ? <CheckCircle2 size={13} /> : index + 1}
                    </span>
                    <span
                      className={`h-0.5 flex-1 rounded-full transition ${
                        isComplete ? "bg-nysc-green" : "bg-gray-100"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {step === "done" ? (
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-nysc-green">
              <MailCheck size={24} />
            </div>
          ) : null}

          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {step === "request" && "Forgot Password"}
            {step === "reset" && "Check your email"}
            {step === "done" && "Password Reset"}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {step === "request" &&
              "Enter the email you used to create your account and we will send you a 6-digit reset code."}
            {step === "reset" &&
              "Enter the 6-digit code we emailed you, then choose a new password."}
            {step === "done" &&
              "Your password has been changed. You can now log in with your new password."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {error}
              </div>
            )}
            {notice && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                {notice}
              </div>
            )}

            {step === "request" && (
              <>
                <input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 bg-nysc-green hover:bg-nysc-green-dark text-white font-semibold py-3 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {isSubmitting ? "Sending..." : "Send Reset Code"}
                </button>
              </>
            )}

            {step === "reset" && (
              <>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className={`${inputClass} tracking-[0.3em] text-center font-semibold`}
                />

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="New password (min. 8 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-nysc-green"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                  />
                  {confirmPassword !== "" && newPassword !== confirmPassword && (
                    <p className="mt-1 px-4 text-xs text-red-600">
                      The passwords do not match.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 bg-nysc-green hover:bg-nysc-green-dark text-white font-semibold py-3 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {isSubmitting ? "Resetting..." : "Reset Password"}
                </button>

                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={isSubmitting}
                  className="w-full text-sm font-medium text-nysc-green hover:underline disabled:opacity-60"
                >
                  Resend code
                </button>
              </>
            )}

            {step === "done" && (
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="w-full bg-nysc-green hover:bg-nysc-green-dark text-white font-semibold py-3 rounded-lg transition"
              >
                Go to Login
              </button>
            )}

            {step !== "done" && (
              <Link href="/login" className="block">
                <button
                  type="button"
                  className="w-full border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition"
                >
                  Back to Login
                </button>
              </Link>
            )}
          </form>

          <ManualLinks manuals={[STAFF_MANUAL]} className="pt-6" />
        </div>
      </div>
    </div>
  );
}
