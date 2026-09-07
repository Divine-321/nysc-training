"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Eye, Info, MessageSquareText, ThumbsUp, Users } from "lucide-react";
import { extractErrorMessage, readApiList, type Course } from "@/app/lib/portal-api";
import {
  programmeBatchLabel,
  type CourseEvaluation,
  type Programme,
} from "@/app/lib/staff-learning";
import { formatEvaluationAnswer } from "@/app/components/CourseEvaluationForm";
import { formatDateTime } from "@/app/lib/format";
import {
  EmptyState,
  field,
  PageHeader,
  Skeleton,
  StatCard,
} from "@/app/components/ui";
import { Modal, SearchInput } from "@/app/components/ui-interactive";
import { cachedFetchAll } from "@/app/lib/data-cache";

export default function AdminEvaluationsPage() {
  const [rows, setRows] = useState<CourseEvaluation[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [programmeFilter, setProgrammeFilter] = useState("all");
  const [detailRow, setDetailRow] = useState<CourseEvaluation | null>(null);

  // Course and programme lists are only for the filter dropdowns — small,
  // cached separately from the (potentially much larger, and growing every
  // time a course finishes) evaluations list itself.
  useEffect(() => {
    const loadFilterOptions = async () => {
      const [courseRes, programmeRes] = await Promise.all([
        cachedFetchAll("/api/training/courses"),
        cachedFetchAll("/api/training/programmes"),
      ]);

      if (courseRes.ok) {
        setCourses(readApiList<Course>(await courseRes.json().catch(() => null)));
      }
      if (programmeRes.ok) {
        setProgrammes(
          readApiList<Programme>(await programmeRes.json().catch(() => null)),
        );
      }
    };

    void loadFilterOptions();
  }, []);

  // Filtering by course/programme happens server-side — real query params the
  // backend supports, not a client-side guess — so this list never has to
  // download every evaluation NYSC has ever collected just to show one
  // course's. Free-text search still runs over whatever page that leaves.
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams();
        if (courseFilter !== "all") params.set("course", courseFilter);
        if (programmeFilter !== "all") params.set("programme", programmeFilter);
        const query = params.toString() ? `?${params.toString()}` : "";

        const response = await cachedFetchAll(`/api/training/evaluations${query}`);
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            extractErrorMessage(payload, "Could not load evaluations."),
          );
        }

        const evaluations = readApiList<CourseEvaluation>(payload).sort(
          (first, second) =>
            (second.submitted_at ?? "").localeCompare(first.submitted_at ?? ""),
        );

        setRows(evaluations);
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
  }, [courseFilter, programmeFilter]);

  const courseOptions = useMemo(
    () =>
      courses
        .map((course) => ({ id: course.id, title: course.title }))
        .sort((first, second) => first.title.localeCompare(second.title)),
    [courses],
  );

  const programmeOptions = useMemo(
    () =>
      programmes
        .filter(
          (programme) =>
            courseFilter === "all" || String(programme.course) === courseFilter,
        )
        .map((programme) => ({
          id: programme.id,
          label: `${programme.course_details?.title ?? "—"} — ${
            programmeBatchLabel(programme)
          }${programme.year ? ` ${programme.year}` : ""}`,
        }))
        .sort((first, second) => first.label.localeCompare(second.label)),
    [programmes, courseFilter],
  );

  // The full set of questions actually seen across the loaded responses, in
  // survey order — derived from the data itself (each answer carries its
  // full question) rather than a separate /evaluation-questions/ fetch, so
  // CSV columns never drift out of sync with what staff were actually asked.
  const questionColumns = useMemo(() => {
    const byId = new Map<number, string>();
    for (const row of rows) {
      for (const answer of row.evaluations) {
        if (!byId.has(answer.question.id)) {
          byId.set(answer.question.id, answer.question.question);
        }
      }
    }
    return Array.from(byId, ([id, question]) => ({ id, question })).sort(
      (first, second) => first.id - second.id,
    );
  }, [rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) => {
      const answerText = row.evaluations
        .map((answer) => formatEvaluationAnswer(answer))
        .join(" ");
      const haystack =
        `${row.staff_name} ${row.file_number} ${row.course_title} ${row.cohort} ${answerText}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, search]);

  // Q22 ("would you recommend this training?") is the closest thing to a
  // single headline number a 23-question survey has.
  const recommendStats = useMemo(() => {
    let yes = 0;
    let answered = 0;

    for (const row of filtered) {
      const answer = row.evaluations.find((item) => item.question.order === 22);
      const option = answer?.selected_option?.option?.trim().toLowerCase();
      if (!option) continue;
      answered += 1;
      if (option === "yes") yes += 1;
    }

    return { yes, answered };
  }, [filtered]);

  const exportCsv = () => {
    const header = [
      "Staff",
      "File number",
      "Course",
      "Cohort",
      "Year",
      "Submitted",
      ...questionColumns.map((column) => column.question),
    ];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const lines = [header.map(escape).join(",")];

    for (const row of filtered) {
      const answerByQuestionId = new Map(
        row.evaluations.map((answer) => [answer.question.id, answer]),
      );

      const cells = [
        row.staff_name,
        row.file_number,
        row.course_title,
        row.cohort,
        row.year != null ? String(row.year) : "",
        row.submitted_at ? formatDateTime(row.submitted_at) : "",
        ...questionColumns.map((column) => {
          const answer = answerByQuestionId.get(column.id);
          return answer ? formatEvaluationAnswer(answer) : "";
        }),
      ];

      lines.push(cells.map((value) => escape(String(value))).join(","));
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
        subtitle="Feedback staff submit at the end of a course — the full 23-question survey, per training."
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

      <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <Info size={18} className="mt-0.5 shrink-0" />
        <p>
          Every response is the full 23-question survey — a 1–5 or Yes/No
          scale, multiple-choice, and open-text questions, depending on the
          question. Filter by course or training to narrow the list; each
          filter change re-asks the backend rather than downloading
          everything.
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
                  ? "Loaded for this filter"
                  : `of ${rows.length} loaded`
              }
            />
            <StatCard
              label="Would recommend"
              value={
                recommendStats.answered
                  ? `${Math.round((recommendStats.yes / recommendStats.answered) * 100)}%`
                  : "—"
              }
              icon={ThumbsUp}
              hint={
                recommendStats.answered
                  ? `${recommendStats.answered} answered "Would you recommend?"`
                  : "No responses in this filter yet"
              }
            />
            <StatCard
              label="Courses with feedback"
              value={courseOptions.length}
              icon={Users}
              hint="Across the whole portal"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search staff, file number, course or answers…"
              className="w-full lg:max-w-sm"
            />
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <select
                value={courseFilter}
                onChange={(event) => {
                  setCourseFilter(event.target.value);
                  setProgrammeFilter("all");
                }}
                aria-label="Filter by course"
                className={`${field} w-auto`}
              >
                <option value="all">All courses</option>
                {courseOptions.map((course) => (
                  <option key={course.id} value={String(course.id)}>
                    {course.title}
                  </option>
                ))}
              </select>
              <select
                value={programmeFilter}
                onChange={(event) => setProgrammeFilter(event.target.value)}
                aria-label="Filter by training"
                className={`${field} w-auto`}
              >
                <option value="all">All trainings</option>
                {programmeOptions.map((programme) => (
                  <option key={programme.id} value={String(programme.id)}>
                    {programme.label}
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
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Staff</th>
                    <th className="px-4 py-3 font-semibold">File No.</th>
                    <th className="px-4 py-3 font-semibold">Course</th>
                    <th className="px-4 py-3 font-semibold">Cohort / Year</th>
                    <th className="px-4 py-3 font-semibold">Submitted</th>
                    <th className="px-4 py-3 font-semibold">Response</th>
                    <th className="px-4 py-3 font-semibold text-right">
                      &nbsp;
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((row) => (
                    <tr key={row.id} className="align-top hover:bg-gray-50/60">
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        {row.staff_name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {row.file_number || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.course_title}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {row.cohort}
                        {row.year ? ` ${row.year}` : ""}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                        {row.submitted_at ? formatDateTime(row.submitted_at) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold text-gray-500">
                          {row.evaluations.length} answer
                          {row.evaluations.length === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setDetailRow(row)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Modal
        open={detailRow !== null}
        onClose={() => setDetailRow(null)}
        title={detailRow?.staff_name ?? "Evaluation"}
        subtitle={
          detailRow
            ? `${detailRow.course_title} — ${detailRow.cohort}${
                detailRow.year ? ` ${detailRow.year}` : ""
              }${
                detailRow.submitted_at
                  ? ` · Submitted ${formatDateTime(detailRow.submitted_at)}`
                  : ""
              }`
            : undefined
        }
      >
        {detailRow ? (
          <dl className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {[...detailRow.evaluations]
              .sort((first, second) => first.question.order - second.question.order)
              .map((answer) => (
                <div key={answer.id}>
                  <dt className="text-xs text-gray-500">
                    {answer.question.question}
                  </dt>
                  <dd className="text-sm font-medium text-gray-800">
                    {formatEvaluationAnswer(answer)}
                  </dd>
                </div>
              ))}
          </dl>
        ) : null}
      </Modal>
    </div>
  );
}
