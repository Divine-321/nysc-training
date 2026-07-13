"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  ClipboardList,
  FileStack,
  Layers,
  ListChecks,
  Pencil,
  RotateCcw,
  Target,
  Timer,
  Trash2,
} from "lucide-react";
import {
  extractErrorMessage,
  readApiItem,
  readApiList,
  type Course,
  type LibraryModule,
} from "@/app/lib/portal-api";
import { formatDate } from "@/app/lib/format";
import { useConfirm } from "@/app/components/useConfirm";
import {
  Badge,
  Breadcrumbs,
  btn,
  EmptyState,
  Skeleton,
  StatCard,
} from "@/app/components/ui";
import {
  ActionMenu,
  ToastViewport,
  useToasts,
} from "@/app/components/ui-interactive";
import ModuleActivitiesManager, {
  type Activity,
} from "@/app/admin/courses/[id]/builder/ModuleDocumentsManager";
import ModuleFormModal from "../ModuleFormModal";

type ModuleDetail = LibraryModule & { activities?: Activity[] };

type ModuleAssessment = {
  id: number;
  module: number | null;
  module_title: string;
  type: "PRE_TEST" | "POST_TEST";
  title: string;
  description: string | null;
  pass_mark: string;
  max_attempts: number | null;
  duration?: number;
  questions: { id: number }[];
};

export default function ModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = Number(params.id);
  const { confirm, dialog } = useConfirm();
  const { toasts, push } = useToasts();

  const [module, setModule] = useState<ModuleDetail | null>(null);
  const [assessments, setAssessments] = useState<ModuleAssessment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [moduleResponse, assessmentsResponse, coursesResponse] =
        await Promise.all([
          fetch(`/api/training/modules/${moduleId}`, { cache: "no-store" }),
          fetch("/api/training/assessments", { cache: "no-store" }),
          fetch("/api/training/courses", { cache: "no-store" }),
        ]);

      const modulePayload = await moduleResponse.json().catch(() => null);

      if (!moduleResponse.ok) {
        throw new Error(
          extractErrorMessage(modulePayload, "Could not load this module."),
        );
      }

      setModule(readApiItem<ModuleDetail>(modulePayload));

      // Assessments and course usage enrich the page — tolerate failures.
      const assessmentsPayload = await assessmentsResponse
        .json()
        .catch(() => null);
      const coursesPayload = await coursesResponse.json().catch(() => null);

      setAssessments(
        assessmentsResponse.ok
          ? readApiList<ModuleAssessment>(assessmentsPayload).filter(
              (assessment) => assessment.module === moduleId,
            )
          : [],
      );
      setCourses(
        coursesResponse.ok ? readApiList<Course>(coursesPayload) : [],
      );

      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load this module.",
      );
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    const fetchData = async () => {
      await loadData();
    };

    void fetchData();
  }, [loadData]);

  const usedIn = useMemo(
    () =>
      courses.filter((course) =>
        (course.assigned_modules ?? []).some(
          (link) => link.module === moduleId,
        ),
      ),
    [courses, moduleId],
  );

  const handleDelete = async () => {
    if (!module) return;

    const usageText =
      usedIn.length > 0
        ? ` It is currently attached to ${usedIn.length} course${
            usedIn.length === 1 ? "" : "s"
          } (${usedIn
            .slice(0, 3)
            .map((course) => course.title)
            .join(", ")}${usedIn.length > 3 ? ", …" : ""}).`
        : "";

    const confirmed = await confirm(
      `Delete "${module.title}" from the library?${usageText} This permanently removes the module and all of its activities from EVERY course that uses it. This cannot be undone.`,
      { danger: true },
    );

    if (!confirmed) return;

    const response = await fetch(`/api/training/modules/${moduleId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      push(`Could not delete module (HTTP ${response.status}).`, "error");
      return;
    }

    router.replace("/admin/modules");
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-5 w-56" />
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex gap-5">
            <Skeleton className="h-24 w-24 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-1.5 h-4 w-2/3" />
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Breadcrumbs
          items={[
            { label: "Modules", href: "/admin/modules" },
            { label: "Not found" },
          ]}
        />
        <EmptyState
          icon={Layers}
          title="Module not found"
          description={error || "This module may have been deleted."}
          action={
            <Link href="/admin/modules" className={btn.secondary}>
              Back to Module Library
            </Link>
          }
        />
      </div>
    );
  }

  const activities = module.activities ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      {dialog}
      <ToastViewport toasts={toasts} />

      <Breadcrumbs
        items={[
          { label: "Modules", href: "/admin/modules" },
          { label: module.title },
        ]}
      />

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Overview */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#f0f7f3] sm:h-28 sm:w-28">
            {module.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={module.thumbnail_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[#1a6b3c]/40">
                <Layers size={30} />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                {module.title}
              </h1>
              <Badge variant="blue">Reusable module</Badge>
            </div>

            <p className="mt-2 max-w-2xl text-sm text-gray-500">
              {module.description || "No description yet."}
            </p>

            <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
              <Calendar size={13} />
              Created{" "}
              {module.created_at ? formatDate(module.created_at) : "—"}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className={btn.secondary}
            >
              <Pencil size={15} /> Edit
            </button>
            <ActionMenu
              ariaLabel="Module actions"
              items={[
                {
                  label: "Delete from library",
                  icon: Trash2,
                  danger: true,
                  onSelect: () => void handleDelete(),
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Activities"
          value={activities.length}
          icon={FileStack}
          hint="Learning content items"
        />
        <StatCard
          label="Assessments"
          value={assessments.length}
          icon={ClipboardList}
          hint="Pre/post-tests on this module"
        />
        <StatCard
          label="Used in"
          value={usedIn.length}
          icon={BookOpen}
          hint={
            usedIn.length === 1 ? "course uses this module" : "courses use this module"
          }
        />
      </div>

      {/* Activities & documents */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <FileStack size={20} className="text-[#1a6b3c]" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">Activities</h2>
            <p className="text-sm text-gray-500">
              The content staff complete in order — videos, PDFs, slides,
              audio, text lessons, links and assessments.
            </p>
          </div>
        </div>

        <ModuleActivitiesManager
          moduleId={module.id}
          activities={activities}
          onChanged={loadData}
        />
      </section>

      {/* Assessments */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardList size={20} className="text-[#1a6b3c]" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">Assessments</h2>
            <p className="text-sm text-gray-500">
              Assessments belong to this module and travel with it into every
              course. They are created from a course builder&apos;s
              Assessments tab.
            </p>
          </div>
        </div>

        {/* TODO: add a module-scoped assessment manager here so assessments
            can be created without opening a course builder (the backend
            already supports it — POST /assessments with {module}). */}

        {assessments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-4 text-sm text-gray-500">
            No assessments on this module yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {assessments.map((assessment) => (
              <div
                key={assessment.id}
                className="rounded-xl border border-gray-100 p-4 transition hover:border-gray-200 hover:shadow-sm"
              >
                <Badge
                  variant={assessment.type === "POST_TEST" ? "green" : "blue"}
                >
                  {assessment.type === "POST_TEST" ? "Post-test" : "Pre-test"}
                </Badge>
                <h3 className="mt-2 font-semibold text-gray-900">
                  {assessment.title}
                </h3>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium text-gray-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Target size={13} className="text-gray-400" />
                    Pass mark {assessment.pass_mark}%
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <RotateCcw size={13} className="text-gray-400" />
                    {assessment.max_attempts
                      ? `${assessment.max_attempts} attempt${
                          assessment.max_attempts === 1 ? "" : "s"
                        }`
                      : "Unlimited attempts"}
                  </span>
                  {assessment.duration ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Timer size={13} className="text-gray-400" />
                      {assessment.duration} min
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5">
                    <ListChecks size={13} className="text-gray-400" />
                    {assessment.questions?.length ?? 0} question
                    {(assessment.questions?.length ?? 0) === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Used in courses */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen size={20} className="text-[#1a6b3c]" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Used in courses
            </h2>
            <p className="text-sm text-gray-500">
              Removing this module from a course never deletes it from the
              library.
            </p>
          </div>
        </div>

        {usedIn.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-4 text-sm text-gray-500">
            Not attached to any course yet — open a course builder to attach
            it.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {usedIn.map((course) => (
              <Link
                key={course.id}
                href={`/admin/courses/${course.id}/builder`}
                className="group flex items-center gap-3 rounded-xl border border-gray-100 p-4 transition hover:border-gray-200 hover:shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f0f7f3] text-[#1a6b3c]">
                  <BookOpen size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-gray-900 transition group-hover:text-[#1a6b3c]">
                    {course.title}
                  </span>
                  <span className="text-xs text-gray-500">
                    {(course.assigned_modules ?? []).length} module
                    {(course.assigned_modules ?? []).length === 1 ? "" : "s"}
                  </span>
                </span>
                <ArrowRight
                  size={15}
                  className="shrink-0 text-gray-300 transition group-hover:text-[#1a6b3c]"
                />
              </Link>
            ))}
          </div>
        )}
      </section>

      {editOpen ? (
        <ModuleFormModal
          module={module}
          onClose={() => setEditOpen(false)}
          onSaved={async (_saved, message) => {
            push(message);
            await loadData();
          }}
        />
      ) : null}
    </div>
  );
}
