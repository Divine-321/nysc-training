"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { extractErrorMessage } from "@/app/lib/portal-api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSend = async () => {
    setError("");
    setSuccess("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/accounts/auth/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, "We could not find an account with that email."));
      }

      setSuccess("If an account exists for that email, instructions have been sent.");
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Something went wrong. Please try again.");
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
            Reset your password to regain access to your dashboard and training courses.
          </p>
        </div>

        {/* Right Form */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12">
          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Forgot Password</h2>
            <p className="text-sm text-gray-500 mb-6">
              Enter the email you used to create your account so we can send you
              instructions on how to reset your password.
            </p>

            <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                {success}
              </div>
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#1a6b3c] rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            />

            <button onClick={handleSend} disabled={isSubmitting} className="w-full bg-[#1a6b3c] hover:bg-[#145530] text-white font-semibold py-3 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed">
              {isSubmitting ? "Sending..." : "Send"}
            </button>

              <Link href="/login" className="block">
              <button className="w-full border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition">
                Back to Login
              </button>
            </Link>
          </div>
          </div>
        </div>
    </div>
  );
}