"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { extractErrorMessage } from "@/app/lib/portal-api";

type AcceptInviteFormProps = {
  token: string;
  email: string;
};

const emptyForm = {
  first_name: "",
  last_name: "",
  password: "",
  confirm_password: "",
};

export default function AcceptInviteForm({
  token,
  email,
}: AcceptInviteFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const missingInvitationDetails = !token || !email;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (missingInvitationDetails) {
      setError("This invitation link is incomplete. Please request a new one.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (form.password !== form.confirm_password) {
      setError("The passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = new FormData();
      payload.set("token", token);
      payload.set("email", email);
      payload.set("first_name", form.first_name.trim());
      payload.set("last_name", form.last_name.trim());
      payload.set("password", form.password);
      payload.set("confirm_password", form.confirm_password);

      if (profilePicture) {
        payload.set("profile_picture_url", profilePicture);
      }

      const response = await fetch("/api/accounts/admin/invite/accept", {
        method: "POST",
        body: payload,
      });

      const responsePayload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(
            responsePayload,
            "Could not accept this invitation.",
          ),
        );
      }

      setSuccess(
        responsePayload?.message ||
          "Account created successfully. Redirecting to Admin Login...",
      );

      window.setTimeout(() => {
        router.replace("/admin-login");
      }, 1800);
    } catch (acceptError) {
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : "Could not accept this invitation.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <Image
            src="/images/nysc-logo.png"
            alt="NYSC"
            width={72}
            height={72}
            className="mx-auto mb-4"
          />

          <h1 className="text-2xl font-bold text-gray-800">
            Accept Administrator Invitation
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Create your administrator account. This invitation is valid for 48
            hours.
          </p>
        </div>

        {missingInvitationDetails && (
          <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            This invitation link is incomplete. Please ask the Super Admin to
            send another invitation.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full rounded-lg border bg-gray-50 p-3 text-sm text-gray-600"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                First name
              </label>
              <input
                required
                value={form.first_name}
                onChange={(event) =>
                  setForm({ ...form, first_name: event.target.value })
                }
                className="w-full rounded-lg border p-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Last name
              </label>
              <input
                required
                value={form.last_name}
                onChange={(event) =>
                  setForm({ ...form, last_name: event.target.value })
                }
                className="w-full rounded-lg border p-3 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Profile picture (optional)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;

                if (file && file.size > 5 * 1024 * 1024) {
                  setError("Profile picture must not exceed 5MB.");
                  setProfilePicture(null);
                  event.target.value = "";
                  return;
                }

                setError("");
                setProfilePicture(file);
              }}
              className="w-full rounded-lg border p-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              className="w-full rounded-lg border p-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Confirm password
            </label>
            <input
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={form.confirm_password}
              onChange={(event) =>
                setForm({ ...form, confirm_password: event.target.value })
              }
              className="w-full rounded-lg border p-3 text-sm"
            />
          </div>

          <button
            disabled={submitting || missingInvitationDetails || Boolean(success)}
            className="w-full rounded-lg bg-[#1a6b3c] px-6 py-3 font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Creating account..." : "Create Admin Account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          Already accepted your invitation?{" "}
          <Link href="/admin-login" className="font-semibold text-[#1a6b3c]">
            Go to Admin Login
          </Link>
        </p>
      </div>
    </main>
  );
}
