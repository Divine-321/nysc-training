"use client";

import { FormEvent, useState } from "react";
import { extractErrorMessage } from "@/app/lib/portal-api";

const emptyForm = {
  first_name: "",
  last_name: "",
  email: "",
};

export default function InviteAdminPage() {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/accounts/admin/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not invite administrator.")
        );
      }

      setSuccess(
        payload?.message || "Administrator invitation sent successfully."
      );
      setForm(emptyForm);
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : "Could not invite administrator."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          Invite Administrator
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Send an account invitation to a new administrator.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl bg-white p-6 shadow-sm"
      >
        <input
          required
          placeholder="First name"
          value={form.first_name}
          onChange={(event) =>
            setForm({ ...form, first_name: event.target.value })
          }
          className="w-full rounded-lg border p-3"
        />

        <input
          required
          placeholder="Last name"
          value={form.last_name}
          onChange={(event) =>
            setForm({ ...form, last_name: event.target.value })
          }
          className="w-full rounded-lg border p-3"
        />

        <input
          required
          type="email"
          placeholder="Administrator email"
          value={form.email}
          onChange={(event) =>
            setForm({ ...form, email: event.target.value })
          }
          className="w-full rounded-lg border p-3"
        />

        <button
          disabled={saving}
          className="rounded-lg bg-[#1a6b3c] px-6 py-3 font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Sending..." : "Send Invitation"}
        </button>
      </form>
    </div>
  );
}