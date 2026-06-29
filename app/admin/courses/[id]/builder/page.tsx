"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  ImageUp,
  Layers,
  Save,
  Settings2,
  UserCheck,
} from "lucide-react";
import CourseModulesManager from "./CourseModulesManager";
import CourseAssessmentsManager from "./CourseAssessmentsManager";
import { uploadFileToCloudinary } from "@/app/lib/cloudinary-upload";
import {
  extractErrorMessage,
  readApiItem,
  readApiList,
  type Course,
  type Trainer,
} from "@/app/lib/portal-api";

const TABS = [
  { id: "details", label: "Details", icon: Settings2 },
  { id: "modules", label: "Modules", icon: Layers },
  { id: "assessments", label: "Assessments", icon: ClipboardList },
  { id: "people", label: "Resource Persons", icon: UserCheck },
] as const;

type TabId = (typeof TABS)[number]["id"];

function statusBadgeClass(status: Course["status"]) {
  if (status === "PUBLISHED") return "bg-green-100 text-green-700";
  if (status === "ARCHIVED") return "bg-gray-100 text-gray-500";
  return "bg-amber-100 text-amber-700";
}

export default function CourseBuilderPage() {
  const params = useParams();
  const courseId = String(params.id);
  const [activeTab, setActiveTab] = useState<TabId>("details");

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailPublicId, setThumbnailPublicId] = useState("");
  const [thumbnailProgress, setThumbnailProgress] = useState(0);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [status, setStatus] =
    useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("DRAFT");
  const [trainerIds, setTrainerIds] = useState<number[]>([]);
  const [savedTrainerIds, setSavedTrainerIds] = useState<number[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [prerequisiteIds, setPrerequisiteIds] = useState<number[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedPrerequisiteId, setSelectedPrerequisiteId] = useState("");
  const [manualResourcePersonName, setManualResourcePersonName] = useState("");
  const [isAddingResourcePerson, setIsAddingResourcePerson] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [courseResponse, trainerResponse, coursesListResponse] =
          await Promise.all([
            fetch(`/api/training/courses/${courseId}`, {
              cache: "no-store",
            }),
            fetch("/api/training/trainers", { cache: "no-store" }),
            fetch("/api/training/courses", { cache: "no-store" }),
          ]);

        const [coursePayload, trainerPayload, coursesListPayload] =
          await Promise.all([
            courseResponse.json().catch(() => null),
            trainerResponse.json().catch(() => null),
            coursesListResponse.json().catch(() => null),
          ]);

        if (!courseResponse.ok) {
          throw new Error(
            extractErrorMessage(coursePayload, "Could not load this course."),
          );
        }

        const loadedCourse = readApiItem<Course>(coursePayload);

        if (!loadedCourse) {
          throw new Error("The course response was empty.");
        }

        setCourse(loadedCourse);
        setTitle(loadedCourse.title);
        setDescription(loadedCourse.description);
        setThumbnailUrl(loadedCourse.thumbnail_url ?? "");
        setThumbnailPublicId(loadedCourse.cloudinary_public_id ?? "");
        setStatus(loadedCourse.status);
        setTrainerIds(
          loadedCourse.trainers.map((trainer) => trainer.id),
        );
        setSavedTrainerIds(
          loadedCourse.trainers.map((trainer) => trainer.id),
        );
        setPrerequisiteIds(
          loadedCourse.prerequisites_data?.map((prereq) => prereq.id) ?? [],
        );

        if (trainerResponse.ok) {
          setTrainers(readApiList<Trainer>(trainerPayload));
        }

        if (coursesListResponse.ok) {
          setCourses(
            readApiList<Course>(coursesListPayload).filter(
              (courseOption) => String(courseOption.id) !== courseId,
            ),
          );
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
  }, [courseId]);

  const handleThumbnailUpload = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file for the course thumbnail.");
      return;
    }

    setError("");
    setNotice("");
    setIsUploadingThumbnail(true);
    setThumbnailProgress(0);

    try {
      const uploadedFile = await uploadFileToCloudinary(
        file,
        setThumbnailProgress,
        "course",
      );

      setThumbnailUrl(uploadedFile.secure_url);
      setThumbnailPublicId(uploadedFile.public_id);
      setNotice("Thumbnail uploaded. Click Update Course to save it.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload the course thumbnail.",
      );
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

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

  const handleAddPrerequisite = () => {
    if (!selectedPrerequisiteId) return;

    const id = Number(selectedPrerequisiteId);

    setPrerequisiteIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
    setSelectedPrerequisiteId("");
  };

  const handleRemovePrerequisite = (id: number) => {
    setPrerequisiteIds((current) => current.filter((courseId) => courseId !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/training/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          thumbnail_url: thumbnailUrl.trim() || null,
          cloudinary_public_id: thumbnailPublicId || null,
          status,
          trainer_ids: trainerIds,
          prerequisite_ids: prerequisiteIds,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Course could not be updated."),
        );
      }

      const updatedCourse = readApiItem<Course>(payload);
      if (updatedCourse) setCourse(updatedCourse);
      setSavedTrainerIds(trainerIds);
      setNotice("Course updated successfully.");
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
    return <div className="rounded-xl bg-white p-6">Loading course...</div>;
  }

  if (!course) {
    return (
      <div className="rounded-xl bg-white p-6">
        {error || "Course could not be loaded."}
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-5 pb-10">
      <div>
        <Link
          href="/admin/courses"
          className="mb-3 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-[#1a6b3c]"
        >
          <ArrowLeft size={16} /> Back to Courses
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800 sm:text-2xl">
            {course.title}
          </h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusBadgeClass(
              course.status,
            )}`}
          >
            {course.status.toLowerCase()}
          </span>
        </div>
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

      <div className="-mx-1 flex gap-1 overflow-x-auto rounded-xl bg-white p-1.5 shadow-sm">
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
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "details" && (
        <section className="space-y-5 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Course Title
            </label>
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Course Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="h-28 w-full resize-none rounded-lg border px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Course Thumbnail
            </label>
            <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#1a6b3c] px-4 py-2.5 text-sm font-semibold text-[#1a6b3c] transition hover:bg-green-50 sm:w-auto">
              <ImageUp size={18} />
              {isUploadingThumbnail ? "Uploading..." : "Upload image"}
              <input
                type="file"
                accept="image/*"
                disabled={isUploadingThumbnail}
                onChange={handleThumbnailUpload}
                className="sr-only"
              />
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Upload an image. This image appears on the staff course card and course overview.
            </p>
            {isUploadingThumbnail && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[#1a6b3c] transition-all"
                  style={{ width: `${thumbnailProgress}%` }}
                />
              </div>
            )}
            {thumbnailUrl && (
              <div className="mt-3 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnailUrl}
                  alt="Course thumbnail preview"
                  className="h-40 w-full object-cover"
                />
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as
                    | "DRAFT"
                    | "PUBLISHED"
                    | "ARCHIVED",
                )
              }
              className="w-full rounded-lg border px-4 py-2.5 text-sm sm:w-1/2"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Prerequisites
            </label>
            <p className="mb-2 text-xs text-gray-500">
              Trainees must complete these courses before this one unlocks.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <select
                value={selectedPrerequisiteId}
                onChange={(event) => setSelectedPrerequisiteId(event.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 text-sm"
              >
                <option value="">Select a prerequisite course</option>
                {courses
                  .filter((courseOption) => !prerequisiteIds.includes(courseOption.id))
                  .map((courseOption) => (
                    <option key={courseOption.id} value={courseOption.id}>
                      {courseOption.title}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleAddPrerequisite}
                disabled={!selectedPrerequisiteId}
                className="rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#145530]"
              >
                + Add
              </button>
            </div>

            {prerequisiteIds.length > 0 && (
              <ul className="mt-4 space-y-2">
                {prerequisiteIds.map((id) => {
                  const courseOption = courses.find((item) => item.id === id);
                  return (
                    <li
                      key={id}
                      className="flex items-center justify-between rounded-lg border px-4 py-2.5"
                    >
                      <span className="text-sm font-semibold text-gray-800">
                        {courseOption?.title ?? `Course #${id}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePrerequisite(id)}
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1a6b3c] px-6 py-2.5 font-semibold text-white sm:w-auto"
          >
            <Save size={18} />
            {saving ? "Updating..." : "Update Course"}
          </button>
        </section>
      )}

      {activeTab === "modules" && (
        <CourseModulesManager courseId={Number(courseId)} />
      )}

      {activeTab === "assessments" && (
        <CourseAssessmentsManager courseId={Number(courseId)} />
      )}

      {activeTab === "people" && (
        <section className="space-y-5 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <UserCheck className="text-[#1a6b3c]" size={22} />
            <h3 className="text-lg font-bold text-[#1a6b3c]">
              Resource Persons
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <select
              value={selectedTrainerId}
              onChange={(event) => setSelectedTrainerId(event.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 text-sm"
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
              className="rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#145530]"
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
              onChange={(event) => setManualResourcePersonName(event.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg border px-4 py-2.5 text-sm"
            />
            <button
              type="button"
              onClick={handleAddManualResourcePerson}
              disabled={!manualResourcePersonName.trim() || isAddingResourcePerson}
              className="rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#145530]"
            >
              {isAddingResourcePerson ? "Adding..." : "+ Add"}
            </button>
          </div>

          {trainerIds.length === 0 ? (
            <p className="text-sm text-gray-500">No resource persons assigned.</p>
          ) : (
            <ul className="space-y-2">
              {trainerIds.map((id) => {
                const trainer = trainers.find((item) => item.id === id);
                return (
                  <li
                    key={id}
                    className="flex items-center justify-between rounded-lg border px-4 py-2.5"
                  >
                    <span className="font-semibold text-gray-800">
                      {trainer?.full_name ?? `Resource person #${id}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveResourcePerson(id)}
                      className="text-xs font-semibold text-red-600 hover:text-red-700"
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
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1a6b3c] px-6 py-2.5 font-semibold text-white disabled:cursor-not-allowed sm:w-auto"
          >
            <Save size={18} /> Save Resource Persons
          </button>
        </section>
      )}

    </div>
  );
}
