"use client";

import {
  extractErrorMessage,
  readApiItem,
  readApiList,
  type Course,
  type Trainer,
} from "@/app/lib/portal-api";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImageUp, Save } from "lucide-react";
import { uploadFileToCloudinary } from "@/app/lib/cloudinary-upload";

export default function CreateCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailPublicId, setThumbnailPublicId] = useState("");
  const [thumbnailProgress, setThumbnailProgress] = useState(0);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("DRAFT");
  const [trainerIds, setTrainerIds] = useState<number[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [manualResourcePersonName, setManualResourcePersonName] = useState("");
  const [isAddingResourcePerson, setIsAddingResourcePerson] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
      const trainerResponse = await fetch("/api/training/trainers", {
        cache: "no-store",
      });

      if (trainerResponse.ok) {
        setTrainers(readApiList<Trainer>(await trainerResponse.json()));
      }
    };

    void loadOptions();
  }, []);

  const handleThumbnailUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file for the course thumbnail.");
      return;
    }

    setError("");
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
          cloudinary_public_id: thumbnailPublicId || null,
          status,
          trainer_ids: trainerIds,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
  throw new Error(
    extractErrorMessage(
      payload,
      "Course could not be created."
    )
  );
}

const createdCourse = readApiItem<Course>(payload);

if (!createdCourse) {
  throw new Error(
    "The course was created, but its ID was not returned."
  );
}

router.push(
  `/admin/courses/${createdCourse.id}/builder`
);
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
          Create a course before adding modules and learning materials.
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Course Thumbnail (optional)
          </label>
          <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#1a6b3c] px-4 py-2.5 text-sm font-semibold text-[#1a6b3c] transition hover:bg-green-50 md:w-auto">
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
            Upload an image. This appears on the staff course card, course overview, and module header.
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
                className="h-44 w-full object-cover"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select value={status} onChange={(event) => setStatus(event.target.value as "DRAFT" | "PUBLISHED" | "ARCHIVED")} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] md:w-1/2">
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Resource Persons</label>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <select
              value={selectedTrainerId}
              onChange={(event) => setSelectedTrainerId(event.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            >
              <option value="">Select an existing resource person</option>
              {trainers
                .filter((trainer) => !trainerIds.includes(trainer.id))
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

          <p className="mt-3 mb-1 text-xs font-medium text-gray-500">
            Or type a name manually:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <input
              value={manualResourcePersonName}
              onChange={(event) => setManualResourcePersonName(event.target.value)}
              placeholder="Full name"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
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

          {trainerIds.length > 0 && (
            <ul className="mt-4 space-y-2">
              {trainerIds.map((id) => {
                const trainer = trainers.find((item) => item.id === id);
                return (
                  <li
                    key={id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5"
                  >
                    <span className="text-sm font-semibold text-gray-800">
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
        </div>



        <button onClick={handleSave} disabled={isSaving || !title || !description} className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition disabled:cursor-not-allowed">
          <Save size={18} />
          {isSaving ? "Saving..." : "Save Course"}
        </button>
      </div>
    </div>
  );
}
