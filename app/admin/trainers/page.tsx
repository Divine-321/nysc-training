"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Edit3, Plus, Trash2, UserCheck } from "lucide-react";
import {
  extractErrorMessage,
  readApiList,
  type Trainer,
} from "@/app/lib/portal-api";
import { useConfirm } from "@/app/components/useConfirm";

const emptyForm = {
  full_name: "",
  designation: "",
  organization: "",
  bio: "",
};

export default function AdminTrainersPage() {
  const { confirm, dialog } = useConfirm();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadTrainers = useCallback(async () => {
    try {
      const response = await fetch("/api/training/trainers", {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not load trainers."),
        );
      }

      setTrainers(readApiList<Trainer>(payload));
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load trainers.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await loadTrainers();
    };

    void fetchData();
  }, [loadTrainers]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (trainer: Trainer) => {
    setForm({
      full_name: trainer.full_name,
      designation: trainer.designation,
      organization: trainer.organization,
      bio: trainer.bio ?? "",
    });
    setEditingId(trainer.id);
    setShowForm(true);
    setError("");
    setNotice("");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        editingId ? `/api/training/trainers/${editingId}` : "/api/training/trainers",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: form.full_name.trim(),
            designation: form.designation.trim(),
            organization: form.organization.trim(),
            bio: form.bio.trim() || null,
          }),
        },
      );
      const payload = response.status === 204 ? null : await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not save trainer."),
        );
      }

      setNotice(editingId ? "Trainer updated." : "Trainer added.");
      resetForm();
      await loadTrainers();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save trainer.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (trainer: Trainer) => {
    const confirmed = await confirm(`Delete ${trainer.full_name}?`, {
      danger: true,
    });

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/training/trainers/${trainer.id}`, {
        method: "DELETE",
      });
      const payload = response.status === 204 ? null : await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not delete trainer."),
        );
      }

      setNotice("Trainer deleted.");
      setTrainers((current) => current.filter((item) => item.id !== trainer.id));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete trainer.",
      );
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Trainers</h2>
          <p className="mt-1 text-sm text-gray-500">
            Create the trainer list that admins can select from when creating courses.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
              setError("");
              setNotice("");
            }
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={18} />
          {showForm ? "Close form" : "Add trainer"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
          {notice}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-2"
        >
          <div className="md:col-span-2">
            <h3 className="font-bold text-gray-800">
              {editingId ? "Edit trainer" : "Add trainer"}
            </h3>
          </div>

          <input
            required
            value={form.full_name}
            onChange={(event) =>
              setForm({ ...form, full_name: event.target.value })
            }
            placeholder="Full name"
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm"
          />

          <input
            required
            value={form.designation}
            onChange={(event) =>
              setForm({ ...form, designation: event.target.value })
            }
            placeholder="Designation, e.g. Facilitator"
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm"
          />

          <input
            required
            value={form.organization}
            onChange={(event) =>
              setForm({ ...form, organization: event.target.value })
            }
            placeholder="Organization"
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm md:col-span-2"
          />

          <textarea
            value={form.bio}
            onChange={(event) =>
              setForm({ ...form, bio: event.target.value })
            }
            placeholder="Short trainer bio"
            className="min-h-24 rounded-lg border border-gray-300 px-4 py-2.5 text-sm md:col-span-2"
          />

          <button
            disabled={saving}
            className="rounded-lg bg-[#1a6b3c] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Update trainer" : "Save trainer"}
          </button>
        </form>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search trainers by name..."
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
        />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {(() => {
          const filteredTrainers = trainers.filter((trainer) =>
            trainer.full_name
              .toLowerCase()
              .includes(searchTerm.trim().toLowerCase()),
          );

          if (loading) {
            return <p className="p-6 text-sm text-gray-500">Loading trainers...</p>;
          }

          if (trainers.length === 0) {
            return (
              <p className="p-6 text-sm text-gray-500">
                No trainers have been added yet.
              </p>
            );
          }

          if (filteredTrainers.length === 0) {
            return (
              <p className="p-6 text-sm text-gray-500">
                No trainers match &quot;{searchTerm}&quot;.
              </p>
            );
          }

          return (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="p-4">Trainer</th>
                <th className="p-4">Designation</th>
                <th className="p-4">Organization</th>
                <th className="p-4">Bio</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredTrainers.map((trainer) => (
                <tr key={trainer.id} className="border-t">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-green-50 p-2 text-[#1a6b3c]">
                        <UserCheck size={18} />
                      </div>
                      <div>
                        <span className="font-semibold text-gray-800">
                          {trainer.full_name}
                        </span>
                        <span className="ml-2 text-xs text-gray-400">
                          #{trainer.id}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">{trainer.designation}</td>
                  <td className="p-4 text-gray-600">{trainer.organization}</td>
                  <td className="max-w-xs truncate p-4 text-gray-600">
                    {trainer.bio || "No bio"}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => startEdit(trainer)}
                        className="text-[#1a6b3c]"
                        aria-label={`Edit ${trainer.full_name}`}
                      >
                        <Edit3 size={17} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(trainer)}
                        className="text-red-600"
                        aria-label={`Delete ${trainer.full_name}`}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          );
        })()}
      </div>

      {dialog}
    </div>
  );
}
