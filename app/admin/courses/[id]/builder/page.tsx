"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Save, UserCheck } from "lucide-react";
import CourseModulesManager from "./CourseModulesManager";
import CourseDeliveryManager from "./CourseDeliveryManager";
import {
  extractErrorMessage,
  readApiItem,
  readApiList,
  type Course,
  type CourseCategory,
  type Trainer,
} from "@/app/lib/portal-api";

export default function CourseBuilderPage() {
  const params = useParams();
  const courseId = String(params.id);

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] =
    useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("DRAFT");
  const [trainerIds, setTrainerIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [courseResponse, categoryResponse, trainerResponse] =
          await Promise.all([
            fetch(`/api/training/courses/${courseId}`, {
              cache: "no-store",
            }),
            fetch("/api/training/categories", { cache: "no-store" }),
            fetch("/api/training/trainers", { cache: "no-store" }),
          ]);

        const [coursePayload, categoryPayload, trainerPayload] =
          await Promise.all([
            courseResponse.json().catch(() => null),
            categoryResponse.json().catch(() => null),
            trainerResponse.json().catch(() => null),
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
        setCategory(
          loadedCourse.category ? String(loadedCourse.category) : "",
        );
        setStatus(loadedCourse.status);
        setTrainerIds(
          loadedCourse.trainers.map((trainer) => trainer.id),
        );

        if (categoryResponse.ok) {
          setCategories(readApiList<CourseCategory>(categoryPayload));
        }

        if (trainerResponse.ok) {
          setTrainers(readApiList<Trainer>(trainerPayload));
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
          status,
          category: category ? Number(category) : null,
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
      if (updatedCourse) setCourse(updatedCourse);
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
    <div className="max-w-6xl space-y-6">
      <div>
        <Link
          href="/admin/courses"
          className="mb-2 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-[#1a6b3c]"
        >
          <ArrowLeft size={16} /> Back to Courses
        </Link>
        <h2 className="text-2xl font-bold text-gray-800">Course Builder</h2>
        <p className="mt-1 text-sm text-gray-500">{course.title}</p>
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

      <section className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[#1a6b3c]">Course Details</h3>

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
            Course Thumbnail URL
          </label>
          <input
            type="url"
            value={thumbnailUrl}
            onChange={(event) => setThumbnailUrl(event.target.value)}
            placeholder="https://res.cloudinary.com/... or another image URL"
            className="w-full rounded-lg border px-4 py-2.5 text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            This image appears on the staff course card and course overview.
          </p>
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

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 text-sm"
            >
              <option value="">No category</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
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
              className="w-full rounded-lg border px-4 py-2.5 text-sm"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-6 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? "Updating..." : "Update Course"}
        </button>
      </section>

      <CourseModulesManager courseId={Number(courseId)} />

      <section className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <UserCheck className="text-[#1a6b3c]" size={22} />
          <h3 className="text-lg font-bold text-[#1a6b3c]">
            Assign Trainers
          </h3>
        </div>

        <div className="space-y-3">
          {trainers.length === 0 ? (
            <p className="text-sm text-gray-500">No trainers available.</p>
          ) : (
            trainers.map((trainer) => (
              <label
                key={trainer.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={trainerIds.includes(trainer.id)}
                  onChange={(event) => {
                    setTrainerIds((current) =>
                      event.target.checked
                        ? [...current, trainer.id]
                        : current.filter((id) => id !== trainer.id),
                    );
                  }}
                  className="h-4 w-4 accent-[#1a6b3c]"
                />
                <span className="font-semibold text-gray-800">
                  {trainer.full_name}
                </span>
              </label>
            ))
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-6 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          <Save size={18} /> Save Trainers
        </button>
      </section>

      <CourseDeliveryManager courseId={Number(courseId)} />
    </div>
  );
}
