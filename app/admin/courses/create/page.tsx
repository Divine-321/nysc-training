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
import { ArrowLeft, Save } from "lucide-react";

// NOTE(backend): the Course serializer only accepts title, description,
// status, category and trainer_ids. Category and prerequisites were removed
// from this form on request, and the old thumbnail upload was removed
// because the backend no longer stores a course thumbnail.

export default function CreateCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
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
          // The status field was removed from the UI; courses go live
          // immediately so staff can see them once assigned.
          status: "PUBLISHED",
          trainer_ids: trainerIds,
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
    <div className="max-w-4xl space-y-6">
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

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Resource Persons
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <select
              value={selectedTrainerId}
              onChange={(event) => setSelectedTrainerId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
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

          <p className="mb-1 mt-3 text-xs font-medium text-gray-500">
            Or type a name manually:
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={manualResourcePersonName}
              onChange={(event) =>
                setManualResourcePersonName(event.target.value)
              }
              placeholder="Full name"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            />
            <button
              type="button"
              onClick={handleAddManualResourcePerson}
              disabled={
                !manualResourcePersonName.trim() || isAddingResourcePerson
              }
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

        <button
          onClick={handleSave}
          disabled={isSaving || !title || !description}
          className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-6 py-2.5 font-semibold text-white transition hover:bg-[#145530] disabled:cursor-not-allowed"
        >
          <Save size={18} />
          {isSaving ? "Saving..." : "Save Course"}
        </button>
      </div>
    </div>
  );
}
