"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  FileStack,
  FolderPlus,
  Layers,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
} from "lucide-react";
import {
  collectTrainerNames,
  extractErrorMessage,
  readApiList,
  sortedAssignedModules,
  type Course,
} from "@/app/lib/portal-api";
import { formatDate } from "@/app/lib/format";
import { useConfirm } from "@/app/components/useConfirm";
import {
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

// Course status is not admin-manageable (everything saves as PUBLISHED),
// so no status badge or filter is shown here.
type SortKey = "newest" | "oldest" | "title" | "modules";

const PAGE_SIZE = 9;

// NOTE(backend): the Course serializer has no thumbnail or updated_at fields,
// so course cards show neither — only what the API actually returns.

async function readJsonResponse(response: Response) {
  return response.json().catch(() => null);
}

export default function AdminCoursesPage() {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const { toasts, push } = useToasts();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const loadData = async () => {
      try {
        const coursesResponse = await fetch("/api/training/courses", {
          cache: "no-store",
        });
        const coursesPayload = await readJsonResponse(coursesResponse);

        if (!coursesResponse.ok) {
          throw new Error(
            extractErrorMessage(coursesPayload, "Could not load courses."),
          );
        }

        // Each course embeds its assigned_modules — no second fetch needed.
        setCourses(readApiList<Course>(coursesPayload));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load courses.",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    const matching = courses.filter((course) => {
      if (query) {
        const haystack =
          `${course.title} ${course.description ?? ""} ${course.category_name ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });

    return matching.sort((first, second) => {
      if (sort === "title") return first.title.localeCompare(second.title);
      if (sort === "modules") {
        return (
          (second.assigned_modules?.length ?? 0) -
          (first.assigned_modules?.length ?? 0)
        );
      }
      if (sort === "oldest") {
        return (first.created_at ?? "").localeCompare(second.created_at ?? "");
      }
      // newest
      return (second.created_at ?? "").localeCompare(first.created_at ?? "");
    });
  }, [courses, search, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handleDelete = async (course: Course) => {
    const moduleCount = course.assigned_modules?.length ?? 0;

    const confirmed = await confirm(
      `Delete "${course.title}"? ${
        moduleCount > 0
          ? `Its ${moduleCount} attached module${
              moduleCount === 1 ? "" : "s"
            } stay in the Module Library and are not deleted. `
          : ""
      }This cannot be undone.`,
      { danger: true },
    );

    if (!confirmed) return;

    const response = await fetch(`/api/training/courses/${course.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      push(`Could not delete course (HTTP ${response.status}).`, "error");
      return;
    }

    setCourses((current) => current.filter((item) => item.id !== course.id));
    push("Course deleted.");
  };

  const hasFilters = search.trim() !== "";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {dialog}
      <ToastViewport toasts={toasts} />

      <PageHeader
        title="Courses"
        subtitle="Reusable course templates. Attach modules from the library, then deliver each course to a cohort as a Training."
        actions={
          <Link href="/admin/courses/create" className={btn.primary}>
            <Plus size={18} /> New Course
          </Link>
        }
      />

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search courses…"
          className="w-full lg:max-w-sm"
        />

        <div className="flex flex-1 flex-wrap items-center gap-2">
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as SortKey);
              setPage(1);
            }}
            aria-label="Sort courses"
            className={`${field} w-auto`}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title A–Z</option>
            <option value="modules">Most modules</option>
          </select>

          {!loading && courses.length > 0 ? (
            <p className="ml-auto text-xs font-medium text-gray-400">
              {filtered.length} of {courses.length} course
              {courses.length === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-1.5 h-4 w-2/3" />
              <Skeleton className="mt-6 h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="No courses yet"
          description="Create your first course, then attach modules from the library."
          action={
            <Link href="/admin/courses/create" className={btn.primary}>
              <Plus size={18} /> New Course
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses match"
          description="Try a different search term or clear the filters."
          action={
            hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className={btn.secondary}
              >
                Clear search
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((course) => {
            const courseModules = sortedAssignedModules(course);
            const moduleCount = courseModules.length;
            const activityCount = courseModules.reduce(
              (sum, link) =>
                sum + (link.module_details?.activities?.length ?? 0),
              0,
            );
            const trainers =
              collectTrainerNames(
                courseModules.map((link) => link.module_details),
              ).join(", ") || "No trainer assigned";
            const builderHref = `/admin/courses/${course.id}/builder`;

            return (
              <div
                key={course.id}
                className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f0f7f3] text-[#1a6b3c]">
                    <BookOpen size={20} />
                  </div>
                </div>

                <Link href={builderHref} className="min-w-0">
                  <h3 className="truncate font-semibold text-gray-900 transition group-hover:text-[#1a6b3c]">
                    {course.title}
                  </h3>
                </Link>
                <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-gray-500">
                  {course.description || "No description yet."}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-gray-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Layers size={14} className="text-gray-400" />
                    {moduleCount} module{moduleCount === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FileStack size={14} className="text-gray-400" />
                    {activityCount} activit{activityCount === 1 ? "y" : "ies"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={14} className="text-gray-400" />
                    {course.created_at ? formatDate(course.created_at) : "—"}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                  <UserCheck size={13} className="shrink-0" />
                  <span className="truncate">{trainers}</span>
                </div>

                <div className="mt-5 flex items-center gap-2 border-t border-gray-100 pt-4">
                  <Link href={builderHref} className={`flex-1 ${btn.secondary}`}>
                    Open builder <ArrowRight size={15} />
                  </Link>
                  <ActionMenu
                    ariaLabel={`Actions for ${course.title}`}
                    items={[
                      {
                        label: "Open builder",
                        icon: Pencil,
                        onSelect: () => router.push(builderHref),
                      },
                      {
                        label: "Delete course",
                        icon: Trash2,
                        danger: true,
                        onSelect: () => void handleDelete(course),
                      },
                    ]}
                  />
                </div>
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
    </div>
  );
}
