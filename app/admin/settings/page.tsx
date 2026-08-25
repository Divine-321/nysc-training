"use client";

import { Bell, BookOpen, ExternalLink, Lock, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import {
  extractErrorMessage,
  readApiItem,
  readApiList,
} from "@/app/lib/portal-api";
import { uploadFileToCloudinary } from "@/app/lib/cloudinary-upload";
import { LOGIN_MANUAL_MARKER } from "@/app/lib/login-manual";
import TrustedDevices from "./TrustedDevices";
import { cachedFetchAll } from "@/app/lib/data-cache";

type ManualBook = {
  id: number;
  title: string;
  description: string | null;
  file_url: string;
};

export default function AdminSettingsPage() {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [manual, setManual] = useState<ManualBook | null>(null);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualProgress, setManualProgress] = useState(0);
  const [manualError, setManualError] = useState("");
  const [manualNotice, setManualNotice] = useState("");

  useEffect(() => {
    const loadManual = async () => {
      try {
        const response = await cachedFetchAll("/api/learning/books");

        if (!response.ok) return;

        const payload = await response.json().catch(() => null);
        const existing = readApiList<ManualBook>(payload).find((book) =>
          book.title?.startsWith(LOGIN_MANUAL_MARKER),
        );

        setManual(existing ?? null);
      } catch {
        // Non-critical; the section just shows "no manual attached".
      }
    };

    void loadManual();
  }, []);

  // Uploads the manual PDF and stores it as the marker book that the login
  // page popup looks for. Re-uploading replaces the existing manual.
  const handleManualUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setManualError("Please choose a PDF file.");
      return;
    }

    setManualBusy(true);
    setManualError("");
    setManualNotice("");
    setManualProgress(0);

    try {
      const uploaded = await uploadFileToCloudinary(
        file,
        setManualProgress,
        "book_pdf",
      );

      const body = JSON.stringify({
        title: `${LOGIN_MANUAL_MARKER} Portal User Manual`,
        description:
          "How to use the NYSC E-Training Portal. Shown to users on the login page.",
        file_url: uploaded.secure_url,
      });

      const response = await fetch(
        manual ? `/api/learning/books/${manual.id}` : "/api/learning/books",
        {
          method: manual ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body,
        },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not save the manual."),
        );
      }

      setManual(readApiItem<ManualBook>(payload));
      setManualNotice(
        "Manual attached. It will appear as a popup on the login page.",
      );
    } catch (uploadError) {
      setManualError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload the manual.",
      );
    } finally {
      setManualBusy(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch("/api/accounts/auth/change-password", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    old_password: currentPassword,
    new_password: newPassword,
    confirm_password: confirmPassword,
  }),
});
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(extractErrorMessage(payload, "Password could not be updated."));
      }

      setPasswordSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (changePasswordError) {
      setPasswordError(
        changePasswordError instanceof Error ? changePasswordError.message : "Password could not be updated."
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Admin Settings</h2>
        <p className="text-sm text-gray-500">Manage your administrative notifications, security, and preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          {/* Notifications */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Bell size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Notifications</h3>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-800">System Alerts (Email)</p>
                  <p className="text-sm text-gray-500">Receive alerts when new staff enroll in courses.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={emailNotifs} onChange={() => setEmailNotifs(!emailNotifs)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a6b3c]"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-800">Weekly Reports (SMS)</p>
                  <p className="text-sm text-gray-500">Get text messages for weekly training summaries.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={smsNotifs} onChange={() => setSmsNotifs(!smsNotifs)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a6b3c]"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Login page manual */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
              <div className="w-10 h-10 rounded-full bg-green-50 text-[#1a6b3c] flex items-center justify-center">
                <BookOpen size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  Login Page Manual
                </h3>
                <p className="text-xs text-gray-500">
                  Attach the portal user manual (PDF). It appears as a popup
                  on the login page.
                </p>
              </div>
            </div>

            {manualError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {manualError}
              </div>
            )}
            {manualNotice && (
              <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                {manualNotice}
              </div>
            )}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {manual ? (
                  <a
                    href={manual.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#1a6b3c] hover:underline"
                  >
                    <ExternalLink size={16} />
                    View current manual
                  </a>
                ) : (
                  <p className="text-sm text-gray-500">
                    No manual attached yet.
                  </p>
                )}
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#1a6b3c] px-4 py-2.5 text-sm font-semibold text-[#1a6b3c] transition hover:bg-green-50">
                <Upload size={16} />
                {manualBusy
                  ? `Uploading... ${manualProgress}%`
                  : manual
                    ? "Replace manual (PDF)"
                    : "Attach manual (PDF)"}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  disabled={manualBusy}
                  onChange={handleManualUpload}
                />
              </label>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                <Lock size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Security</h3>
            </div>
            
            <div className="space-y-4">
              {passwordError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                  {passwordSuccess}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Current Password</label>
                <input type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">New Password</label>
                  <input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Confirm New Password</label>
                  <input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" />
                </div>
              </div>
              <div className="pt-2">
                <button onClick={handleChangePassword} disabled={isChangingPassword} className="bg-gray-900 hover:bg-black text-white px-6 py-2.5 rounded-lg text-sm font-bold transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
                  {isChangingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
          </div>

          <TrustedDevices />
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-4">Preferences</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Timezone</label>
                <select className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]">
                  <option>WAT (West Africa Time)</option>
                  <option>GMT</option>
                  <option>UTC</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-[#f0f7f3] rounded-2xl shadow-sm border border-green-100 p-6">
            <h3 className="font-bold text-[#1a6b3c] mb-2">Admin Support</h3>
            <p className="text-sm text-green-800 mb-4">Contact the technical team for system-level issues.</p>
            <button className="w-full bg-[#1a6b3c] text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-[#145530] transition shadow-sm">
              Contact Tech Support
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}