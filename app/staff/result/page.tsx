"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  FileText,
  Search,
  Star,
  XCircle,
} from "lucide-react";
import {
  loadAssessmentAttempts,
  loadStaffCourses,
  type Assessment,
  type AssessmentAttempt,
} from "@/app/lib/staff-learning";
import { readApiList } from "@/app/lib/portal-api";
import AttemptStatusChip from "@/app/components/AttemptStatusChip";
import { formatDateTime as formatDate } from "@/app/lib/format";

function assessmentTypeLabel(type: string | undefined): string | null {
  if (type === "PRE_TEST") return "Pre-test";
  if (type === "POST_TEST") return "Post-assessment";
  return null;
}

// Results come from the server only (no browser storage): every row is an
// AssessmentAttempt returned by the attempts API. Until the backend ships
// that endpoint this list is empty and the empty state explains why.
export default function ResultPage() {
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [courseByEnrollment, setCourseByEnrollment] = useState<
    Map<number, { title: string; cohort: string }>
  >(new Map());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [attemptList, staffCourses, assessmentPayload] = await Promise.all([
        loadAssessmentAttempts(),
        loadStaffCourses().catch(() => []),
        fetch("/api/training/assessments", { cache: "no-store" })
          .then((response) => (response.ok ? response.json() : null))
          .catch(() => null),
      ]);

      setAttempts(attemptList);
      setAssessments(readApiList<Assessment>(assessmentPayload));

      // Map each enrollment to its course title + cohort, so an attempt (which
      // now carries its enrollment) shows which course AND cohort it belongs to
      // — the same course can run in several cohorts.
      const map = new Map<number, { title: string; cohort: string }>();
      for (const staffCourse of staffCourses) {
        if (staffCourse.enrollment.id) {
          map.set(staffCourse.enrollment.id, {
            title: staffCourse.enrollment.course_title || "",
            cohort: staffCourse.enrollment.cohort_name || "",
          });
        }
      }
      setCourseByEnrollment(map);
      setLoading(false);
    };

    void fetchData();
  }, []);

  const assessmentById = useMemo(() => {
    const map = new Map<number, Assessment>();
    for (const assessment of assessments) map.set(assessment.id, assessment);
    return map;
  }, [assessments]);

  // The backend returns attempt_number as null, so every row would show #1.
  // Derive the real number: within each enrollment + assessment, order the
  // attempts by time and count them 1, 2, 3…
  const attemptNumberById = useMemo(() => {
    const groups = new Map<string, AssessmentAttempt[]>();
    for (const attempt of attempts) {
      const key = `${attempt.enrollment}:${attempt.assessment}`;
      const group = groups.get(key) ?? [];
      group.push(attempt);
      groups.set(key, group);
    }

    const numberById = new Map<number, number>();
    for (const group of groups.values()) {
      group
        .slice()
        .sort((first, second) =>
          (first.submitted_at ?? first.submission_time ?? "").localeCompare(
            second.submitted_at ?? second.submission_time ?? "",
          ),
        )
        .forEach((attempt, index) => numberById.set(attempt.id, index + 1));
    }
    return numberById;
  }, [attempts]);

  // The attempts payload has no course/assessment names, so resolve them here:
  // the course + cohort from the attempt's enrollment, and the assessment's
  // name + type (pre-test vs post-assessment) from the assessment id.
  const rows = useMemo(
    () =>
      attempts.map((attempt) => {
        const assessment = assessmentById.get(attempt.assessment);
        const typeLabel = assessmentTypeLabel(
          assessment?.type ?? attempt.assessment_type,
        );
        const name =
          assessment?.title ||
          attempt.assessment_title ||
          typeLabel ||
          `Assessment #${attempt.assessment}`;
        const course = courseByEnrollment.get(attempt.enrollment);
        const courseTitle = course?.title || attempt.course_title || "";
        const cohort = course?.cohort || "";
        const attemptNumber =
          attemptNumberById.get(attempt.id) ?? attempt.attempt_number;
        return { attempt, typeLabel, name, courseTitle, cohort, attemptNumber };
      }),
    [attempts, assessmentById, courseByEnrollment, attemptNumberById],
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const sorted = rows.slice().sort((first, second) =>
      (
        second.attempt.submitted_at ??
        second.attempt.submission_time ??
        ""
      ).localeCompare(
        first.attempt.submitted_at ?? first.attempt.submission_time ?? "",
      ),
    );

    if (!normalizedSearch) return sorted;

    return sorted.filter(({ courseTitle, cohort, name, typeLabel }) =>
      `${courseTitle} ${cohort} ${name} ${typeLabel ?? ""}`
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [rows, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="mb-1 text-2xl font-bold text-gray-800">
          Assessment Results
        </h2>
        <p className="text-sm text-gray-500">
          Every attempt is graded and stored by the backend. Your official
          result for an assessment is your best attempt.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search courses or assessments..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-8 text-center text-sm text-gray-500">
              Loading results...
            </p>
          ) : filteredRows.length === 0 ? (
            <div className="p-8 text-center">
              <Award className="mx-auto mb-3 text-gray-300" size={42} />
              <p className="font-semibold text-gray-700">
                No assessment results yet.
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Results appear here after you submit an assessment. Your score
                is shown immediately after each submission.
              </p>
              <p className="mt-3 text-xs text-gray-400">
                Attempt history is served by the backend attempts API, which is
                still being rolled out — past attempts will appear here once it
                is live.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 font-medium text-gray-500">
                <tr>
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Assessment</th>
                  <th className="px-6 py-4">Attempt</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredRows.map(
                  ({
                    attempt,
                    typeLabel,
                    name,
                    courseTitle,
                    cohort,
                    attemptNumber,
                  }) => (
                    <tr key={attempt.id} className="transition hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 text-[#1a6b3c]">
                          <Award size={20} />
                        </div>
                        <div className="min-w-0">
                          <span
                            className="block max-w-xs truncate font-semibold text-gray-800"
                            title={courseTitle}
                          >
                            {courseTitle || "—"}
                          </span>
                          {cohort && (
                            <span className="text-xs font-medium text-gray-400">
                              {cohort} cohort
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <FileText
                          size={16}
                          className="shrink-0 text-gray-400"
                        />
                        <div className="flex flex-col gap-0.5">
                          {typeLabel && (
                            <span
                              className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                typeLabel === "Pre-test"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-green-100 text-[#1a6b3c]"
                              }`}
                            >
                              {typeLabel}
                            </span>
                          )}
                          <span className="font-medium text-gray-700">
                            {name}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 font-medium text-gray-600">
                        #{attemptNumber}
                        {attempt.is_official_result && (
                          <span title="Official result (best attempt)">
                            <Star
                              size={14}
                              className="fill-amber-400 text-amber-400"
                            />
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-800">
                        {attempt.percentage !== null
                          ? `${attempt.percentage}%`
                          : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {/* The deployed serializer omits attempt_status; a
                            returned attempt is by definition submitted. */}
                        <AttemptStatusChip
                          status={attempt.attempt_status ?? "SUBMITTED"}
                        />
                        {(attempt.attempt_status ?? "SUBMITTED") ===
                          "SUBMITTED" && (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold ${
                              attempt.passed
                                ? "text-green-700"
                                : "text-red-600"
                            }`}
                          >
                            {attempt.passed ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <XCircle size={14} />
                            )}
                            {attempt.passed ? "Passed" : "Failed"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-500">
                      {attempt.submitted_at || attempt.submission_time
                        ? formatDate(
                            (attempt.submitted_at ??
                              attempt.submission_time) as string,
                          )
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 p-5 text-sm text-gray-500">
          <p>Showing {filteredRows.length} attempt(s)</p>
        </div>
      </div>
    </div>
  );
}
