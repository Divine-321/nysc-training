"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { readApiList, type CourseCategory, type Trainer } from "@/app/lib/portal-api";

export default function CreateCoursePage() {
  const router = useRouter();
  const [hasPreTest, setHasPreTest] = useState(true);
  const [hasPostTest, setHasPostTest] = useState(true);
  const [hasEvaluation, setHasEvaluation] = useState(true);
  const [hasLiveSession, setHasLiveSession] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("DRAFT");
  const [category, setCategory] = useState("");
  const [trainerIds, setTrainerIds] = useState<number[]>([]);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
      const [categoryResponse, trainerResponse] = await Promise.all([
        fetch("/api/training/categories", { cache: "no-store" }),
        fetch("/api/training/trainers", { cache: "no-store" }),
      ]);

      if (categoryResponse.ok) {
        setCategories(readApiList<CourseCategory>(await categoryResponse.json()));
      }

      if (trainerResponse.ok) {
        setTrainers(readApiList<Trainer>(await trainerResponse.json()));
      }
    };

    void loadOptions();
  }, []);

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
          thumbnail_url: thumbnailUrl || null,
          status,
          category: category ? Number(category) : null,
          trainer_ids: trainerIds,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "Course could not be created.");
      }

      router.push("/admin/courses");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Course could not be created.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/admin/courses" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1a6b3c] mb-2 transition">
          <ArrowLeft size={16} /> Back to Courses
        </Link>
        <h2 className="text-2xl font-bold text-gray-800">Create Course</h2>
        <p className="text-sm text-gray-500 mt-1">
          Create a course before adding modules and assessments.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" placeholder="Enter course title" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Course Description</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 h-28 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] resize-none"
            placeholder="Enter course description"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]">
              <option value="">No category</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={status} onChange={(event) => setStatus(event.target.value as "DRAFT" | "PUBLISHED" | "ARCHIVED")} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]">
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL</label>
            <input value={thumbnailUrl} onChange={(event) => setThumbnailUrl(event.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" placeholder="https://..." />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Trainers</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {trainers.map((trainer) => (
              <label key={trainer.id} className="flex items-start gap-3 border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[#1a6b3c] mt-1"
                  checked={trainerIds.includes(trainer.id)}
                  onChange={(event) => {
                    setTrainerIds((current) =>
                      event.target.checked
                        ? [...current, trainer.id]
                        : current.filter((id) => id !== trainer.id)
                    );
                  }}
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-800">{trainer.full_name}</span>
                  <span className="block text-xs text-gray-500">{trainer.designation}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Certification Criteria</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50 transition">
              <input type="checkbox" className="w-4 h-4 accent-[#1a6b3c]" checked={hasLiveSession} onChange={() => setHasLiveSession(!hasLiveSession)} />
              <span className="text-sm font-medium text-gray-700">Live Session</span>
            </label>

            <label className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50 transition">
              <input type="checkbox" className="w-4 h-4 accent-[#1a6b3c]" checked={hasLiveSession} onChange={() => setHasLiveSession(!hasLiveSession)} />
              <span className="text-sm font-medium text-gray-700">Introductory Video</span>
            </label>

            
            <label className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50 transition">
              <input type="checkbox" className="w-4 h-4 accent-[#1a6b3c]" checked={hasPreTest} onChange={() => setHasPreTest(!hasPreTest)} />
              <span className="text-sm font-medium text-gray-700">Pre-Test</span>
            </label>

            <label className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50 transition">
              <input type="checkbox" className="w-4 h-4 accent-[#1a6b3c]" checked={hasPostTest} onChange={() => setHasPostTest(!hasPostTest)} />
              <span className="text-sm font-medium text-gray-700">Post-Test</span>
            </label>

            <label className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50 transition">
              <input type="checkbox" className="w-4 h-4 accent-[#1a6b3c]" checked={hasEvaluation} onChange={() => setHasEvaluation(!hasEvaluation)} />
              <span className="text-sm font-medium text-gray-700">Evaluation</span>
            </label>
          </div>
        </div>

        <button onClick={handleSave} disabled={isSaving || !title || !description} className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed">
          <Save size={18} />
          {isSaving ? "Saving..." : "Save Course"}
        </button>
      </div>
    </div>
  );
}
