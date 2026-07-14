"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Award,
  Calendar,
  CalendarRange,
  ClipboardList,
  FileStack,
  Layers,
  Save,
  Settings2,
  UserCheck,
  Video,
} from "lucide-react";
import CourseModulesManager from "./CourseModulesManager";
import CourseAssessmentsManager from "./CourseAssessmentsManager";
import {
  collectTrainerNames,
  extractErrorMessage,
  readApiItem,
  sortedAssignedModules,
  type Course,
} from "@/app/lib/portal-api";
import { formatDate } from "@/app/lib/format";
import {
  Breadcrumbs,
  btn,
  field,
  fieldLabel,
  Skeleton,
} from "@/app/components/ui";
import { ToastViewport, useToasts } from "@/app/components/ui-interactive";

const TABS = [
  { id: "details", label: "Course Information", icon: Settings2 },
  { id: "modules", label: "Modules", icon: Layers },
  { id: "assessments", label: "Assessments", icon: ClipboardList },
] as const;

type TabId = (typeof TABS)[number]["id"];

// NOTE: trainers are assigned on Modules only (the single source of truth),
// so this builder has no Resource Persons tab — the course's trainers are
// derived from its modules and shown read-only in the header.

export default function CourseBuilderPage() {
  const params = useParams();
  const courseId = String(params.id);
  const [activeTab, setActiveTab] = useState<TabId>("details");
  const { toasts, push } = useToasts();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadCourse = useCallback(async () => {
    const response = await fetch(`/api/training/courses/${courseId}`, {
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        extractErrorMessage(payload, "Could not load this course."),
      );
    }

    const loadedCourse = readApiItem<Course>(payload);

    if (!loadedCourse) {
      throw new Error("The course response was empty.");
    }

    setCourse(loadedCourse);

    return loadedCourse;
  }, [courseId]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedCourse = await loadCourse();

        setTitle(loadedCourse.title);
        setDescription(loadedCourse.description);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load this course.",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [loadCourse]);

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/training/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          // Status was removed from the UI; keep every course published.
          status: "PUBLISHED",
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Course could not be updated."),
        );
      }

      const updatedCourse = readApiItem<Course>(payload);
      if (updatedCourse) {
        setCourse((current) =>
          current ? { ...current, ...updatedCourse } : updatedCourse,
        );
      }
      push("Course updated successfully.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Course could not be updated.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-5">
        <Skeleton className="h-5 w-56" />
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="mt-3 h-4 w-2/3" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        {error || "Course could not be loaded."}
      </div>
    );
  }

  const courseModules = sortedAssignedModules(course);
  const moduleCount = courseModules.length;
  const activityCount = courseModules.reduce(
    (sum, link) => sum + (link.module_details?.activities?.length ?? 0),
    0,
  );
  // Trainers are derived from the course's modules (their single source).
  const trainerNames = collectTrainerNames(
    courseModules.map((link) => link.module_details),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      <ToastViewport toasts={toasts} />

      <Breadcrumbs
        items={[
          { label: "Courses", href: "/admin/courses" },
          { label: course.title },
        ]}
      />

      {/* Header */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {course.title}
          </h1>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <Layers size={13} className="text-gray-400" />
            {moduleCount} module{moduleCount === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileStack size={13} className="text-gray-400" />
            {activityCount} activit{activityCount === 1 ? "y" : "ies"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <UserCheck size={13} className="text-gray-400" />
            {trainerNames.length > 0
              ? trainerNames.join(", ")
              : "No trainer yet"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={13} className="text-gray-400" />
            Created {course.created_at ? formatDate(course.created_at) : "—"}
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Trainers are set on each module — open a module to change who teaches
          it.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Section tabs */}
      <div className="-mx-1 flex gap-1 overflow-x-auto rounded-xl border border-gray-100 bg-white p-1.5 shadow-sm">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition sm:px-4 ${
                isActive
                  ? "bg-[#1a6b3c] text-white"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "details" && (
        <>
          <section className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Course Information
              </h2>
              <p className="text-sm text-gray-500">
                The template staff see when this course is delivered as a
                Training.
              </p>
            </div>

            <div>
              <label className={fieldLabel}>Course Title</label>
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={field}
              />
            </div>

            <div>
              <label className={fieldLabel}>Course Description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={`${field} h-28 resize-none`}
              />
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className={`${btn.primary} w-full sm:w-auto`}
            >
              <Save size={18} />
              {saving ? "Updating..." : "Update Course"}
            </button>
          </section>

          {/* Delivery pointers — live sessions & certificates belong to
              Trainings (Programmes), not to the course template. */}
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-gray-900">Delivery</h2>
            <p className="mt-1 text-sm text-gray-500">
              Live sessions, enrollment, attendance and certificates belong to
              a scheduled <span className="font-semibold">Training</span> of
              this course — not to the template itself.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Link
                href="/admin/cohorts"
                className="group flex items-center gap-3 rounded-xl border border-gray-100 p-4 transition hover:border-gray-200 hover:shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f0f7f3] text-[#1a6b3c]">
                  <CalendarRange size={17} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-gray-900 transition group-hover:text-[#1a6b3c]">
                    Schedule a Training
                  </span>
                  <span className="text-xs text-gray-500">
                    Deliver this course to a cohort
                  </span>
                </span>
              </Link>

              <Link
                href="/admin/cohorts"
                className="group flex items-center gap-3 rounded-xl border border-gray-100 p-4 transition hover:border-gray-200 hover:shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f0f7f3] text-[#1a6b3c]">
                  <Video size={17} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-gray-900 transition group-hover:text-[#1a6b3c]">
                    Live Sessions
                  </span>
                  <span className="text-xs text-gray-500">
                    Managed per Training
                  </span>
                </span>
              </Link>

              <Link
                href="/admin/certificates"
                className="group flex items-center gap-3 rounded-xl border border-gray-100 p-4 transition hover:border-gray-200 hover:shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f0f7f3] text-[#1a6b3c]">
                  <Award size={17} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-gray-900 transition group-hover:text-[#1a6b3c]">
                    Certificates
                  </span>
                  <span className="text-xs text-gray-500">
                    Issued on completion
                  </span>
                </span>
              </Link>
            </div>
          </section>
        </>
      )}

      {activeTab === "modules" && (
        <CourseModulesManager courseId={Number(courseId)} />
      )}

      {activeTab === "assessments" && (
        <CourseAssessmentsManager courseId={Number(courseId)} />
      )}
    </div>
  );
}
