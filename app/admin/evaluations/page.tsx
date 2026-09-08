"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Eye, MessageSquareText, ThumbsUp, Users } from "lucide-react";
import * as XLSX from "xlsx";
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
    const byId = new Map<number, { order: number; question: string }>();
    for (const row of rows) {
      for (const answer of row.evaluations) {
        if (!byId.has(answer.question.id)) {
          byId.set(answer.question.id, {
            order: answer.question.order,
            question: answer.question.question,
          });
        }
      }
    }
    // Numbered and sorted by the question's own order, not its database id —
    // the two aren't guaranteed to match, and the number needs to agree with
    // what staff actually saw on the form (and the admin detail view above).
    return Array.from(byId, ([id, { order, question }]) => ({ id, order, question }))
      .sort((first, second) => first.order - second.order)
      .map(({ id, order, question }) => ({ id, question: `${order}. ${question}` }));
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

  /**
   * A real workbook, not a flat CSV: a "Responses" sheet (one row per
   * submission — everything the old CSV export had) plus a "Question
   * summary" sheet that tallies each choice question's answers across the
   * currently filtered set. The tally is the thing a flat export can't give
   * an admin without them building their own pivot table first — how many
   * people picked each option, and what share of respondents that is.
   */
  const exportExcel = () => {
    const responseRows = filtered.map((row) => {
      const answerByQuestionId = new Map(
        row.evaluations.map((answer) => [answer.question.id, answer]),
      );

      const record: Record<string, string> = {
        Staff: row.staff_name,
        "File number": row.file_number,
        Course: row.course_title,
        Cohort: row.cohort,
        Year: row.year != null ? String(row.year) : "",
        Submitted: row.submitted_at ? formatDateTime(row.submitted_at) : "",
      };

      for (const column of questionColumns) {
        const answer = answerByQuestionId.get(column.id);
        record[column.question] = answer ? formatEvaluationAnswer(answer) : "";
      }

      return record;
    });

    const summaryRows: {
      Question: string;
      Answer: string;
      Count: number;
      Share: string;
    }[] = [];

    for (const column of questionColumns) {
      const answersForQuestion = filtered
        .flatMap((row) => row.evaluations)
        .filter((answer) => answer.question.id === column.id);

      if (answersForQuestion.length === 0) continue;

      // Open text has no fixed set of answers to tally — a count is still
      // useful, the individual answers themselves are on the Responses sheet.
      if (answersForQuestion[0].question.question_type === "OPEN_TEXT") {
        summaryRows.push({
          Question: column.question,
          Answer: "(open text — see Responses sheet)",
          Count: answersForQuestion.length,
          Share: "",
        });
        continue;
      }

      // Tally by the option's own label, not formatEvaluationAnswer's output
      // — that appends a MIXED question's free "Other" text, which would
      // otherwise split what should be one "Other" count into one row per
      // person's unique wording.
      const counts = new Map<string, number>();
      for (const answer of answersForQuestion) {
        const label = answer.selected_option?.option ?? "—";
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }

      const total = answersForQuestion.length;
      for (const [label, count] of [...counts.entries()].sort(
        (first, second) => second[1] - first[1],
      )) {
        summaryRows.push({
          Question: column.question,
          Answer: label,
          Count: count,
          Share: `${Math.round((count / total) * 100)}%`,
        });
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(responseRows),
      "Responses",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(summaryRows),
      "Question summary",
    );
    XLSX.writeFile(workbook, "course-evaluations.xlsx");
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
              onClick={exportExcel}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <Download size={16} /> Export Excel
            </button>
          ) : undefined
        }
      />

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
                    {answer.question.order}. {answer.question.question}
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
