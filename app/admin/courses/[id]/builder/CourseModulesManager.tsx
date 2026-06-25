"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import type { FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  extractErrorMessage,
  readApiList,
} from "@/app/lib/portal-api";
import ModuleDocumentsManager from "./ModuleDocumentsManager";
import type { ModuleDocument } from "./ModuleDocumentsManager";

type CourseModule = {
  id: number;
  course: number;
  title: string;
  description: string | null;
  notes: string | null;
  order: number;
  documents: ModuleDocument[];
  created_at: string;
  updated_at: string;
};

const emptyForm = {
  title: "",
  description: "",
  notes: "",
};

export default function CourseModulesManager({
  courseId,
}: {
  courseId: number;
}) {
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadModules = useCallback(async () => {
    try {
      const response = await fetch("/api/training/modules", {
        cache: "no-store",
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not load modules.")
        );
      }

      const allModules = readApiList<CourseModule>(payload);

      setModules(
        allModules
          .filter((module) => module.course === courseId)
          .sort((first, second) => first.order - second.order)
      );

      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load modules."
      );
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    const fetchData = async () => {
      await loadModules();
    };

    void fetchData();
  }, [loadModules]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const isEditing = editingId !== null;
      const url = isEditing
        ? `/api/training/modules/${editingId}`
        : "/api/training/modules";

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course: courseId,
          title: form.title,
          description: form.description || null,
          notes: form.notes || null,
          order: isEditing
            ? modules.find((module) => module.id === editingId)?.order ?? 0
            : modules.length,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not save module.")
        );
      }

      resetForm();
      await loadModules();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save module."
      );
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (module: CourseModule) => {
    setEditingId(module.id);

    setForm({
      title: module.title,
      description: module.description ?? "",
      notes: module.notes ?? "",
    });
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      "Delete this module and its materials?"
    );

    if (!confirmed) return;

    const response = await fetch(`/api/training/modules/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setError(`Could not delete module (HTTP ${response.status}).`);
      return;
    }

    await loadModules();
  };

  const moveModule = async (
    currentIndex: number,
    newIndex: number
  ) => {
    if (newIndex < 0 || newIndex >= modules.length) return;

    const reordered = [...modules];
    const [movedModule] = reordered.splice(currentIndex, 1);

    reordered.splice(newIndex, 0, movedModule);

    const modulesWithOrder = reordered.map((module, index) => ({
      ...module,
      order: index,
    }));

    const response = await fetch("/api/training/modules/reorder", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        modulesWithOrder.map((module) => ({
          id: module.id,
          order: module.order,
        }))
      ),
    });

    if (!response.ok) {
      setError("Could not reorder modules.");
      return;
    }

    setModules(modulesWithOrder);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
      >
        <h3 className="text-lg font-bold text-[#1a6b3c]">
          {editingId ? "Edit Module" : "Add Module"}
        </h3>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">
            Module title
          </label>

          <input
            required
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
            className="w-full rounded-lg border px-4 py-2.5"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Description
          </label>

          <textarea
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            className="h-24 w-full rounded-lg border px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Instructor notes
          </label>

          <textarea
            value={form.notes}
            onChange={(event) =>
              setForm({ ...form, notes: event.target.value })
            }
            className="h-32 w-full rounded-lg border px-4 py-3"
          />
        </div>

        <div className="flex gap-3">
          <button
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-5 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            <Plus size={18} />
            {saving
              ? "Saving..."
              : editingId
                ? "Update module"
                : "Add module"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border px-5 py-2.5"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-[#1a6b3c]">
          Existing Modules
        </h3>

        {loading ? (
          <p className="text-sm text-gray-500">Loading modules...</p>
        ) : modules.length === 0 ? (
          <p className="text-sm text-gray-500">
            No modules have been added.
          </p>
        ) : (
          <div className="space-y-3">
            {modules.map((module, index) => (
              <div
                key={module.id}
                className="rounded-xl border border-gray-200 p-4"
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <h4 className="font-semibold">{module.title}</h4>
                    <p className="mt-1 text-sm text-gray-500">
                      {module.description || "No description"}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      {module.documents.length} material(s)
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => moveModule(index, index - 1)}
                      disabled={index === 0}
                      aria-label="Move module up"
                      className="disabled:opacity-30"
                    >
                      <ArrowUp size={17} />
                    </button>

                    <button
                      onClick={() => moveModule(index, index + 1)}
                      disabled={index === modules.length - 1}
                      aria-label="Move module down"
                      className="disabled:opacity-30"
                    >
                      <ArrowDown size={17} />
                    </button>

                    <button
                      onClick={() => startEditing(module)}
                      aria-label={`Edit ${module.title}`}
                      className="text-[#1a6b3c]"
                    >
                      <Pencil size={17} />
                    </button>

                    <button
                      onClick={() => handleDelete(module.id)}
                      aria-label={`Delete ${module.title}`}
                      className="text-red-600"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>

                <ModuleDocumentsManager
                  moduleId={module.id}
                  documents={module.documents}
                  onChanged={loadModules}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
