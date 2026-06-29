"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  ClipboardList,
  FileSpreadsheet,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import {
  extractErrorMessage,
  readApiList,
} from "@/app/lib/portal-api";
import { useConfirm } from "@/app/components/useConfirm";

type AssessmentType = "PRE_TEST" | "POST_TEST";

type AssessmentQuestion = {
  id: number;
};

type Assessment = {
  id: number;
  course: number;
  course_title: string;
  type: AssessmentType;
  title: string;
  description: string | null;
  pass_mark: string;
  max_attempts: number;
  questions: AssessmentQuestion[];
};

const emptyForm = {
  type: "PRE_TEST" as AssessmentType,
  title: "",
  description: "",
  pass_mark: "50.00",
  max_attempts: "1",
};

function assessmentTypeLabel(type: AssessmentType) {
  return type === "PRE_TEST" ? "Pre-Test" : "Post-Test";
}

export default function CourseAssessmentsManager({
  courseId,
}: {
  courseId: number;
}) {
  const { confirm, dialog } = useConfirm();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAssessments = useCallback(async () => {
    try {
      const response = await fetch("/api/training/assessments", {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not load assessments."),
        );
      }

      setAssessments(
        readApiList<Assessment>(payload).filter(
          (assessment) => assessment.course === courseId,
        ),
      );
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load assessments.",
      );
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    const fetchData = async () => {
      await loadAssessments();
    };

    void fetchData();
  }, [loadAssessments]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/training/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: courseId,
          type: form.type,
          title: form.title.trim(),
          description: form.description.trim() || null,
          pass_mark: form.pass_mark,
          max_attempts: Number(form.max_attempts),
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not create assessment."),
        );
      }

      setForm(emptyForm);
      setNotice("Assessment created. You can now upload its questions CSV.");
      await loadAssessments();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create assessment.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCsvUpload = async (
    assessment: Assessment,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a CSV file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploadingId(assessment.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/training/assessments/${assessment.id}/upload-questions`,
        {
          method: "POST",
          body: formData,
        },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not upload questions."),
        );
      }

      setNotice(
        `${assessmentTypeLabel(assessment.type)} questions uploaded successfully.`,
      );
      await loadAssessments();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload questions.",
      );
    } finally {
      setUploadingId(null);
    }
  };

  const handleDelete = async (assessment: Assessment) => {
    const confirmed = await confirm(
      `Delete "${assessment.title}" and its questions?`,
      { danger: true },
    );

    if (!confirmed) return;

    setDeletingId(assessment.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/training/assessments/${assessment.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          extractErrorMessage(payload, "Could not delete assessment."),
        );
      }

      setNotice("Assessment deleted.");
      await loadAssessments();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete assessment.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <ClipboardList className="text-[#1a6b3c]" size={22} />
        <div>
          <h3 className="text-lg font-bold text-[#1a6b3c]">
            Assessments
          </h3>
          <p className="text-sm text-gray-500">
            Create pre-test/post-test and upload questions with CSV.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {notice}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="grid gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 md:grid-cols-2"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Assessment type
          </label>
          <select
            value={form.type}
            onChange={(event) =>
              setForm({
                ...form,
                type: event.target.value as AssessmentType,
              })
            }
            className="w-full rounded-lg border px-4 py-2.5 text-sm"
          >
            <option value="PRE_TEST">Pre-Test</option>
            <option value="POST_TEST">Post-Test</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            required
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
            placeholder="For example: Course Pre-Test"
            className="w-full rounded-lg border px-4 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Pass mark (%)
          </label>
          <input
            required
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.pass_mark}
            onChange={(event) =>
              setForm({ ...form, pass_mark: event.target.value })
            }
            className="w-full rounded-lg border px-4 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Max attempts
          </label>
          <input
            required
            type="number"
            min="1"
            value={form.max_attempts}
            onChange={(event) =>
              setForm({ ...form, max_attempts: event.target.value })
            }
            className="w-full rounded-lg border px-4 py-2.5 text-sm"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            className="h-24 w-full rounded-lg border px-4 py-3 text-sm"
            placeholder="Optional instructions for staff."
          />
        </div>

        <button
          disabled={saving || !form.title.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Plus size={18} />
          {saving ? "Creating..." : "Create assessment"}
        </button>
      </form>

      <div className="rounded-xl border border-gray-100">
        <div className="border-b border-gray-100 p-4">
          <h4 className="font-semibold text-gray-800">
            Existing assessments
          </h4>
          <p className="mt-1 text-xs text-gray-500">
            CSV headers: question_text, points, option_a, option_b, option_c,
            option_d, correct_option
          </p>
        </div>

        {loading ? (
          <p className="p-4 text-sm text-gray-500">Loading assessments...</p>
        ) : assessments.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">
            No assessments have been created for this course.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {assessments.map((assessment) => (
              <div
                key={assessment.id}
                className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#1a6b3c]">
                    {assessmentTypeLabel(assessment.type)}
                  </p>
                  <h5 className="mt-1 font-semibold text-gray-800">
                    {assessment.title}
                  </h5>
                  <p className="mt-1 text-sm text-gray-500">
                    Pass mark: {assessment.pass_mark}% • Max attempts:{" "}
                    {assessment.max_attempts} • Questions:{" "}
                    {assessment.questions?.length ?? 0}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#1a6b3c] px-4 py-2 text-sm font-semibold text-[#1a6b3c] hover:bg-green-50">
                    <Upload size={16} />
                    {uploadingId === assessment.id
                      ? "Uploading..."
                      : "Upload CSV"}
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      disabled={uploadingId === assessment.id}
                      onChange={(event) =>
                        handleCsvUpload(assessment, event)
                      }
                      className="sr-only"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => handleDelete(assessment)}
                    disabled={deletingId === assessment.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    {deletingId === assessment.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        <div className="mb-2 flex items-center gap-2 font-semibold text-gray-800">
          <FileSpreadsheet size={18} />
          CSV example
        </div>
        <code className="block overflow-x-auto whitespace-pre rounded-lg bg-white p-3 text-xs">
          question_text,points,option_a,option_b,option_c,option_d,correct_option{"\n"}
          What does NYSC stand for?,1,National Youth Service Corps,National Youth Safety Corps,Nigerian Youth Staff Council,National Young Service Club,A
        </code>
      </div>

      {dialog}
    </section>
  );
}
