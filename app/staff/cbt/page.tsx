"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Layers,
} from "lucide-react";
import { Skeleton } from "@/app/components/ui";
import {
  loadAllAssessments,
  loadAssessmentAttempts,
  type Assessment,
  type AssessmentAttempt,
} from "@/app/lib/staff-learning";

// This page is reserved for STANDALONE examinations (promotion, certification,
// organisation-wide tests). Module-owned Pre-/Post-Assessments belong strictly
// inside their course module and must never surface here — so we only ever keep
// assessments with no module.
export default function CBTPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [all, attemptList] = await Promise.all([
          loadAllAssessments(),
          loadAssessmentAttempts(),
        ]);

        setAssessments(all.filter((assessment) => assessment.module == null));
        setAttempts(attemptList);
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load examinations.",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  const standaloneIds = useMemo(
    () => new Set(assessments.map((assessment) => assessment.id)),
    [assessments],
  );
  const submittedAttempts = useMemo(
    () =>
      attempts.filter(
        (attempt) =>
          standaloneIds.has(attempt.assessment) &&
          (attempt.attempt_status ?? "SUBMITTED") === "SUBMITTED",
      ),
    [attempts, standaloneIds],
  );
  const completedIds = useMemo(
    () => new Set(submittedAttempts.map((attempt) => attempt.assessment)),
    [submittedAttempts],
  );
  const availableItems = assessments.filter(
    (assessment) => !completedIds.has(assessment.id),
  );
  const averageScore =
    submittedAttempts.length === 0
      ? 0
      : Math.round(
          submittedAttempts.reduce(
            (total, attempt) => total + Number(attempt.percentage || 0),
            0,
          ) / submittedAttempts.length,
        );

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h2 className="mb-1 text-2xl font-bold text-gray-800">Tests / Exams</h2>
        <p className="text-sm text-gray-500">
          Standalone examinations such as promotion and certification tests.
          Your course pre- and post-assessments live inside each course module.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Clock size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500">Available Exams</p>
            <h3 className="mt-1 text-3xl font-extrabold text-gray-800">
              {availableItems.length}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-50 text-[#1a6b3c]">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500">Completed Exams</p>
            <h3 className="mt-1 text-3xl font-extrabold text-gray-800">
              {completedIds.size}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-yellow-50 text-yellow-600">
            <Award size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500">Average Score</p>
            <h3 className="mt-1 text-3xl font-extrabold text-gray-800">
              {averageScore}%
            </h3>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center gap-2">
          <AlertCircle size={20} className="text-[#1a6b3c]" />
          <h3 className="text-lg font-bold text-gray-800">
            Available Examinations
          </h3>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-2 h-4 w-1/3" />
                <Skeleton className="mt-6 h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : availableItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-gray-400 ring-1 ring-gray-100">
              <ClipboardList size={26} />
            </span>
            <p className="text-base font-semibold text-gray-900">
              No standalone examinations yet
            </p>
            <p className="mt-1.5 max-w-md text-sm text-gray-500">
              This section is reserved for promotion, certification and
              organisation-wide exams. Your course{" "}
              <span className="font-medium text-gray-700">Pre-Assessments</span>{" "}
              and{" "}
              <span className="font-medium text-gray-700">
                Post-Assessments
              </span>{" "}
              are taken inside each course module.
            </p>
            <a
              href="/staff/training"
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#1a6b3c] hover:text-[#1a6b3c]"
            >
              <Layers size={16} /> Go to my courses
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {availableItems.map((assessment) => (
              <div
                key={assessment.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-600 shadow-sm">
                    <FileText size={24} />
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm">
                    Examination
                  </span>
                </div>

                <h4 className="mb-1 text-lg font-bold text-gray-800">
                  {assessment.title}
                </h4>

                <div className="mb-8 mt-4 flex flex-wrap items-center gap-5 text-sm font-medium text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <FileText size={16} />
                    {assessment.questions.length} Questions
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Award size={16} />
                    Pass mark: {assessment.pass_mark}%
                  </span>
                  {assessment.duration ? (
                    <span className="flex items-center gap-1.5">
                      <Clock size={16} />
                      {assessment.duration} min
                    </span>
                  ) : null}
                </div>

                <div className="mt-auto">
                  <button
                    type="button"
                    disabled
                    className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-400"
                  >
                    Opens when scheduled
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Completed exams and scores come directly from your graded attempts on the
        server.
      </p>
    </div>
  );
}
