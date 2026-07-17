"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import CameraCaptureModal, {
  dataUrlToFile,
} from "@/app/components/CameraCaptureModal";
import ManualLinks from "@/app/components/ManualLinks";
import { STAFF_MANUAL } from "@/app/lib/manuals";

const LOOKUP_DEBOUNCE_MS = 500;

type FieldErrors = Partial<
  Record<"fileNo" | "email" | "phone" | "password" | "photo" | "otp", string>
>;

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// Accepts 08012345678, +2348012345678 and 2348012345678.
const isValidPhone = (value: string) => {
  const digits = value.replace(/[\s-]/g, "");
  return /^(0\d{10}|\+?234\d{10})$/.test(digits);
};

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [isValidatingFileNo, setIsValidatingFileNo] = useState(false);
  const [fileNoValid, setFileNoValid] = useState<boolean | null>(null);
  const [fileNoValidationMsg, setFileNoValidationMsg] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Guards against a slow earlier lookup overwriting a newer one's result.
  const lookupIdRef = useRef(0);

  const clearFieldError = (field: keyof FieldErrors) =>
    setFieldErrors((current) => ({ ...current, [field]: undefined }));

  // Editing the file number invalidates whatever the last lookup resolved to,
  // so the matched name never lingers next to a different number.
  const handleFileNoChange = (value: string) => {
    setFormData((current) => ({
      ...current,
      fileNo: value,
      surname: "",
      otherNames: "",
    }));
    setFileNoValid(null);
    setFileNoValidationMsg("");
    // Abandon any in-flight lookup's result.
    lookupIdRef.current += 1;
    setIsValidatingFileNo(false);
    clearFieldError("fileNo");
  };

  // The staff record is the source of truth for the name, so the lookup fills
  // it in and the fields stay read-only. Debounced so typing a file number
  // doesn't fire a request per keystroke.
  useEffect(() => {
    const fileNo = formData.fileNo.trim();

    if (!fileNo) return;

    const timer = window.setTimeout(async () => {
      const lookupId = lookupIdRef.current + 1;
      lookupIdRef.current = lookupId;

      setIsValidatingFileNo(true);

      try {
        const response = await fetch("/api/accounts/auth/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_number: fileNo }),
        });
        const payload = await response.json();

        if (lookupId !== lookupIdRef.current) return;

        if (response.ok) {
          const firstName = payload?.data?.first_name ?? "";
          const lastName = payload?.data?.last_name ?? "";

          setFileNoValid(true);
          setFileNoValidationMsg(`Found: ${firstName} ${lastName}`.trim());
          setFormData((current) => ({
            ...current,
            surname: lastName,
            otherNames: firstName,
          }));
          clearFieldError("fileNo");
        } else {
          setFileNoValid(false);
          setFileNoValidationMsg(payload?.message || "File number not found.");
          setFormData((current) => ({
            ...current,
            surname: "",
            otherNames: "",
          }));
        }
      } catch {
        if (lookupId !== lookupIdRef.current) return;

        setFileNoValid(false);
        setFileNoValidationMsg("Validation failed. Please try again.");
      } finally {
        if (lookupId === lookupIdRef.current) setIsValidatingFileNo(false);
      }
    }, LOOKUP_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [formData.fileNo]);

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

  // Every field is required: the backend derives the name from the file number,
  // but email, phone, password and a live photo all have to come from the user.
  const validateForm = (): FieldErrors => {
    const errors: FieldErrors = {};

    if (!formData.fileNo.trim()) {
      errors.fileNo = "Your file number is required.";
    } else if (fileNoValid !== true) {
      errors.fileNo = "Enter a valid staff file number.";
    }

    if (!formData.email.trim()) {
      errors.email = "Your email address is required.";
    } else if (!isValidEmail(formData.email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Your phone number is required.";
    } else if (!isValidPhone(formData.phone.trim())) {
      errors.phone = "Enter a valid Nigerian phone number.";
    }

    if (!profilePicture) {
      errors.photo = "A live profile photo is required.";
    }

    if (!formData.password) {
      errors.password = "A password is required.";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }

    return errors;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    if (awaitingOtp) {
      if (!formData.otp.trim()) {
        setFieldErrors({ otp: "Enter the OTP sent to your email." });
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch("/api/accounts/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email.trim(),
            otp: formData.otp.trim(),
          }),
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(readRegisterError(payload));
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
        setIsLoading(false);
      }
      return;
    }

    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Please correct the highlighted fields.");
      return;
    }

    setIsLoading(true);

    try {
      const registerPayload = new FormData();
      registerPayload.set("file_number", formData.fileNo.trim());
      registerPayload.set("email", formData.email.trim());
      registerPayload.set("password", formData.password);
      registerPayload.set("phone_number", formData.phone.trim());
      registerPayload.set("profile_picture_url", profilePicture!);

      const response = await fetch("/api/accounts/auth/register", {
        method: "POST",
        body: registerPayload,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(readRegisterError(payload));
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

  const inputClass = (field: keyof FieldErrors) =>
    `w-full border rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-nysc-green ${
      fieldErrors[field] ? "border-red-500" : "border-nysc-green"
    }`;

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
          Create an account to access courses, complete assignments, and track
          your training progress.
        </p>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 overflow-y-auto">
        {/* Login / Register Toggle */}
        <div className="flex bg-nysc-green-light rounded-full p-1 mb-6 w-64 shrink-0 mt-8 md:mt-0">
          <Link
            href="/login"
            className="flex-1 text-center text-nysc-green rounded-full py-2 text-sm font-semibold"
          >
            Login
          </Link>
          <button className="flex-1 bg-nysc-green text-white rounded-full py-2 text-sm font-semibold">
            Register
          </button>
        </div>

        <p className="text-gray-500 text-sm mb-6">
          {awaitingOtp
            ? "Verify your email to finish creating your account"
            : "Start with your file number — we'll find your staff record"}
        </p>

        {/* Toast Notification - Error */}
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
              {/* File number comes first — it identifies the staff record. */}
              <div>
                <label
                  htmlFor="register-fileno"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  File No <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id="register-fileno"
                    type="text"
                    placeholder="e.g. NYSC/STF/123"
                    value={formData.fileNo}
                    onChange={(e) => handleFileNoChange(e.target.value)}
                    className={`${inputClass("fileNo")} pr-10`}
                  />
                  {isValidatingFileNo && (
                    <Loader2
                      size={16}
                      className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-gray-400"
                    />
                  )}
                </div>
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
                {fieldErrors.fileNo && fileNoValid === null && (
                  <p className="text-xs text-red-600 mt-1">
                    {fieldErrors.fileNo}
                  </p>
                )}
              </div>

              {/* Names come from the staff record, so they are read-only. */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Surname
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      placeholder="From your record"
                      value={formData.surname}
                      className="w-full border border-gray-200 bg-gray-50 rounded-full px-4 py-2.5 pr-9 text-sm text-gray-600 outline-none cursor-not-allowed"
                    />
                    <Lock
                      size={13}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300"
                    />
                  </div>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Other Names
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      placeholder="From your record"
                      value={formData.otherNames}
                      className="w-full border border-gray-200 bg-gray-50 rounded-full px-4 py-2.5 pr-9 text-sm text-gray-600 outline-none cursor-not-allowed"
                    />
                    <Lock
                      size={13}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300"
                    />
                  </div>
                </div>
                <p className="col-span-2 -mt-1 text-xs text-gray-400">
                  Your name is taken from your staff record. Contact your
                  administrator if it is wrong.
                </p>
              </div>

              <div>
                <label
                  htmlFor="register-email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address <span className="text-red-600">*</span>
                </label>
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  placeholder="e.g. name@nysc.com.ng"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    clearFieldError("email");
                  }}
                  className={inputClass("email")}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-red-600 mt-1">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="register-phone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Phone Number <span className="text-red-600">*</span>
                </label>
                <input
                  id="register-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="e.g. 08012345678"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    clearFieldError("phone");
                  }}
                  className={inputClass("phone")}
                />
                {fieldErrors.phone && (
                  <p className="text-xs text-red-600 mt-1">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Picture <span className="text-red-600">*</span>
                </label>

                {profilePreview ? (
                  <div
                    className={`flex items-center gap-4 rounded-2xl border p-3 ${
                      fieldErrors.photo
                        ? "border-red-500"
                        : "border-nysc-green bg-green-50/40"
                    }`}
                  >
                    {/* Mirrored to match the camera preview the user approved;
                        the uploaded file itself is not flipped. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={profilePreview}
                      alt="Your captured profile photo"
                      className="h-20 w-20 shrink-0 -scale-x-100 rounded-full border-2 border-white object-cover shadow-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 text-sm font-semibold text-nysc-green">
                        <CheckCircle2 size={14} /> Photo captured
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        Make sure your face is clear and well lit.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowPhotoModal(true)}
                        className="mt-1.5 text-xs font-semibold text-nysc-green hover:underline"
                      >
                        Retake photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPhotoModal(true)}
                    className={`flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold text-nysc-green transition hover:bg-green-50 ${
                      fieldErrors.photo ? "border-red-500" : "border-nysc-green"
                    }`}
                  >
                    <Camera size={16} /> Take photo with camera
                  </button>
                )}

                {fieldErrors.photo ? (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.photo}
                  </p>
                ) : (
                  !profilePreview && (
                    <p className="mt-1 text-xs text-gray-500">
                      Required. Your photo must be taken live with your camera —
                      it is used to verify your identity during assessments.
                    </p>
                  )
                )}
              </div>

              <div>
                <label
                  htmlFor="register-password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Password <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      clearFieldError("password");
                    }}
                    className={`${inputClass("password")} pr-12`}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-nysc-green transition"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-red-600 mt-1">
                    {fieldErrors.password}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="register-otp"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email OTP
                </label>
                <input
                  id="register-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="Enter 6-digit OTP"
                  value={formData.otp}
                  onChange={(e) => {
                    setFormData({ ...formData, otp: e.target.value });
                    clearFieldError("otp");
                  }}
                  className={`${inputClass("otp")} tracking-[0.3em] text-center font-semibold`}
                />
                {fieldErrors.otp && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.otp}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Sent to {formData.email}
                </p>
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
                className="w-full text-sm text-nysc-green font-medium py-2 rounded-full border border-nysc-green hover:bg-[#f0f7f3] transition disabled:opacity-60"
              >
                {isResendingOtp ? "Sending..." : "Resend OTP"}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center gap-2 w-full bg-nysc-green hover:bg-nysc-green-dark text-white font-semibold py-3 rounded-full transition disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {isLoading
              ? "Please wait..."
              : awaitingOtp
                ? "Verify Email"
                : "Create Account"}
          </button>

          <ManualLinks manuals={[STAFF_MANUAL]} className="pt-2" />
        </form>
      </div>

      {showPhotoModal && (
        <CameraCaptureModal
          title="Profile photo"
          description="Take a clear photo of your face. It is used to verify your identity during assessments."
          onCapture={(imageDataUrl) => {
            setProfilePicture(dataUrlToFile(imageDataUrl, "profile-photo.jpg"));
            setProfilePreview(imageDataUrl);
            clearFieldError("photo");
            setError("");
            setShowPhotoModal(false);
          }}
          onCancel={() => setShowPhotoModal(false)}
        />
      )}
    </div>
  );
}

// The backend returns field-keyed arrays for validation failures.
function readRegisterError(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Registration failed.";

  const record = payload as Record<string, unknown>;

  if (typeof record.message === "string") return record.message;

  for (const field of ["email", "password", "file_number", "phone_number"]) {
    const value = record[field];
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }

  if (typeof record.detail === "string") return record.detail;

  return "Registration failed.";
}
