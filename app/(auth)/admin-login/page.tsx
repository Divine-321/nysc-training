"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, X } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
  setError("");
  setIsLoading(true);

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ login: email, password }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.message || "Login failed. Please try again.");
    }

    const authData = payload.data;

    if (authData.user.role !== "admin" && authData.user.role !== "superadmin") {
      throw new Error("You do not have admin access.");
    }

    router.replace("/admin/dashboard");
  } catch (loginError: unknown) {
    setError(
      loginError instanceof Error
        ? loginError.message
        : "Login failed. Please try again."
    );
    setIsLoading(false);
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
            NYSC Admin <br /> E-Training Portal
          </h1>
          <p className="text-green-100 text-center text-lg max-w-md mt-2 font-medium">
            Sign in as an administrator to manage courses, staff, cohorts, and assignments.
          </p>
        </div>

        {/* Right — Form */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12">
          <div className="flex bg-[#e8f5ee] rounded-full p-1 mb-6 w-72">
            <Link
              href="/login"
              className="flex-1 text-center text-[#1a6b3c] rounded-full py-2 text-sm font-semibold"
            >
              Staff Login
            </Link>

            <button className="flex-1 bg-[#1a6b3c] text-white rounded-full py-2 text-sm font-semibold">
              Admin Login
            </button>
          </div>

          <p className="text-gray-500 text-sm mb-6">
            Enter your login details to sign in
          </p>

          {/* Toast Notification */}
          {error && (
            <div className="fixed top-6 right-6 z-50 bg-white border-l-4 border-red-500 p-4 rounded-xl shadow-2xl flex items-center gap-3 w-80 transform transition-all duration-300">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertCircle className="text-red-500" size={18} />
              </div>
              <p className="text-sm text-gray-700 font-medium flex-1">{error}</p>
              <button onClick={() => setError("")} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={16} />
              </button>
            </div>
          )}

          <div className="w-full max-w-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Email
              </label>
              <input
                type="email"
                placeholder="admin@nysc.com.ng"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-[#1a6b3c] rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-[#1a6b3c] rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c] pr-12"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="flex items-center justify-center w-full bg-[#1a6b3c] hover:bg-[#145530] text-white font-semibold py-3 rounded-full transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? "Authenticating..." : "Login as Admin"}
            </button>

            <p className="text-center text-sm text-gray-500">
              Are you a staff member?{" "}
              <Link href="/login" className="text-[#1a6b3c] font-semibold">
                Go to staff login
              </Link>
            </p>
          </div>
        </div>
    </div>
  );
}