"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  extractErrorMessage,
  readApiList,
} from "@/app/lib/portal-api";

type Cohort = {
  id: number;
  name: string;
  batch: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED";
  created_by: number | null;
  created_at: string;
};


const emptyForm = {
  name: "",
  batch: "",
  description: "",
  start_date: "",
  end_date: "",
  status: "UPCOMING" as Cohort["status"],
};

async function readResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export default function CohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCohorts = useCallback(async () => {
    try {
      const response = await fetch("/api/training/cohorts", {
        cache: "no-store",
      });

      const payload = await readResponsePayload(response);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(
            payload,
            `Could not load cohorts (HTTP ${response.status}).`
          )
        );
      }

      const nextCohorts = readApiList<Cohort>(payload);
      setCohorts(nextCohorts);
      setError("");
      return nextCohorts;
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load cohorts."
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await loadCohorts();
    };

    void fetchData();
  }, [loadCohorts]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const isEditing = editingId !== null;
      const response = await fetch(
        isEditing
          ? `/api/training/cohorts/${editingId}`
          : "/api/training/cohorts",
        {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      },
      );

      const payload = await readResponsePayload(response);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(
            payload,
            `Could not ${isEditing ? "update" : "create"} cohort (HTTP ${response.status}).`
          )
        );
      }

      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      await loadCohorts();
      setNotice(
        isEditing
          ? "Cohort updated successfully."
          : "Cohort created successfully.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not create cohort."
      );
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (cohort: Cohort) => {
    setEditingId(cohort.id);
    setForm({
      name: cohort.name,
      batch: cohort.batch,
      description: cohort.description ?? "",
      start_date: cohort.start_date,
      end_date: cohort.end_date,
      status: cohort.status,
    });
    setError("");
    setNotice("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this cohort?"
    );

    if (!shouldDelete) return;

    setDeletingId(id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/training/cohorts/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await readResponsePayload(response);
        const refreshedCohorts = await loadCohorts();
        const cohortStillExists = refreshedCohorts?.some(
          (cohort) => cohort.id === id
        );

        if (refreshedCohorts && !cohortStillExists) {
          setError("");
          setNotice(
            "Cohort was deleted. The backend returned an incorrect error status after deleting it."
          );
          return;
        }

        throw new Error(
          extractErrorMessage(
            payload,
            `Could not delete cohort (HTTP ${response.status}).`
          )
        );
      }

      await loadCohorts();
      setNotice("Cohort deleted successfully.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete cohort."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Cohorts
          </h2>

          <p className="text-sm text-gray-500">
            Manage staff training cohorts.
          </p>
        </div>

        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditingId(null);
              setForm(emptyForm);
              return;
            }

            setEditingId(null);
            setForm(emptyForm);
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={18} />
          {showForm ? "Close form" : "Create cohort"}
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
          <h3 className="text-lg font-bold text-[#1a6b3c] md:col-span-2">
            {editingId ? "Edit cohort" : "Create cohort"}
          </h3>
          <input
            required
            placeholder="Cohort name"
            value={form.name}
            onChange={(event) =>
              setForm({ ...form, name: event.target.value })
            }
            className="rounded-lg border p-3"
          />

          <input
            required
            placeholder="Batch, for example April/2026"
            value={form.batch}
            onChange={(event) =>
              setForm({ ...form, batch: event.target.value })
            }
            className="rounded-lg border p-3"
          />

          <input
            required
            type="date"
            value={form.start_date}
            onChange={(event) =>
              setForm({ ...form, start_date: event.target.value })
            }
            className="rounded-lg border p-3"
          />

          <input
            required
            type="date"
            value={form.end_date}
            onChange={(event) =>
              setForm({ ...form, end_date: event.target.value })
            }
            className="rounded-lg border p-3"
          />

          <select
            value={form.status}
            onChange={(event) =>
              setForm({
                ...form,
                status: event.target.value as Cohort["status"],
              })
            }
            className="rounded-lg border p-3"
          >
            <option value="UPCOMING">Upcoming</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            className="rounded-lg border p-3 md:col-span-2"
          />

          <button
            disabled={saving}
            className="rounded-lg bg-[#1a6b3c] px-6 py-3 font-semibold text-white disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : editingId
                ? "Update cohort"
                : "Save cohort"}
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-gray-500">Loading cohorts...</p>
        ) : cohorts.length === 0 ? (
          <p className="p-6 text-gray-500">
            No cohorts have been created.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Batch</th>
                <th className="p-4">Start</th>
                <th className="p-4">End</th>
                <th className="p-4">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {cohorts.map((cohort) => (
                <tr key={cohort.id} className="border-t">
                  <td className="p-4 font-semibold">
                    {cohort.name}
                  </td>

                  <td className="p-4">{cohort.batch}</td>
                  <td className="p-4">{cohort.start_date}</td>
                  <td className="p-4">{cohort.end_date}</td>

                  <td className="p-4">
                    {cohort.status}
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => startEditing(cohort)}
                        className="text-[#1a6b3c]"
                        aria-label={`Edit ${cohort.name}`}
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        onClick={() => handleDelete(cohort.id)}
                        disabled={deletingId === cohort.id}
                        className="text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Delete ${cohort.name}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
