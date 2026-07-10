"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { extractErrorMessage } from "@/app/lib/portal-api";

// Two-step reset flow backed by the real backend endpoints:
//   1. POST /api/accounts/auth/forgot-password/  { login } -> emails a 6-digit
//      OTP (valid 10 minutes; always returns 200 to prevent probing).
//   2. POST /api/accounts/auth/reset-password/   { email, otp, new_password,
//      confirm_password } -> password changes immediately.
type Step = "request" | "reset" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left — Branding */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#1a6b3c] p-12 text-white">
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
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {step === "done" ? "Password Reset" : "Forgot Password"}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {step === "request" &&
              "Enter the email you used to create your account and we will send you a 6-digit reset code."}
            {step === "reset" &&
              "Enter the 6-digit code we emailed you, then choose a new password."}
            {step === "done" &&
              "Your password has been changed. You can now log in with your new password."}
          </p>

          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
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
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-[#1a6b3c] rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                />

                <button
                  onClick={handleRequestOtp}
                  disabled={isSubmitting}
                  className="w-full bg-[#1a6b3c] hover:bg-[#145530] text-white font-semibold py-3 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
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
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full border border-[#1a6b3c] rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c] tracking-[0.3em] text-center font-semibold"
                />
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-[#1a6b3c] rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-[#1a6b3c] rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                />

                <button
                  onClick={handleResetPassword}
                  disabled={isSubmitting}
                  className="w-full bg-[#1a6b3c] hover:bg-[#145530] text-white font-semibold py-3 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Resetting..." : "Reset Password"}
                </button>

                <button
                  onClick={handleRequestOtp}
                  disabled={isSubmitting}
                  className="w-full text-sm font-medium text-[#1a6b3c] hover:underline disabled:opacity-60"
                >
                  Resend code
                </button>
              </>
            )}

            {step === "done" && (
              <button
                onClick={() => router.push("/login")}
                className="w-full bg-[#1a6b3c] hover:bg-[#145530] text-white font-semibold py-3 rounded-lg transition"
              >
                Go to Login
              </button>
            )}

            {step !== "done" && (
              <Link href="/login" className="block">
                <button className="w-full border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition">
                  Back to Login
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
