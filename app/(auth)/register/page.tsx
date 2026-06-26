"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, X, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    surname: "",
    otherNames: "",
    fileNo: "",
    email: "",
    phone: "",
    password: "",
    otp: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [isValidatingFileNo, setIsValidatingFileNo] = useState(false);
  const [fileNoValid, setFileNoValid] = useState<boolean | null>(null);
  const [fileNoValidationMsg, setFileNoValidationMsg] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);

  const validateFileNumber = async (fileNo: string) => {
    if (!fileNo) {
      setFileNoValid(null);
      setFileNoValidationMsg("");
      return;
    }

    setIsValidatingFileNo(true);
    try {
      const response = await fetch("/api/accounts/auth/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_number: fileNo }),
      });

      const payload = await response.json();

      if (response.ok) {
        setFileNoValid(true);
        setFileNoValidationMsg(
          `Found: ${payload.data.first_name} ${payload.data.last_name}`,
        );
      } else {
        setFileNoValid(false);
        setFileNoValidationMsg(payload?.message || "File number not found.");
      }
    } catch {
      setFileNoValid(false);
      setFileNoValidationMsg("Validation failed. Please try again.");
    } finally {
      setIsValidatingFileNo(false);
    }
  };

  const handleResendOtp = async () => {
    if (!formData.email) {
      setResendMessage("Email is required to resend OTP.");
      return;
    }

    setIsResendingOtp(true);
    setResendMessage("");

    try {
      const response = await fetch("/api/accounts/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      const payload = await response.json();

      if (response.ok) {
        setResendMessage("OTP resent successfully. Check your email.");
      } else {
        setResendMessage(
          payload?.message ||
            payload?.email?.[0] ||
            payload?.detail ||
            "Failed to resend OTP.",
        );
      }
    } catch {
      setResendMessage("Error resending OTP. Please try again.");
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (awaitingOtp) {
      if (!formData.email || !formData.otp) {
        setError("Please enter the OTP sent to your email.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/accounts/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: formData.email, otp: formData.otp }),
        });
        const payload = await response.json();

        if (!response.ok) {
          let errorMessage = "Registration failed.";

          if (payload?.message) {
            errorMessage = payload.message;
          } else if (payload?.email?.[0]) {
            errorMessage = payload.email[0];
          } else if (payload?.password?.[0]) {
            errorMessage = payload.password[0];
          } else if (payload?.file_number?.[0]) {
            errorMessage = payload.file_number[0];
          } else if (payload?.phone_number?.[0]) {
            errorMessage = payload.phone_number[0];
          }

          throw new Error(errorMessage);
        }

        setSuccess(true);
        const role = payload?.data?.user?.role;
        router.replace(
          role === "admin" || role === "superadmin"
            ? "/admin/dashboard"
            : "/staff/dashboard",
        );
      } catch (verificationError) {
        setError(
          verificationError instanceof Error
            ? verificationError.message
            : "Email verification failed.",
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (
      !formData.surname ||
      !formData.email ||
      !formData.password ||
      !formData.fileNo ||
      !formData.phone ||
      !profilePicture
    ) {
      setError("Please fill in all required fields.");
      setIsLoading(false);
      return;
    }

    if (fileNoValid !== true) {
      setError("Please enter a valid staff file number.");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters.");
      setIsLoading(false);
      return;
    }

    try {
      const registerPayload = new FormData();
      registerPayload.set("file_number", formData.fileNo);
      registerPayload.set("email", formData.email);
      registerPayload.set("password", formData.password);
      registerPayload.set("phone_number", formData.phone);
      registerPayload.set("profile_picture_url", profilePicture);

      const response = await fetch("/api/accounts/auth/register", {
        method: "POST",
        body: registerPayload,
      });
      const payload = await response.json();

      if (!response.ok) {
        let errorMessage = "Registration failed.";

        if (payload?.message) {
          errorMessage = payload.message;
        } else if (payload?.email?.[0]) {
          errorMessage = payload.email[0];
        } else if (payload?.password?.[0]) {
          errorMessage = payload.password[0];
        } else if (payload?.file_number?.[0]) {
          errorMessage = payload.file_number[0];
        } else if (payload?.phone_number?.[0]) {
          errorMessage = payload.phone_number[0];
        }

        throw new Error(errorMessage);
      }

      setSuccess(true);
      setAwaitingOtp(true);
    } catch (registerError) {
      setError(
        registerError instanceof Error
          ? registerError.message
          : "Registration failed.",
      );
    } finally {
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
          NYSC Staff <br /> E-Training Portal
        </h1>
        <p className="text-green-100 text-center text-lg max-w-md mt-2 font-medium">
          Create an account to access courses, complete assignments, and track
          your training progress.
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
            <button
              onClick={() => setError("")}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
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
            <p className="text-sm text-gray-700 font-medium flex-1">
              {awaitingOtp
                ? "Registration successful. Check your email for the OTP."
                : "Registration successful."}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleRegister} className="w-full max-w-sm space-y-4">
          {!awaitingOtp ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Surname
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABBA"
                    value={formData.surname}
                    onChange={(e) =>
                      setFormData({ ...formData, surname: e.target.value })
                    }
                    className="w-full border border-[#1a6b3c] rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Other Names
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sulaiman"
                    value={formData.otherNames}
                    onChange={(e) =>
                      setFormData({ ...formData, otherNames: e.target.value })
                    }
                    className="w-full border border-[#1a6b3c] rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File No
                </label>
                <input
                  type="text"
                  placeholder="e.g. NYSC/STF/123"
                  value={formData.fileNo}
                  onChange={(e) => {
                    setFormData({ ...formData, fileNo: e.target.value });
                    validateFileNumber(e.target.value);
                  }}
                  className="w-full border border-[#1a6b3c] rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                />
                {isValidatingFileNo && (
                  <p className="text-xs text-gray-500 mt-1">Validating...</p>
                )}
                {fileNoValid === true && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ {fileNoValidationMsg}
                  </p>
                )}
                {fileNoValid === false && (
                  <p className="text-xs text-red-600 mt-1">
                    ✗ {fileNoValidationMsg}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. name@nysc.com.ng"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full border border-[#1a6b3c] rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 08012345678"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full border border-[#1a6b3c] rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Picture <span className="text-red-600">*</span>
                </label>

                <input
                  required
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;

                    if (file && file.size > 5 * 1024 * 1024) {
                      setError("Profile picture must not exceed 5MB.");
                      event.target.value = "";
                      setProfilePicture(null);
                      return;
                    }

                    setError("");
                    setProfilePicture(file);
                  }}
                  className="w-full rounded-full border border-[#1a6b3c] px-4 py-2.5 text-sm"
                />

                <p className="mt-1 text-xs text-gray-500">
                  Required. JPG, PNG, or WebP. Maximum size: 5MB.
                </p>

                {profilePicture && (
                  <p className="mt-1 text-xs font-medium text-[#1a6b3c]">
                    Selected: {profilePicture.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full border border-[#1a6b3c] rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c] pr-12"
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#1a6b3c] transition"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={formData.otp}
                  onChange={(e) =>
                    setFormData({ ...formData, otp: e.target.value })
                  }
                  className="w-full border border-[#1a6b3c] rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                />
              </div>
              {resendMessage && (
                <p
                  className={`text-xs ${resendMessage.includes("successfully") ? "text-green-600" : "text-red-600"}`}
                >
                  {resendMessage}
                </p>
              )}
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isResendingOtp}
                className="w-full text-sm text-[#1a6b3c] font-medium py-2 rounded-full border border-[#1a6b3c] hover:bg-[#f0f7f3] transition disabled:opacity-60"
              >
                {isResendingOtp ? "Sending..." : "Resend OTP"}
              </button>
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center w-full bg-[#1a6b3c] hover:bg-[#145530] text-white font-semibold py-3 rounded-full transition disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {isLoading
              ? "Please wait..."
              : awaitingOtp
                ? "Verify Email"
                : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
