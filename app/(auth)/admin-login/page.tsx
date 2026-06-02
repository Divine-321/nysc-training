"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-5xl flex items-center justify-between gap-12">
        <div className="hidden md:flex flex-1 items-center justify-center">
          <Image
            src="/images/register-illustration.png"
            alt="Admin Login Illustration"
            width={480}
            height={400}
            priority
          />
        </div>

        <div className="flex-1 flex flex-col items-center">
          <Image
            src="/images/nysc-logo.png"
            alt="NYSC Logo"
            width={80}
            height={80}
            className="mb-6"
          />

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

          <p className="text-gray-500 text-sm mb-6 text-center max-w-xs">
            Sign in as an administrator to manage courses, staff, cohorts, and assignments.
          </p>

          <div className="w-full max-w-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Email
              </label>
              <input
                type="email"
                placeholder="Enter admin email"
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

            <Link
              href="/admin/dashboard"
              className="flex items-center justify-center w-full bg-[#1a6b3c] hover:bg-[#145530] text-white font-semibold py-3 rounded-full transition"
            >
              Login as Admin
            </Link>

            <p className="text-center text-sm text-gray-500">
              Are you a staff member?{" "}
              <Link href="/login" className="text-[#1a6b3c] font-semibold">
                Go to staff login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}