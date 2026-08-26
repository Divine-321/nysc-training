"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileStack,
  Layers,
  Library,
  MinusCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  dedupeById,
  extractErrorMessage,
  readApiItem,
  readApiList,
  sortedAssignedModules,
  type Course,
  type CourseModuleLink,
  type LibraryModule,
} from "@/app/lib/portal-api";
import { btn, field, fieldLabel } from "@/app/components/ui";
import { ActionMenu } from "@/app/components/ui-interactive";
import ModuleActivitiesManager from "./ModuleDocumentsManager";
import type { Activity } from "./ModuleDocumentsManager";
import { useConfirm } from "@/app/components/useConfirm";
import { cachedFetch, cachedFetchAll } from "@/app/lib/data-cache";

/**
 * Reusable-modules backend (live 2026-07-12): Modules live in a shared
 * library and are attached to courses through an ordered M2M link.
 * POST /courses/{id}/assign-modules {module_ids} REPLACES the course's
 * module list — so attach, remove and reorder all resend the full
 * ordered id array.
 */

function linkActivities(link: CourseModuleLink): Activity[] {
  return (link.module_details?.activities as Activity[] | undefined) ?? [];
}

function moduleActivities(module: LibraryModule): Activity[] {
  return (module.activities as Activity[] | undefined) ?? [];
}

const emptyForm = {
  title: "",
  description: "",
};

export default function CourseModulesManager({
  courseId,
}: {
  courseId: number;
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [assigned, setAssigned] = useState<CourseModuleLink[]>([]);
  const [library, setLibrary] = useState<LibraryModule[]>([]);
  const [selectedAttachId, setSelectedAttachId] = useState("");
  const [attachSearch, setAttachSearch] = useState("");
  const [attaching, setAttaching] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadModules = useCallback(async () => {
    try {
      const [courseResponse, modulesResponse] = await Promise.all([
        cachedFetch(`/api/training/courses/${courseId}`),
        cachedFetchAll("/api/training/modules"),
      ]);

      const coursePayload = await courseResponse.json().catch(() => null);

      if (!courseResponse.ok) {
        throw new Error(
          extractErrorMessage(
            coursePayload,
            "Could not load the course's modules.",
          ),
        );
      }

      setAssigned(sortedAssignedModules(readApiItem<Course>(coursePayload)));

      const modulesPayload = await modulesResponse.json().catch(() => null);

      if (modulesResponse.ok) {
        setLibrary(
          dedupeById(readApiList<LibraryModule>(modulesPayload)).sort(
            (first, second) => first.title.localeCompare(second.title),
          ),
        );
      }

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

  const assignedModuleIds = assigned.map((link) => link.module);

  // The library modules not yet attached to this course.
  const availableModules = library.filter(
    (module) => !assignedModuleIds.includes(module.id),
  );

  // Narrowed by the search box. Module titles here run to a full sentence, so
  // a plain dropdown of them is unreadable once the library has more than a
  // handful.
  const attachQuery = attachSearch.trim().toLowerCase();
  const matchingModules = attachQuery
    ? availableModules.filter((module) =>
        module.title.toLowerCase().includes(attachQuery),
      )
    : availableModules;

  // A selection the search has since hidden must not stay armed: the button
  // would attach a module the admin can no longer see. Derived rather than
  // cleared in an effect, so there is no render where the two disagree.
  const attachId = matchingModules.some(
    (module) => String(module.id) === selectedAttachId,
  )
    ? selectedAttachId
    : "";

  /** Replaces the course's ordered module list on the backend. */
  const saveAssignments = async (moduleIds: number[]) => {
    const response = await fetch(
      `/api/training/courses/${courseId}/assign-modules`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_ids: moduleIds }),
      },
    );
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        extractErrorMessage(payload, "Could not update the course's modules."),
      );
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const toggleExpanded = (moduleId: number) => {
    setExpandedIds((current) => {
      const next = new Set(current);

      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }

      return next;
    });
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
          title: form.title,
          description: form.description || "",
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not save module.")
        );
      }

      // A brand-new module starts life in the library — attach it to this
      // course right away so "Build Module" behaves as one step.
      if (!isEditing) {
        const created = readApiItem<LibraryModule>(payload);

        if (created?.id) {
          await saveAssignments([...assignedModuleIds, created.id]);
        }
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

  // Attaches a library module to this course (non-destructive — the module
  // stays available to every other course).
  const handleAttachModule = async () => {
    const moduleId = Number(attachId);

    if (!Number.isFinite(moduleId) || !attachId) return;

    setAttaching(true);
    setError("");

    try {
      await saveAssignments([...assignedModuleIds, moduleId]);
      setSelectedAttachId("");
      await loadModules();
    } catch (attachError) {
      setError(
        attachError instanceof Error
          ? attachError.message
          : "Could not assign this module.",
      );
    } finally {
      setAttaching(false);
    }
  };

  const startEditing = (link: CourseModuleLink) => {
    setEditingId(link.module);

    setForm({
      title: link.module_details?.title ?? "",
      description: link.module_details?.description ?? "",
    });
  };

  // Detaches the module from this course only; it stays in the library.
  const handleRemoveFromCourse = async (link: CourseModuleLink) => {
    const confirmed = await confirm(
      `Remove "${link.module_details?.title ?? "this module"}" from this course? It stays in the module library and in any other course using it.`,
    );

    if (!confirmed) return;

    setError("");

    try {
      await saveAssignments(
        assignedModuleIds.filter((id) => id !== link.module),
      );
      await loadModules();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove this module from the course.",
      );
    }
  };

  // Deletes the module from the LIBRARY — it disappears from every course.
  const handleDelete = async (link: CourseModuleLink) => {
    const confirmed = await confirm(
      `Delete "${link.module_details?.title ?? "this module"}" from the library? This permanently removes the module and all of its activities from EVERY course that uses it — not just this one. This cannot be undone.`,
      { danger: true },
    );

    if (!confirmed) return;

    const response = await fetch(`/api/training/modules/${link.module}`, {
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
    if (newIndex < 0 || newIndex >= assigned.length) return;

    const reordered = [...assigned];
    const [movedModule] = reordered.splice(currentIndex, 1);

    reordered.splice(newIndex, 0, movedModule);

    setError("");

    try {
      // Order = position in the module_ids array.
      await saveAssignments(reordered.map((link) => link.module));
      setAssigned(
        reordered.map((link, index) => ({ ...link, order: index })),
      );
    } catch (reorderError) {
      setError(
        reorderError instanceof Error
          ? reorderError.message
          : "Could not reorder modules.",
      );
    }
  };

  return (
    <div className="space-y-5">
      {/* Library explainer */}
      <div className="flex items-start gap-3 rounded-2xl border border-green-100 bg-[#f0f7f3] p-4">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#1a6b3c] shadow-sm">
          <Library size={17} />
        </span>
        <div className="text-sm text-gray-700">
          <p className="font-semibold text-gray-900">
            Modules are reusable — they live in the Module Library.
          </p>
          <p className="mt-0.5 text-gray-600">
            Attaching a module here is non-destructive: other courses keep
            using it, and removing it from this course never deletes it.{" "}
            <Link
              href="/admin/modules"
              className="font-semibold text-[#1a6b3c] underline-offset-2 hover:underline"
            >
              Open the Module Library
            </Link>
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
        {/* Left: add modules */}
        <div className="space-y-5">
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div>
              <h3 className="font-bold text-gray-900">
                {editingId ? "Edit Module" : "Build a New Module"}
              </h3>
              {editingId ? (
                <p className="mt-1 text-xs text-amber-600">
                  Modules are shared — your edits apply in every course that
                  uses this module.
                </p>
              ) : (
                <p className="mt-1 text-xs text-gray-500">
                  Created in the shared library and attached to this course
                  automatically.
                </p>
              )}
            </div>

            <div>
              <label className={fieldLabel}>Module title</label>
              <input
                required
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                className={field}
              />
            </div>

            <div>
              <label className={fieldLabel}>Description</label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                className={`${field} h-24 resize-none`}
              />
            </div>

            <div className="flex gap-2">
              <button disabled={saving} className={`flex-1 ${btn.primary}`}>
                <Plus size={17} />
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update module"
                    : "Create module"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className={btn.secondary}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div>
              <h3 className="font-bold text-gray-900">Attach from library</h3>
              <p className="mt-1 text-xs text-gray-500">
                Reuse an existing module — with its activities and assessments
                — in this course. Nothing is moved or duplicated.
              </p>
            </div>

            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                value={attachSearch}
                onChange={(event) => setAttachSearch(event.target.value)}
                placeholder="Search the library..."
                className={`${field} pl-9`}
              />
            </div>

            <select
              value={attachId}
              onChange={(event) => setSelectedAttachId(event.target.value)}
              size={Math.min(Math.max(matchingModules.length + 1, 3), 8)}
              className={`${field} h-auto py-1`}
            >
              <option value="">Select a module to attach</option>
              {matchingModules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.title} ({moduleActivities(module).length} item(s))
                </option>
              ))}
            </select>

            {attachQuery && matchingModules.length === 0 && (
              <p className="text-xs text-gray-500">
                No library module matches &ldquo;{attachSearch.trim()}&rdquo;.
              </p>
            )}

            <button
              type="button"
              onClick={handleAttachModule}
              disabled={!attachId || attaching}
              className={`w-full ${btn.secondary}`}
            >
              {attaching ? "Attaching..." : "Attach to course"}
            </button>

            {availableModules.length === 0 && !loading && (
              <p className="text-xs text-gray-400">
                Every library module is already attached to this course.
              </p>
            )}
          </div>
        </div>

        {/* Right: assigned modules */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-gray-900">
                Assigned Modules{" "}
                <span className="font-normal text-gray-400">
                  ({assigned.length})
                </span>
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Staff go through these in order. Use the arrows to reorder.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-xl bg-gray-100"
                />
              ))}
            </div>
          ) : assigned.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-12 text-center">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm ring-1 ring-gray-100">
                <Layers size={20} />
              </span>
              <p className="text-sm font-semibold text-gray-900">
                No modules attached yet
              </p>
              <p className="mt-1 max-w-xs text-sm text-gray-500">
                Build a new module or attach one from the library to start
                shaping this course.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {assigned.map((link, index) => {
                const activities = linkActivities(link);
                const isExpanded = expandedIds.has(link.module);
                const isBeingEdited = editingId === link.module;

                return (
                  <div
                    key={link.id}
                    className={`rounded-xl border transition ${
                      isBeingEdited
                        ? "border-[#1a6b3c]/40 ring-1 ring-[#1a6b3c]/20"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-3 p-4">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f0f7f3] text-sm font-bold text-[#1a6b3c]">
                        {index + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {link.module_details?.title}
                        </h4>
                        <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">
                          {link.module_details?.description ||
                            "No description"}
                        </p>
                        <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
                          <FileStack size={13} className="text-gray-400" />
                          {activities.length} content item
                          {activities.length === 1 ? "" : "s"}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => moveModule(index, index - 1)}
                          disabled={index === 0}
                          aria-label="Move module up"
                          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ArrowUp size={16} />
                        </button>

                        <button
                          onClick={() => moveModule(index, index + 1)}
                          disabled={index === assigned.length - 1}
                          aria-label="Move module down"
                          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ArrowDown size={16} />
                        </button>

                        <ActionMenu
                          ariaLabel={`Actions for ${link.module_details?.title}`}
                          items={[
                            {
                              label: "Edit module",
                              icon: Pencil,
                              onSelect: () => startEditing(link),
                            },
                            {
                              label: "Open in library",
                              icon: ExternalLink,
                              onSelect: () =>
                                router.push(`/admin/modules/${link.module}`),
                            },
                            {
                              label: "Remove from course",
                              icon: MinusCircle,
                              onSelect: () =>
                                void handleRemoveFromCourse(link),
                            },
                            {
                              label: "Delete from library",
                              icon: Trash2,
                              danger: true,
                              onSelect: () => void handleDelete(link),
                            },
                          ]}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpanded(link.module)}
                      aria-expanded={isExpanded}
                      className="flex w-full items-center justify-center gap-1.5 border-t border-gray-100 py-2 text-xs font-semibold text-gray-500 transition hover:bg-gray-50 hover:text-[#1a6b3c]"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={14} /> Hide activities
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} /> Manage activities (
                          {activities.length})
                        </>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100 px-4 pb-4">
                        <ModuleActivitiesManager
                          moduleId={link.module}
                          courseId={courseId}
                          activities={activities}
                          onChanged={loadModules}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {dialog}
    </div>
  );
}
