"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, Loader2, X } from "lucide-react";
import type { LoginManual } from "@/app/lib/login-manual";
import { ADMIN_MANUAL, STAFF_MANUAL, type Manual } from "@/app/lib/manuals";
import ManualLinks from "@/app/components/ManualLinks";

const REMEMBERED_LOGIN_KEY = "nysc-remembered-login";

// The remembered login is read once per visit and never changes underneath us,
// so there is nothing to subscribe to. Going through useSyncExternalStore lets
// the server render an empty field and the client fill it in on hydration,
// without a mismatch.
const subscribeToNothing = () => () => {};
const readRememberedLogin = () =>
  window.localStorage.getItem(REMEMBERED_LOGIN_KEY) ?? "";
const noRememberedLogin = () => "";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedManual, setUploadedManual] = useState<Manual | null>(null);

  // Restore the remembered file number / email (never the password). Both
  // fields fall back to the stored value until the user types over it.
  const rememberedLogin = useSyncExternalStore(
    subscribeToNothing,
    readRememberedLogin,
    noRememberedLogin,
  );
  const [usernameInput, setUsernameInput] = useState<string | null>(null);
  const [rememberMeInput, setRememberMeInput] = useState<boolean | null>(null);

  const username = usernameInput ?? rememberedLogin;
  const rememberMe = rememberMeInput ?? rememberedLogin !== "";

  // Optional extra manual attached by an admin from Admin Settings. The two
  // built-in guides work with or without it, so any failure here is silent.
  useEffect(() => {
    const loadManual = async () => {
      try {
        const response = await fetch("/api/public/login-manual", {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        const data = payload?.data as LoginManual | null;

        if (!data?.file_url) return;

        setUploadedManual({
          id: `uploaded-${data.id}`,
          title: data.title || "Portal User Manual",
          description: data.description || "Manual attached by your administrator.",
          href: data.file_url,
        });
      } catch {
        // No manual attached — the built-in guides still show.
      }
    };

    void loadManual();
  }, []);

  const canSubmit = username.trim() !== "" && password !== "" && !isLoading;

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter your file number or email.");
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
          login: username.trim(),
          password,
          role: "staff",
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Login failed. Please try again.");
      }

      if (rememberMe) {
        window.localStorage.setItem(REMEMBERED_LOGIN_KEY, username.trim());
      } else {
        window.localStorage.removeItem(REMEMBERED_LOGIN_KEY);
      }

      const role = payload.data.user.role;

      router.replace(
        role === "admin" || role === "superadmin"
          ? "/admin/dashboard"
          : "/staff/dashboard",
      );
    } catch (loginError: unknown) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Login failed. Please try again.",
      );
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const check = async () => {
      const response = await fetch("/api/accounts/me", { cache: "no-store" });

      if (response.ok) {
        const payload = await response.json().catch(() => null);
        const role = payload?.data?.role;

        router.replace(
          role === "admin" || role === "superadmin"
            ? "/admin/dashboard"
            : "/staff/dashboard",
        );
      }
    };

    void check();
  }, [router]);

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
          Log in to access your dashboard, resume courses, and track your
          training progress.
        </p>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12">
        {/* Login / Register Toggle */}
        <div className="flex bg-nysc-green-light rounded-full p-1 mb-6 w-64">
          <button className="flex-1 bg-nysc-green text-white rounded-full py-2 text-sm font-semibold">
            Staff Login
          </button>
          <Link
            href="/admin-login"
            className="flex-1 text-center text-nysc-green rounded-full py-2 text-sm font-semibold"
          >
            Admin Login
          </Link>
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

        {/* Form */}
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          {/* Username */}
          <div>
            <label
              htmlFor="login-username"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              File number or email
            </label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              placeholder="NYSC/2024/001 or john.doe@example.com"
              value={username}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="w-full border border-nysc-green rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-nysc-green"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
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

          {/* Remember me + Forgot */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMeInput(e.target.checked)}
                className="accent-nysc-green"
              />
              Remember me
            </label>
            <Link
              href="/forgot-password"
              className="text-gray-500 hover:text-nysc-green"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center justify-center gap-2 w-full bg-nysc-green hover:bg-nysc-green-dark text-white font-semibold py-3 rounded-full transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {isLoading ? "Authenticating..." : "Login"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Are you an admin?{" "}
            <Link href="/admin-login" className="text-nysc-green font-semibold">
              Login here
            </Link>
          </p>
          <p className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-nysc-green font-semibold">
              Register here
            </Link>
          </p>

          <ManualLinks
            manuals={
              uploadedManual
                ? [STAFF_MANUAL, ADMIN_MANUAL, uploadedManual]
                : [STAFF_MANUAL, ADMIN_MANUAL]
            }
            className="pt-2"
          />
        </form>
      </div>
    </div>
  );
}
