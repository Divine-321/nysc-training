"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  Star,
} from "lucide-react";
import {
  loadStaffCourse,
  type StaffCourse,
} from "@/app/lib/staff-learning";
import { extractErrorMessage } from "@/app/lib/portal-api";

export default function EvaluationPage() {
  const params = useParams();
  const courseId = Number(params.id);
  const [staffCourse, setStaffCourse] = useState<StaffCourse | null>(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const course = await loadStaffCourse(courseId);
        setStaffCourse(course);

        if (course?.enrollment.evaluation) {
          setSubmitted(true);
          setRating(course.enrollment.evaluation.rating);
          setFeedback(course.enrollment.evaluation.feedback ?? "");
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load evaluation.",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [courseId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!staffCourse) {
      setError("Course enrollment was not found.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/training/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollment: staffCourse.enrollment.id,
          rating,
          feedback: feedback.trim() || null,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not submit evaluation."),
        );
      }

      setSubmitted(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not submit evaluation.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-3xl rounded-xl bg-white p-6 shadow-sm">
        <h1 className="mb-3 text-2xl font-bold text-[#1a6b3c]">
          End-of-Course Evaluation
        </h1>

        <p className="mb-6 text-sm text-gray-600">
          Please provide feedback about this course.
        </p>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Loading evaluation...</p>
        ) : submitted ? (
          <div className="rounded-xl bg-[#f0f7f3] p-5 font-semibold text-[#1a6b3c]">
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle2 size={20} />
              Thank you. Your feedback has been submitted.
            </div>
            <p className="text-sm font-normal text-gray-600">
              Rating: {rating}/5
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">
                How useful was this course?
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={`rounded-lg border p-3 transition ${
                      value <= rating
                        ? "border-[#1a6b3c] bg-green-50 text-[#1a6b3c]"
                        : "border-gray-200 text-gray-300"
                    }`}
                  >
                    <Star
                      size={20}
                      fill={value <= rating ? "currentColor" : "none"}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Any comments?
              </label>
              <textarea
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                className="h-32 w-full rounded-lg border px-4 py-2"
                placeholder="Write your feedback here..."
              />
            </div>

            <button
              disabled={saving}
              className="rounded-lg bg-[#1a6b3c] px-6 py-2 font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Submitting..." : "Submit Evaluation"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
