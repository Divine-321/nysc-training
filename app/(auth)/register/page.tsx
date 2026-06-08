"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, X, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    surname: "",
    otherNames: "",
    fileNo: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!formData.surname || !formData.email || !formData.password || !formData.fileNo) {
      setError("Please fill in all required fields.");
      setIsLoading(false);
      return;
    }

    // Simulate API call
    setTimeout(() => {
      setSuccess(true);
      setIsLoading(false);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    }, 1000);
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
          Create an account to access courses, complete assignments, and track your training progress.
        </p>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 overflow-y-auto">

        {/* Login / Register Toggle */}
        <div className="flex bg-[#e8f5ee] rounded-full p-1 mb-6 w-64 shrink-0 mt-8 md:mt-0">
          <Link
            href="/login"
            className="flex-1 text-center text-[#1a6b3c] rounded-full py-2 text-sm font-semibold"
          >
            Login
          </Link>
          <button className="flex-1 bg-[#1a6b3c] text-white rounded-full py-2 text-sm font-semibold">
            Register
          </button>
        </div>

        <p className="text-gray-500 text-sm mb-6">
          Enter your details to create an account
        </p>

        {/* Toast Notification - Error */}
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

        {/* Toast Notification - Success */}
        {success && (
          <div className="fixed top-6 right-6 z-50 bg-white border-l-4 border-green-500 p-4 rounded-xl shadow-2xl flex items-center gap-3 w-80 transform transition-all duration-300">
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
              <CheckCircle2 className="text-green-500" size={18} />
            </div>
            <p className="text-sm text-gray-700 font-medium flex-1">Registration successful! Redirecting...</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleRegister} className="w-full max-w-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Surname</label>
              <input
                type="text"
                placeholder="e.g. ABBA"
                value={formData.surname}
                onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                className="w-full border border-[#1a6b3c] rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]"
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Other Names</label>
              <input
                type="text"
                placeholder="e.g. Sulaiman"
                value={formData.otherNames}
                onChange={(e) => setFormData({ ...formData, otherNames: e.target.value })}
                className="w-full border border-[#1a6b3c] rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File No</label>
            <input type="text" placeholder="e.g. NYSC/STF/123" value={formData.fileNo} onChange={(e) => setFormData({ ...formData, fileNo: e.target.value })} className="w-full border border-[#1a6b3c] rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input type="email" placeholder="e.g. name@nysc.com.ng" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full border border-[#1a6b3c] rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} placeholder="Create a strong password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full border border-[#1a6b3c] rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c] pr-12" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? "🙈" : "👁️"}</button>
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="flex items-center justify-center w-full bg-[#1a6b3c] hover:bg-[#145530] text-white font-semibold py-3 rounded-full transition disabled:opacity-70 disabled:cursor-not-allowed mt-2">
            {isLoading ? "Creating account..." : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}