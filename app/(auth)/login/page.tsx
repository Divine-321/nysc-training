"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, X } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setError("");
    setIsLoading(true);

    setTimeout(() => {
      if (username === "favour@nysc.com.ng" && password === "favour123") {
        router.push("/staff/dashboard");
      } else {
        setError("Invalid user name or password. Please try again.");
        setIsLoading(false);
      }
    }, 600);
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

          {/* Form */}
          <div className="w-full max-w-sm space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User name
              </label>
              <input
                type="text"
                placeholder="favour@nysc.com.ng"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="flex items-center justify-center w-full bg-[#1a6b3c] hover:bg-[#145530] text-white font-semibold py-3 rounded-full transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? "Authenticating..." : "Login"}
            </button>

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
