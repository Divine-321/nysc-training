"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  PlayCircle,
  Timer,
} from "lucide-react";
import { Skeleton } from "@/app/components/ui";
import {
  loadAssessmentAttempts,
  loadAssessments,
  loadStaffCourses,
  type Assessment,
  type AssessmentAttempt,
  type StaffCourse,
} from "@/app/lib/staff-learning";

type AvailableAssessment = {
  assessment: Assessment;
  staffCourse: StaffCourse;
};

function assessmentRoute(courseId: number, type: Assessment["type"]) {
  return `/staff/course/${courseId}/assessment/${
    type === "POST_TEST" ? "post-test" : "pre-test"
  }`;
}

export default function CBTPage() {
  const [items, setItems] = useState<AvailableAssessment[]>([]);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const staffCourses = await loadStaffCourses();
        const assessmentGroups = await Promise.all(
          staffCourses.map(async (staffCourse) => {
            const courseId = staffCourse.course?.id ?? staffCourse.cohortCourse?.course;

            if (!courseId) return [];

            const assessments = await loadAssessments(courseId).catch(() => []);

            return assessments.map((assessment) => ({
              assessment,
              staffCourse,
            }));
          }),
        );

        setItems(assessmentGroups.flat());
        setAttempts(await loadAssessmentAttempts());
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
    };

    void fetchData();
  }, []);

  const submittedAttempts = useMemo(
    () =>
      attempts.filter(
        (attempt) => (attempt.attempt_status ?? "SUBMITTED") === "SUBMITTED",
      ),
    [attempts],
  );
  const completedAssessmentIds = useMemo(
    () => new Set(submittedAttempts.map((attempt) => attempt.assessment)),
    [submittedAttempts],
  );
  const availableItems = items.filter(
    (item) => !completedAssessmentIds.has(item.assessment.id),
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
        <h2 className="mb-1 text-2xl font-bold text-gray-800">
          Tests / Exams
        </h2>
        <p className="text-sm text-gray-500">
          Access assessments attached to your assigned courses.
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
            <p className="text-sm font-bold text-gray-500">Available Tests</p>
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
            <p className="text-sm font-bold text-gray-500">Completed Tests</p>
            <h3 className="mt-1 text-3xl font-extrabold text-gray-800">
              {completedAssessmentIds.size}
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
            Available Assessments
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
                <Skeleton className="mt-6 h-11 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : availableItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400 ring-1 ring-gray-100">
              <ClipboardList size={22} />
            </span>
            <p className="text-sm font-semibold text-gray-900">
              No available assessments right now
            </p>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              Assessments appear here when your assigned courses include a
              pre-test or post-test you haven&apos;t completed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {availableItems.map(({ assessment, staffCourse }) => {
              const courseId =
                staffCourse.course?.id ?? staffCourse.cohortCourse?.course;

              return (
                <div
                  key={assessment.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="rounded-xl bg-blue-50 p-3 text-blue-600 shadow-sm">
                      <Timer size={24} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${
                          assessment.type === "POST_TEST"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {assessment.type === "POST_TEST"
                          ? "Post-test"
                          : "Pre-test"}
                      </span>
                      <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700 shadow-sm">
                        Available
                      </span>
                    </div>
                  </div>

                  <h4 className="mb-1 text-lg font-bold text-gray-800">
                    {assessment.title}
                  </h4>
                  <p className="mb-5 text-sm font-bold text-[#1a6b3c]">
                    {assessment.module_title ||
                      assessment.course_title ||
                      staffCourse.enrollment.course_title}
                  </p>

                  <div className="mb-8 flex flex-wrap items-center gap-5 text-sm font-medium text-gray-500">
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
                    {courseId && (
                      <Link
                        href={assessmentRoute(courseId, assessment.type)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a6b3c] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#145530]"
                      >
                        <PlayCircle size={18} />
                        Start Assessment
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Completed tests and scores come from the backend attempts API. Until
        that endpoint is live, every assessment shows as available and the
        stats above start from zero.
      </p>
    </div>
  );
}
