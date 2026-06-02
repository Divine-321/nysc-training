"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

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
            Log in to access your dashboard, resume courses, and track your training progress.
          </p>
        </div>

        {/* Right — Form */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12">

          {/* Login / Register Toggle */}
          <div className="flex bg-[#e8f5ee] rounded-full p-1 mb-6 w-64">
            <button className="flex-1 bg-[#1a6b3c] text-white rounded-full py-2 text-sm font-semibold">
              Login
            </button>
            <Link
              href="/admin-login"
              className="flex-1 text-center text-[#1a6b3c] rounded-full py-2 text-sm font-semibold"
            >
              Admin Login
            </Link>
          </div>

          <p className="text-gray-500 text-sm mb-6">
            Enter your login details to sign in
          </p>

          {/* Form */}
          <div className="w-full max-w-sm space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User name
              </label>
              <input
                type="text"
                placeholder="Enter your User name"
                className="w-full border border-[#1a6b3c] rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your Password"
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

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-600">
                <input type="checkbox" className="accent-[#1a6b3c]" />
                Remember me
              </label>
              <Link
                href="/forgot-password"
                className="text-gray-500 hover:text-[#1a6b3c]"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Login Button */}
            <Link
              href="/staff/dashboard"
              className="flex items-center justify-center w-full bg-[#1a6b3c] hover:bg-[#145530] text-white font-semibold py-3 rounded-full transition"
            >
              Login
            </Link>

            <p className="text-center text-sm text-gray-500">
              Are you an admin?{" "}
              <Link href="/admin-login" className="text-[#1a6b3c] font-semibold">
                Login here
              </Link>
            </p>
          </div>
        </div>
    </div>
  );
}
