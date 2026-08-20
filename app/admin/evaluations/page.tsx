"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Info,
  MessageSquareText,
  Star,
  Users,
} from "lucide-react";
import { extractErrorMessage, readApiList } from "@/app/lib/portal-api";
import {
  programmeBatchLabel,
  type Programme,
  type CourseEnrollment,
  type CourseEvaluation,
} from "@/app/lib/staff-learning";
import { formatDateTime } from "@/app/lib/format";
import {
  EmptyState,
  field,
  PageHeader,
  Skeleton,
  StatCard,
} from "@/app/components/ui";
import { SearchInput } from "@/app/components/ui-interactive";
import { cachedFetch } from "@/app/lib/data-cache";



type EvaluationRow = {
  id: number;
  staffName: string;
  fileNumber: string;
  course: string;
  cohort: string;
  rating: number;
  feedback: string;
  submittedAt: string;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} of 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          size={14}
          className={
            value <= rating ? "text-amber-500" : "text-gray-200"
          }
          fill={value <= rating ? "currentColor" : "none"}
        />
      ))}
      <span className="ml-1 text-xs font-semibold text-gray-500">
        {rating}/5
      </span>
    </span>
  );
}

export default function AdminEvaluationsPage() {
  const [rows, setRows] = useState<EvaluationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        const [evaluationRes, enrollmentRes, cohortCourseRes] =
          await Promise.all([
            cachedFetch("/api/training/evaluations"),
            cachedFetch("/api/training/enrollments"),
            cachedFetch("/api/training/programmes"),
          ]);

        const evaluationPayload = await evaluationRes.json().catch(() => null);

        if (!evaluationRes.ok) {
          throw new Error(
            extractErrorMessage(evaluationPayload, "Could not load evaluations."),
          );
        }

        const evaluations = readApiList<CourseEvaluation>(evaluationPayload);
        const enrollments = enrollmentRes.ok
          ? readApiList<CourseEnrollment>(
              await enrollmentRes.json().catch(() => null),
            )
          : [];
        const cohortCourses = cohortCourseRes.ok
          ? readApiList<Programme>(
              await cohortCourseRes.json().catch(() => null),
            )
          : [];

        const enrollmentById = new Map(
          enrollments.map((enrollment) => [enrollment.id, enrollment]),
        );
        const cohortCourseById = new Map(
          cohortCourses.map((programme) => [programme.id, programme]),
        );

        const built: EvaluationRow[] = evaluations
          .map((evaluation) => {
            const enrollment = enrollmentById.get(evaluation.enrollment);
            const staffId = enrollment?.staff;
            const programmeId =
              enrollment?.programme ?? enrollment?.cohort_course;
            const programme =
              programmeId != null ? cohortCourseById.get(programmeId) : undefined;

            const course =
              programme?.course_details?.title?.trim() ||
              enrollment?.course_title?.trim() ||
              enrollment?.programme_title?.trim() ||
              "—";
            // Cohort + year identifies the exact Training (a course delivered
            // to a cohort in a given year). The evaluation is course-level, so
            // there is no module dimension.
            const cohortLabel =
              enrollment?.cohort_name?.trim() ||
              programmeBatchLabel(programme) ||
              "—";
            const cohort =
              programme?.year && cohortLabel !== "—"
                ? `${cohortLabel} ${programme.year}`
                : cohortLabel;

            return {
              id: evaluation.id,
              staffName:
                evaluation.staff_name?.trim() ||
                (staffId != null ? `Staff #${staffId}` : "—"),
              // The evaluation payload carries staff_name but not the file
              // number. Fetching it meant downloading the whole staff table on
              // every page load, which is not worth one column.
              fileNumber: "—",
              course,
              cohort,
              rating: evaluation.rating,
              feedback: evaluation.feedback?.trim() || "",
              submittedAt: evaluation.submitted_at,
            };
          })
          .sort((first, second) =>
            (second.submittedAt ?? "").localeCompare(first.submittedAt ?? ""),
          );

        setRows(built);
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load evaluations.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const courses = useMemo(
    () => Array.from(new Set(rows.map((row) => row.course))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (courseFilter !== "all" && row.course !== courseFilter) return false;
      if (ratingFilter !== "all" && row.rating !== Number(ratingFilter)) {
        return false;
      }
      if (query) {
        const haystack =
          `${row.staffName} ${row.fileNumber} ${row.course} ${row.cohort} ${row.feedback}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [rows, search, courseFilter, ratingFilter]);

  const averageRating = filtered.length
    ? filtered.reduce((sum, row) => sum + row.rating, 0) / filtered.length
    : 0;

  const exportCsv = () => {
    const header = [
      "Staff",
      "File number",
      "Course",
      "Cohort",
      "Rating",
      "Feedback",
      "Submitted",
    ];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const lines = [header.join(",")];

    for (const row of filtered) {
      lines.push(
        [
          row.staffName,
          row.fileNumber,
          row.course,
          row.cohort,
          String(row.rating),
          row.feedback,
          row.submittedAt ? formatDateTime(row.submittedAt) : "",
        ]
          .map((value) => escape(String(value)))
          .join(","),
      );
    }

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "course-evaluations.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Course Evaluations"
        subtitle="Feedback staff submit at the end of a course — ratings and comments, per training."
        actions={
          rows.length > 0 ? (
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <Download size={16} /> Export CSV
            </button>
          ) : undefined
        }
      />

      {/* What the evaluation collects — the format is fixed on the backend. */}
      <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <Info size={18} className="mt-0.5 shrink-0" />
        <p>
          The course-end evaluation collects a{" "}
          <span className="font-semibold">1–5 star rating</span> and an optional{" "}
          <span className="font-semibold">comment</span>. Custom evaluation
          questions are not supported by the backend yet — adding configurable
          questions needs a new evaluation-questions model server-side. This page
          shows every response staff have submitted.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="No evaluations yet"
          description="Once staff finish a course and submit its evaluation, their feedback will appear here."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Responses"
              value={filtered.length}
              icon={MessageSquareText}
              hint={
                filtered.length === rows.length
                  ? "Total submitted"
                  : `of ${rows.length} total`
              }
            />
            <StatCard
              label="Average rating"
              value={averageRating ? `${averageRating.toFixed(1)} / 5` : "—"}
              icon={Star}
              hint="Across the filtered responses"
            />
            <StatCard
              label="Courses evaluated"
              value={courses.length}
              icon={Users}
              hint="Distinct courses with feedback"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search staff, file number, course or comment…"
              className="w-full lg:max-w-sm"
            />
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <select
                value={courseFilter}
                onChange={(event) => setCourseFilter(event.target.value)}
                aria-label="Filter by course"
                className={`${field} w-auto`}
              >
                <option value="all">All courses</option>
                {courses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
              <select
                value={ratingFilter}
                onChange={(event) => setRatingFilter(event.target.value)}
                aria-label="Filter by rating"
                className={`${field} w-auto`}
              >
                <option value="all">All ratings</option>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={String(rating)}>
                    {rating} star{rating === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
              <p className="ml-auto text-xs font-medium text-gray-400">
                {filtered.length} of {rows.length} response
                {rows.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
              No responses match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Staff</th>
                    <th className="px-4 py-3 font-semibold">File No.</th>
                    <th className="px-4 py-3 font-semibold">Course</th>
                    <th className="px-4 py-3 font-semibold">Cohort / Year</th>
                    <th className="px-4 py-3 font-semibold">Rating</th>
                    <th className="px-4 py-3 font-semibold">Comment</th>
                    <th className="px-4 py-3 font-semibold">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((row) => (
                    <tr key={row.id} className="align-top hover:bg-gray-50/60">
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        {row.staffName}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {row.fileNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.course}</td>
                      <td className="px-4 py-3 text-gray-500">{row.cohort}</td>
                      <td className="px-4 py-3">
                        <Stars rating={row.rating} />
                      </td>
                      <td className="max-w-sm px-4 py-3 text-gray-600">
                        {row.feedback ? (
                          <span className="whitespace-pre-wrap">
                            {row.feedback}
                          </span>
                        ) : (
                          <span className="text-gray-300">No comment</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                        {row.submittedAt
                          ? formatDateTime(row.submittedAt)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
