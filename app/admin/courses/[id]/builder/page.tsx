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
  Tag,
  UserCheck,
  Video,
} from "lucide-react";
import CourseModulesManager from "./CourseModulesManager";
import CourseAssessmentsManager from "./CourseAssessmentsManager";
import {
  extractErrorMessage,
  readApiItem,
  readApiList,
  type Course,
  type Trainer,
} from "@/app/lib/portal-api";
import { formatDate } from "@/app/lib/format";
import {
  Badge,
  Breadcrumbs,
  btn,
  field,
  fieldLabel,
  Skeleton,
} from "@/app/components/ui";
import { ToastViewport, useToasts } from "@/app/components/ui-interactive";

type CourseCategory = {
  id: number;
  name: string;
};

const TABS = [
  { id: "details", label: "Course Information", icon: Settings2 },
  { id: "modules", label: "Modules", icon: Layers },
  { id: "assessments", label: "Assessments", icon: ClipboardList },
  { id: "people", label: "Resource Persons", icon: UserCheck },
] as const;

type TabId = (typeof TABS)[number]["id"];

const STATUS_BADGE: Record<
  Course["status"],
  { label: string; variant: "green" | "amber" | "gray" }
> = {
  PUBLISHED: { label: "Published", variant: "green" },
  DRAFT: { label: "Draft", variant: "amber" },
  ARCHIVED: { label: "Archived", variant: "gray" },
};

// NOTE(backend): the Course serializer no longer carries thumbnail_url /
// cloudinary_public_id or prerequisites — those form fields were removed
// here to match. Restore them only if the backend re-adds the fields.

export default function CourseBuilderPage() {
  const params = useParams();
  const courseId = String(params.id);
  const [activeTab, setActiveTab] = useState<TabId>("details");
  const { toasts, push } = useToasts();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [trainerIds, setTrainerIds] = useState<number[]>([]);
  const [savedTrainerIds, setSavedTrainerIds] = useState<number[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [manualResourcePersonName, setManualResourcePersonName] = useState("");
  const [isAddingResourcePerson, setIsAddingResourcePerson] = useState(false);
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
        const [loadedCourse, trainerResponse, categoryResponse] =
          await Promise.all([
            loadCourse(),
            fetch("/api/training/trainers", { cache: "no-store" }),
            fetch("/api/training/categories", { cache: "no-store" }),
          ]);

        setTitle(loadedCourse.title);
        setDescription(loadedCourse.description);
        setCategoryId(
          loadedCourse.category != null ? String(loadedCourse.category) : "",
        );
        setTrainerIds(loadedCourse.trainers.map((trainer) => trainer.id));
        setSavedTrainerIds(loadedCourse.trainers.map((trainer) => trainer.id));

        const trainerPayload = await trainerResponse.json().catch(() => null);
        const categoryPayload = await categoryResponse
          .json()
          .catch(() => null);

        if (trainerResponse.ok) {
          setTrainers(readApiList<Trainer>(trainerPayload));
        }

        if (categoryResponse.ok) {
          setCategories(readApiList<CourseCategory>(categoryPayload));
        }
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

  const handleAddExistingResourcePerson = () => {
    if (!selectedTrainerId) return;

    const id = Number(selectedTrainerId);

    setTrainerIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
    setSelectedTrainerId("");
  };

  const handleAddManualResourcePerson = async () => {
    const name = manualResourcePersonName.trim();
    if (!name) return;

    setError("");
    setIsAddingResourcePerson(true);

    try {
      const response = await fetch("/api/training/trainers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name,
          designation: "Resource Person",
          organization: "NYSC",
          bio: null,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not add resource person."),
        );
      }

      const newTrainer = readApiItem<Trainer>(payload);

      if (newTrainer) {
        setTrainers((current) => [...current, newTrainer]);
        setTrainerIds((current) => [...current, newTrainer.id]);
      }

      setManualResourcePersonName("");
    } catch (addError) {
      setError(
        addError instanceof Error
          ? addError.message
          : "Could not add resource person.",
      );
    } finally {
      setIsAddingResourcePerson(false);
    }
  };

  const handleRemoveResourcePerson = (id: number) => {
    setTrainerIds((current) => current.filter((trainerId) => trainerId !== id));
  };

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
          category: categoryId ? Number(categoryId) : null,
          trainer_ids: trainerIds,
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
      setSavedTrainerIds(trainerIds);
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

  const statusBadge = STATUS_BADGE[course.status] ?? STATUS_BADGE.DRAFT;
  const moduleCount = course.assigned_modules?.length ?? 0;
  const activityCount = (course.assigned_modules ?? []).reduce(
    (sum, link) => sum + (link.module_details?.activities?.length ?? 0),
    0,
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
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-gray-500">
          {course.category_name ? (
            <span className="inline-flex items-center gap-1.5">
              <Tag size={13} className="text-gray-400" />
              {course.category_name}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Layers size={13} className="text-gray-400" />
            {moduleCount} module{moduleCount === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileStack size={13} className="text-gray-400" />
            {activityCount} activit{activityCount === 1 ? "y" : "ies"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={13} className="text-gray-400" />
            Created {course.created_at ? formatDate(course.created_at) : "—"}
          </span>
        </div>
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

            <div>
              <label className={fieldLabel}>Category</label>
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className={`${field} sm:w-1/2`}
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
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

      {activeTab === "people" && (
        <section className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Resource Persons
            </h2>
            <p className="text-sm text-gray-500">
              The trainers shown against this course.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <select
              value={selectedTrainerId}
              onChange={(event) => setSelectedTrainerId(event.target.value)}
              className={field}
            >
              <option value="">Select an existing resource person</option>
              {trainers
                .filter((trainer) => !savedTrainerIds.includes(trainer.id))
                .map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.full_name}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={handleAddExistingResourcePerson}
              disabled={!selectedTrainerId}
              className={btn.primary}
            >
              + Add
            </button>
          </div>

          <p className="mb-1 text-xs font-medium text-gray-500">
            Or type a name manually:
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={manualResourcePersonName}
              onChange={(event) =>
                setManualResourcePersonName(event.target.value)
              }
              placeholder="Full name"
              className={field}
            />
            <button
              type="button"
              onClick={handleAddManualResourcePerson}
              disabled={
                !manualResourcePersonName.trim() || isAddingResourcePerson
              }
              className={btn.primary}
            >
              {isAddingResourcePerson ? "Adding..." : "+ Add"}
            </button>
          </div>

          {trainerIds.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-4 text-sm text-gray-500">
              No resource persons assigned.
            </p>
          ) : (
            <ul className="space-y-2">
              {trainerIds.map((id) => {
                const trainer = trainers.find((item) => item.id === id);
                return (
                  <li
                    key={id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 transition hover:border-gray-200"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0f7f3] text-[#1a6b3c]">
                        <UserCheck size={15} />
                      </span>
                      <span className="font-semibold text-gray-800">
                        {trainer?.full_name ?? `Resource person #${id}`}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveResourcePerson(id)}
                      className="text-xs font-semibold text-red-600 transition hover:text-red-700"
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`${btn.primary} w-full sm:w-auto`}
          >
            <Save size={18} /> {saving ? "Saving..." : "Save Resource Persons"}
          </button>
        </section>
      )}
    </div>
  );
}
