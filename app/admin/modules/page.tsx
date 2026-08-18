"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calendar,
  ClipboardList,
  Copy,
  Eye,
  FileStack,
  FolderPlus,
  Layers,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  UserCheck,
} from "lucide-react";
import {
  dedupeById,
  extractErrorMessage,
  readApiList,
  type Course,
  type LibraryModule,
} from "@/app/lib/portal-api";
import { formatDate } from "@/app/lib/format";
import { useConfirm } from "@/app/components/useConfirm";
import {
  Badge,
  btn,
  EmptyState,
  field,
  PageHeader,
  Skeleton,
} from "@/app/components/ui";
import {
  ActionMenu,
  Pagination,
  SearchInput,
  ToastViewport,
  useToasts,
} from "@/app/components/ui-interactive";
import ModuleFormModal from "./ModuleFormModal";
import { cachedFetch } from "@/app/lib/data-cache";

type AssessmentLite = {
  id: number;
  module: number | null;
};

type UsageFilter = "all" | "used" | "unused";
type SortKey = "newest" | "title" | "activities";
type ViewMode = "grid" | "list";

// NOTE(backend): Module has no `status` or `updated_at` fields and there is
// no duplicate/archive endpoint — so no status badges, updated dates or
// Duplicate/Archive actions here. Add them if the backend ever ships those.

export default function ModuleLibraryPage() {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const { toasts, push } = useToasts();

  const [modules, setModules] = useState<LibraryModule[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assessments, setAssessments] = useState<AssessmentLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [usage, setUsage] = useState<UsageFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState<{ module: LibraryModule | null } | null>(
    null,
  );

  const loadData = useCallback(async () => {
    try {
      const [modulesResponse, coursesResponse, assessmentsResponse] =
        await Promise.all([
          cachedFetch("/api/training/modules"),
          cachedFetch("/api/training/courses"),
          cachedFetch("/api/training/assessments"),
        ]);

      const modulesPayload = await modulesResponse.json().catch(() => null);

      if (!modulesResponse.ok) {
        throw new Error(
          extractErrorMessage(modulesPayload, "Could not load modules."),
        );
      }

      setModules(dedupeById(readApiList<LibraryModule>(modulesPayload)));

      // Courses and assessments only enrich the cards — tolerate failures.
      const coursesPayload = await coursesResponse.json().catch(() => null);
      const assessmentsPayload = await assessmentsResponse
        .json()
        .catch(() => null);

      setCourses(
        coursesResponse.ok ? readApiList<Course>(coursesPayload) : [],
      );
      setAssessments(
        assessmentsResponse.ok
          ? readApiList<AssessmentLite>(assessmentsPayload)
          : [],
      );

      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load modules.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await loadData();
    };

    void fetchData();
  }, [loadData]);

  // Which courses use each module (derived from each course's assigned_modules).
  const usedIn = useMemo(() => {
    const map = new Map<number, Course[]>();

    for (const course of courses) {
      for (const link of course.assigned_modules ?? []) {
        const list = map.get(link.module) ?? [];
        list.push(course);
        map.set(link.module, list);
      }
    }

    return map;
  }, [courses]);

  const assessmentCount = useMemo(() => {
    const map = new Map<number, number>();

    for (const assessment of assessments) {
      if (assessment.module === null) continue;
      map.set(assessment.module, (map.get(assessment.module) ?? 0) + 1);
    }

    return map;
  }, [assessments]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    const matching = modules.filter((module) => {
      if (query) {
        const haystack =
          `${module.title} ${module.description ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      if (usage === "used" && !usedIn.has(module.id)) return false;
      if (usage === "unused" && usedIn.has(module.id)) return false;

      return true;
    });

    return matching.sort((first, second) => {
      if (sort === "title") return first.title.localeCompare(second.title);
      if (sort === "activities") {
        return (
          (second.activities?.length ?? 0) - (first.activities?.length ?? 0)
        );
      }
      // newest
      return (second.created_at ?? "").localeCompare(first.created_at ?? "");
    });
  }, [modules, search, usage, sort, usedIn]);

  const pageSize = view === "grid" ? 9 : 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const resetPage = () => setPage(1);

  const handleDelete = async (module: LibraryModule) => {
    const usage = usedIn.get(module.id) ?? [];
    const usageText =
      usage.length > 0
        ? ` It is currently attached to ${usage.length} course${
            usage.length === 1 ? "" : "s"
          } (${usage
            .slice(0, 3)
            .map((course) => course.title)
            .join(", ")}${usage.length > 3 ? ", …" : ""}).`
        : "";

    const confirmed = await confirm(
      `Delete "${module.title}" from the library?${usageText} This permanently removes the module and all of its activities from EVERY course that uses it. This cannot be undone.`,
      { danger: true },
    );

    if (!confirmed) return;

    const response = await fetch(`/api/training/modules/${module.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      push(`Could not delete module (HTTP ${response.status}).`, "error");
      return;
    }

    push("Module deleted from the library.");
    await loadData();
  };

  // Backend module clone: duplicates the module, its activities and its
  // assessments (with questions).
  const handleClone = async (module: LibraryModule) => {
    const response = await fetch(`/api/training/modules/${module.id}/clone`, {
      method: "POST",
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      push(
        extractErrorMessage(payload, "Could not duplicate this module."),
        "error",
      );
      return;
    }

    push(`"${module.title}" duplicated — the copy is now in the library.`);
    await loadData();
  };

  const moduleActions = (module: LibraryModule) => [
    {
      label: "View details",
      icon: Eye,
      onSelect: () => router.push(`/admin/modules/${module.id}`),
    },
    {
      label: "Edit module",
      icon: Pencil,
      onSelect: () => setModal({ module }),
    },
    {
      label: "Duplicate module",
      icon: Copy,
      onSelect: () => void handleClone(module),
    },
    {
      label: "Delete from library",
      icon: Trash2,
      danger: true,
      onSelect: () => void handleDelete(module),
    },
  ];

  const metaFor = (module: LibraryModule) => ({
    activities: module.activities?.length ?? 0,
    assessments: assessmentCount.get(module.id) ?? 0,
    courses: usedIn.get(module.id)?.length ?? 0,
  });

  const hasFilters = search.trim() !== "" || usage !== "all";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {dialog}
      <ToastViewport toasts={toasts} />

      <PageHeader
        title="Module Library"
        subtitle="Reusable learning modules. Build a module once — activities and assessments included — then attach it to any course."
        actions={
          <button
            type="button"
            onClick={() => setModal({ module: null })}
            className={btn.primary}
          >
            <Plus size={18} /> New Module
          </button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            resetPage();
          }}
          placeholder="Search modules…"
          className="w-full lg:max-w-sm"
        />

        <div className="flex flex-1 flex-wrap items-center gap-2">
          <select
            value={usage}
            onChange={(event) => {
              setUsage(event.target.value as UsageFilter);
              resetPage();
            }}
            aria-label="Filter by usage"
            className={`${field} w-auto`}
          >
            <option value="all">All modules</option>
            <option value="used">In use by a course</option>
            <option value="unused">Not attached yet</option>
          </select>

          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as SortKey);
              resetPage();
            }}
            aria-label="Sort modules"
            className={`${field} w-auto`}
          >
            <option value="newest">Newest first</option>
            <option value="title">Title A–Z</option>
            <option value="activities">Most activities</option>
          </select>

          <div className="ml-auto flex items-center rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
            {(
              [
                { mode: "grid" as const, icon: LayoutGrid, label: "Grid view" },
                { mode: "list" as const, icon: List, label: "List view" },
              ]
            ).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                type="button"
                aria-label={label}
                aria-pressed={view === mode}
                onClick={() => {
                  setView(mode);
                  resetPage();
                }}
                className={`flex h-8 w-9 items-center justify-center rounded-md transition ${
                  view === mode
                    ? "bg-[#1a6b3c] text-white"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {!loading && modules.length > 0 ? (
        <p className="text-xs font-medium text-gray-400">
          Showing {visible.length} of {filtered.length} module
          {filtered.length === 1 ? "" : "s"}
        </p>
      ) : null}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <Skeleton className="h-32 w-full rounded-none" />
              <div className="p-5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-1.5 h-4 w-2/3" />
                <Skeleton className="mt-5 h-9 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        // A load failure must NOT look like "you have no modules" — that reads
        // as data loss and invites creating duplicates. Show the real error
        // with a retry instead.
        <div className="rounded-2xl border border-red-100 bg-red-50 p-10 text-center">
          <AlertCircle className="mx-auto mb-3 text-red-400" size={40} />
          <p className="font-semibold text-red-700">
            Couldn&apos;t load the module library
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadData();
            }}
            className={`mx-auto mt-5 ${btn.secondary}`}
          >
            <RotateCcw size={16} /> Try again
          </button>
        </div>
      ) : modules.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="No modules yet"
          description="Create your first reusable module — you can attach it to as many courses as you need."
          action={
            <button
              type="button"
              onClick={() => setModal({ module: null })}
              className={btn.primary}
            >
              <Plus size={18} /> New Module
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No modules match"
          description="Try a different search term or clear the filters."
          action={
            hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setUsage("all");
                  resetPage();
                }}
                className={btn.secondary}
              >
                Clear filters
              </button>
            ) : undefined
          }
        />
      ) : view === "grid" ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((module) => {
            const meta = metaFor(module);

            return (
              <div
                key={module.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-md"
              >
                <Link
                  href={`/admin/modules/${module.id}`}
                  className="relative block h-32 w-full overflow-hidden bg-[#f0f7f3]"
                >
                  {module.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={module.thumbnail_url}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[#1a6b3c]/40">
                      <Layers size={34} />
                    </span>
                  )}
                  {meta.assessments > 0 ? (
                    <span className="absolute right-3 top-3">
                      <Badge variant="green">Has assessment</Badge>
                    </span>
                  ) : null}
                </Link>

                <div className="flex flex-1 flex-col p-5">
                  <Link href={`/admin/modules/${module.id}`} className="min-w-0">
                    <h3 className="truncate font-semibold text-gray-900 transition group-hover:text-[#1a6b3c]">
                      {module.title}
                    </h3>
                  </Link>
                  <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-gray-500">
                    {module.description || "No description yet."}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-gray-600">
                    <span className="inline-flex items-center gap-1.5">
                      <FileStack size={14} className="text-gray-400" />
                      {meta.activities} activit
                      {meta.activities === 1 ? "y" : "ies"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <ClipboardList size={14} className="text-gray-400" />
                      {meta.assessments} assessment
                      {meta.assessments === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen size={14} className="text-gray-400" />
                      {meta.courses === 0
                        ? "Not in a course"
                        : `In ${meta.courses} course${meta.courses === 1 ? "" : "s"}`}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                    <UserCheck size={13} className="shrink-0" />
                    <span className="truncate">
                      {(module.trainers ?? [])
                        .map((trainer) => trainer.full_name)
                        .join(", ") || "No trainer assigned"}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-400">
                    <Calendar size={13} />
                    Created{" "}
                    {module.created_at ? formatDate(module.created_at) : "—"}
                  </div>

                  <div className="mt-5 flex items-center gap-2 border-t border-gray-100 pt-4">
                    <Link
                      href={`/admin/modules/${module.id}`}
                      className={`flex-1 ${btn.secondary}`}
                    >
                      Open module <ArrowRight size={15} />
                    </Link>
                    <ActionMenu
                      ariaLabel={`Actions for ${module.title}`}
                      items={moduleActions(module)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((module) => {
            const meta = metaFor(module);

            return (
              <div
                key={module.id}
                className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-gray-200 hover:shadow-md"
              >
                <Link
                  href={`/admin/modules/${module.id}`}
                  className="block h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#f0f7f3]"
                >
                  {module.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={module.thumbnail_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[#1a6b3c]/40">
                      <Layers size={18} />
                    </span>
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/modules/${module.id}`}
                      className="truncate font-semibold text-gray-900 transition hover:text-[#1a6b3c]"
                    >
                      {module.title}
                    </Link>
                    {meta.assessments > 0 ? (
                      <Badge variant="green">Assessment</Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    <span>
                      {meta.activities} activit
                      {meta.activities === 1 ? "y" : "ies"}
                    </span>
                    <span>
                      {meta.courses === 0
                        ? "Not in a course"
                        : `In ${meta.courses} course${meta.courses === 1 ? "" : "s"}`}
                    </span>
                    <span className="hidden sm:inline">
                      Created{" "}
                      {module.created_at ? formatDate(module.created_at) : "—"}
                    </span>
                  </p>
                </div>

                <ActionMenu
                  ariaLabel={`Actions for ${module.title}`}
                  items={moduleActions(module)}
                />
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length > 0 ? (
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          onPageChange={setPage}
        />
      ) : null}

      {modal ? (
        <ModuleFormModal
          module={modal.module}
          onClose={() => setModal(null)}
          onSaved={async (_saved, message) => {
            push(message);
            await loadData();
          }}
        />
      ) : null}
    </div>
  );
}
