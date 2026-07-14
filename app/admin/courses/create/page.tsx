"use client";

import {
  extractErrorMessage,
  readApiItem,
  type Course,
} from "@/app/lib/portal-api";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";

// A course is just a title + description; its modules (and each module's
// trainer) are attached in the builder. Trainers are assigned only on
// modules, so there is no resource-person picker here.

export default function CreateCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/training/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          // The status field was removed from the UI; courses go live
          // immediately so staff can see them once assigned.
          status: "PUBLISHED",
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Course could not be created."),
        );
      }

      const createdCourse = readApiItem<Course>(payload);

      if (!createdCourse) {
        throw new Error("The course was created, but its ID was not returned.");
      }

      router.push(`/admin/courses/${createdCourse.id}/builder`);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Course could not be created.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/admin/courses"
          className="mb-2 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-[#1a6b3c]"
        >
          <ArrowLeft size={16} /> Back to Courses
        </Link>
        <h2 className="text-2xl font-bold text-gray-800">Create Course</h2>
        <p className="mt-1 text-sm text-gray-500">
          Create a course, then attach modules from the library in the builder.
        </p>
      </div>

      <div className="space-y-6 rounded-2xl bg-white p-6 shadow-sm">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Course Title
          </label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            placeholder="Enter course title"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Course Description
          </label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="h-28 w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            placeholder="Enter course description"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || !title || !description}
          className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-6 py-2.5 font-semibold text-white transition hover:bg-[#145530] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={18} />
          {isSaving ? "Saving..." : "Save Course"}
        </button>
      </div>
    </div>
  );
}
