"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, Loader2, ShieldCheck, X } from "lucide-react";
import { ADMIN_MANUAL, STAFF_MANUAL } from "@/app/lib/manuals";
import ManualLinks from "@/app/components/ManualLinks";
import { getDeviceId } from "@/app/lib/device-id";

export default function AdminLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Set when the backend doesn't recognise this browser: an OTP has been
  // emailed and the password step is done, so the form swaps to the code entry.
  const [awaitingDeviceOtp, setAwaitingDeviceOtp] = useState(false);
  const [emailHint, setEmailHint] = useState("");
  const [otp, setOtp] = useState("");

  const canSubmit = email.trim() !== "" && password !== "" && !isLoading;

  const finishLogin = (payload: { data?: { user?: { role?: string } } }) => {
    const role = payload.data?.user?.role;

    if (role !== "admin" && role !== "superadmin") {
      throw new Error("You do not have admin access.");
    }

    router.replace("/admin/dashboard");
  };

  const handleVerifyDevice = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (otp.trim().length !== 6) {
      setError("Enter the 6-digit code sent to your email.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/verify-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          device_id: getDeviceId(),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.message || "Verification failed. Please try again.",
        );
      }

      finishLogin(payload);
    } catch (verifyError: unknown) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Verification failed. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your admin email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: email.trim(),
          password,
          role: "admin",
          device_id: getDeviceId(),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Login failed. Please try again.");
      }

      // Unrecognised device: no session yet, an OTP is on its way by email.
      if (payload.data?.requires_device_verification) {
        setEmailHint(payload.data.email_hint ?? "");
        setAwaitingDeviceOtp(true);
        setOtp("");
        setIsLoading(false);
        return;
      }

      finishLogin(payload);
    } catch (loginError: unknown) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Login failed. Please try again.",
      );
      setIsLoading(false);
    }
  };

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
          NYSC Admin <br /> E-Training Portal
        </h1>
        <p className="text-green-100 text-center text-lg max-w-md mt-2 font-medium">
          Sign in as an administrator to manage courses, staff, cohorts, and
          assignments.
        </p>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12">
        <div className="flex bg-nysc-green-light rounded-full p-1 mb-6 w-72">
          <Link
            href="/login"
            className="flex-1 text-center text-nysc-green rounded-full py-2 text-sm font-semibold"
          >
            Staff Login
          </Link>

          <button className="flex-1 bg-nysc-green text-white rounded-full py-2 text-sm font-semibold">
            Admin Login
          </button>
        </div>

        <p className="text-gray-500 text-sm mb-6">
          Enter your login details to sign in
        </p>

        {/* Toast Notification */}
        {error && (
          <div
            role="alert"
            className="fixed top-6 right-6 z-50 bg-white border-l-4 border-red-500 p-4 rounded-xl shadow-2xl flex items-center gap-3 w-80 transform transition-all duration-300"
          >
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertCircle className="text-red-500" size={18} />
            </div>
            <p className="text-sm text-gray-700 font-medium flex-1">{error}</p>
            <button
              onClick={() => setError("")}
              aria-label="Dismiss"
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {awaitingDeviceOtp ? (
          <form
            onSubmit={handleVerifyDevice}
            className="w-full max-w-sm space-y-4"
          >
            <div className="rounded-2xl border border-nysc-green/30 bg-green-50/60 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-nysc-green">
                <ShieldCheck size={16} />
                New device detected
              </p>
              <p className="mt-1 text-sm text-gray-600">
                We&apos;ve emailed a 6-digit code
                {emailHint ? ` to ${emailHint}` : ""}. Enter it below to finish
                signing in. You&apos;ll only need to do this once on this
                browser.
              </p>
            </div>

            <div>
              <label
                htmlFor="admin-device-otp"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Verification code
              </label>
              <input
                id="admin-device-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="w-full rounded-full border border-nysc-green px-4 py-3 text-center text-lg tracking-[0.4em] outline-none focus:ring-2 focus:ring-nysc-green"
              />
              <p className="mt-1 text-xs text-gray-500">
                The code expires in 10 minutes.
              </p>
            </div>

            <button
              type="submit"
              disabled={otp.length !== 6 || isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-nysc-green py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify device"
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setAwaitingDeviceOtp(false);
                setOtp("");
                setError("");
              }}
              className="w-full text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Back to sign in
            </button>
          </form>
        ) : (
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <div>
            <label
              htmlFor="admin-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Admin Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              placeholder="admin@nysc.com.ng"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-nysc-green rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-nysc-green"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="admin-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-nysc-green rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-nysc-green pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-nysc-green transition"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end text-sm">
            <Link
              href="/forgot-password"
              className="text-gray-500 hover:text-nysc-green"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center justify-center gap-2 w-full bg-nysc-green hover:bg-nysc-green-dark text-white font-semibold py-3 rounded-full transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {isLoading ? "Authenticating..." : "Login as Admin"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Are you a staff member?{" "}
            <Link href="/login" className="text-nysc-green font-semibold">
              Go to staff login
            </Link>
          </p>

          <ManualLinks
            manuals={[ADMIN_MANUAL, STAFF_MANUAL]}
            className="pt-2"
          />
        </form>
        )}
      </div>
    </div>
  );
}
