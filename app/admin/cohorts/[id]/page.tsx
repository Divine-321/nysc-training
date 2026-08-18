"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarPlus, Layers, Trash2, Video } from "lucide-react";
import {
  extractErrorMessage,
  readApiItem,
  readApiList,
  type Course,
} from "@/app/lib/portal-api";
import { type CohortCourse, type LiveSession } from "@/app/lib/staff-learning";
import { formatDateTime } from "@/app/lib/format";
import { useConfirm } from "@/app/components/useConfirm";
import { cachedFetch } from "@/app/lib/data-cache";

type Cohort = {
  id: number;
  name: string;
  batch: string;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED";
};

const emptySessionForm = {
  cohort_course: "",
  title: "",
  description: "",
  meeting_url: "",
  start_time: "",
  end_time: "",
};

export default function ManageCohortPage() {
  const params = useParams();
  const cohortId = Number(params.id);
  const { confirm, dialog } = useConfirm();

  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<CohortCourse[]>([]);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [sessionForm, setSessionForm] = useState(emptySessionForm);
  const [loading, setLoading] = useState(true);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [cohortResponse, coursesResponse, assignmentResponse, sessionResponse] =
        await Promise.all([
          cachedFetch(`/api/training/cohorts/${cohortId}`),
          cachedFetch("/api/training/courses"),
          cachedFetch("/api/training/programmes"),
          cachedFetch("/api/training/live-sessions"),
        ]);

      const [cohortPayload, coursesPayload, assignmentPayload, sessionPayload] =
        await Promise.all([
          cohortResponse.json().catch(() => null),
          coursesResponse.json().catch(() => null),
          assignmentResponse.json().catch(() => null),
          sessionResponse.json().catch(() => null),
        ]);

      if (!cohortResponse.ok) {
        throw new Error(
          extractErrorMessage(cohortPayload, "Could not load this cohort."),
        );
      }

      if (!assignmentResponse.ok) {
        throw new Error(
          extractErrorMessage(
            assignmentPayload,
            "Could not load cohort-course assignments.",
          ),
        );
      }

      if (!sessionResponse.ok) {
        throw new Error(
          extractErrorMessage(sessionPayload, "Could not load live sessions."),
        );
      }

      const cohortAssignments = readApiList<CohortCourse>(
        assignmentPayload,
      ).filter((assignment) => assignment.cohort === cohortId);
      const assignmentIds = new Set(
        cohortAssignments.map((assignment) => assignment.id),
      );

      setCohort(readApiItem<Cohort>(cohortPayload));
      if (coursesResponse.ok) {
        setCourses(readApiList<Course>(coursesPayload));
      }
      setAssignments(cohortAssignments);
      setSessions(
        readApiList<LiveSession>(sessionPayload).filter((session) =>
          assignmentIds.has(session.cohort_course),
        ),
      );
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load this cohort's delivery information.",
      );
    } finally {
      setLoading(false);
    }
  }, [cohortId]);

  useEffect(() => {
    const fetchData = async () => {
      await loadData();
    };

    void fetchData();
  }, [loadData]);

  const assignedCourseIds = new Set(
    assignments.map((assignment) => assignment.course),
  );
  const availableCourses = courses.filter(
    (course) => !assignedCourseIds.has(course.id),
  );

  const toggleCourseSelection = (courseId: number) => {
    setSelectedCourseIds((current) =>
      current.includes(courseId)
        ? current.filter((id) => id !== courseId)
        : [...current, courseId],
    );
  };

  const resolvePrerequisiteClosure = (courseIds: number[]) => {
    const courseById = new Map(courses.map((course) => [course.id, course]));
    const closure = new Set(courseIds);
    const queue = [...courseIds];

    while (queue.length > 0) {
      const currentId = queue.shift() as number;
      const prerequisiteIds =
        courseById.get(currentId)?.prerequisites_data?.map(
          (prerequisite) => prerequisite.id,
        ) ?? [];

      for (const prerequisiteId of prerequisiteIds) {
        if (!closure.has(prerequisiteId)) {
          closure.add(prerequisiteId);
          queue.push(prerequisiteId);
        }
      }
    }

    return Array.from(closure);
  };

  const handleAssignCourses = async () => {
    if (selectedCourseIds.length === 0) {
      setError("Please select at least one course.");
      return;
    }

    setSavingAssignment(true);
    setError("");
    setNotice("");

    const alreadyAssignedIds = new Set(
      assignments.map((assignment) => assignment.course),
    );
    const fullSelection = resolvePrerequisiteClosure(selectedCourseIds).filter(
      (courseId) => !alreadyAssignedIds.has(courseId),
    );
    const autoAddedIds = fullSelection.filter(
      (courseId) => !selectedCourseIds.includes(courseId),
    );
    const courseById = new Map(courses.map((course) => [course.id, course]));

    const results = await Promise.all(
      fullSelection.map(async (courseId) => {
        try {
          const response = await fetch("/api/training/programmes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cohort: cohortId, course: courseId }),
          });
          const payload = await response.json().catch(() => null);

          return {
            courseId,
            ok: response.ok,
            message: response.ok
              ? ""
              : extractErrorMessage(payload, "Could not add this course."),
          };
        } catch {
          return { courseId, ok: false, message: "Network error." };
        }
      }),
    );

    const successful = results.filter((result) => result.ok);
    const failed = results.filter((result) => !result.ok);
    const successfulAutoAdded = successful.filter((result) =>
      autoAddedIds.includes(result.courseId),
    );

    if (successful.length > 0) {
      let message = `${successful.length} course${
        successful.length === 1 ? "" : "s"
      } added to this cohort.`;

      if (successfulAutoAdded.length > 0) {
        const autoAddedTitles = successfulAutoAdded
          .map((result) => courseById.get(result.courseId)?.title)
          .filter(Boolean)
          .join(", ");

        message += ` Also added automatically as prerequisite${
          successfulAutoAdded.length === 1 ? "" : "s"
        }: ${autoAddedTitles}.`;
      }

      setNotice(message);
    }

    if (failed.length > 0) {
      setError(
        `${failed.length} course${
          failed.length === 1 ? "" : "s"
        } could not be added. ${failed[0].message}`,
      );
      setSelectedCourseIds(
        failed
          .map((result) => result.courseId)
          .filter((courseId) => selectedCourseIds.includes(courseId)),
      );
    } else {
      setSelectedCourseIds([]);
    }

    await loadData();
    setSavingAssignment(false);
  };

  const handleRemoveAssignment = async (assignment: CohortCourse) => {
    const confirmed = await confirm(
      `Remove "${assignment.course_details.title}" from this cohort?`,
      { danger: true },
    );

    if (!confirmed) return;

    setDeletingId(assignment.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/training/programmes/${assignment.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          extractErrorMessage(payload, "Could not remove this course."),
        );
      }

      setNotice("Course removed from this cohort.");
      await loadData();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove this course.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleScheduleSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (new Date(sessionForm.end_time) <= new Date(sessionForm.start_time)) {
      setError("The session end time must be after its start time.");
      return;
    }

    setSavingSession(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/training/live-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Backend FK renamed cohort_course -> programme; send both so this
          // keeps working against either serializer version.
          programme: Number(sessionForm.cohort_course),
          cohort_course: Number(sessionForm.cohort_course),
          title: sessionForm.title.trim(),
          description: sessionForm.description.trim() || null,
          meeting_url: sessionForm.meeting_url.trim(),
          start_time: new Date(sessionForm.start_time).toISOString(),
          end_time: new Date(sessionForm.end_time).toISOString(),
          status: "SCHEDULED",
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not schedule this session."),
        );
      }

      setSessionForm(emptySessionForm);
      setNotice("Live session scheduled successfully.");
      await loadData();
    } catch (sessionError) {
      setError(
        sessionError instanceof Error
          ? sessionError.message
          : "Could not schedule this session.",
      );
    } finally {
      setSavingSession(false);
    }
  };

  const handleDeleteSession = async (session: LiveSession) => {
    const confirmed = await confirm(
      `Delete the live session "${session.title}"?`,
      { danger: true },
    );

    if (!confirmed) return;

    setDeletingId(session.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/training/live-sessions/${session.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          extractErrorMessage(payload, "Could not delete this live session."),
        );
      }

      setNotice("Live session deleted successfully.");
      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete this live session.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="rounded-2xl bg-white p-6 shadow-sm">Loading cohort...</div>;
  }

  if (!cohort) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        {error || "This cohort could not be loaded."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/admin/cohorts"
          className="mb-3 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-[#1a6b3c]"
        >
          <ArrowLeft size={16} /> Back to Cohorts
        </Link>
        <h2 className="text-2xl font-bold text-gray-800">
          {cohort.name} <span className="text-gray-400">— {cohort.batch}</span>
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage which courses this cohort takes and schedule live sessions.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
          {notice}
        </div>
      )}

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Layers className="text-[#1a6b3c]" size={22} />
          <h3 className="text-lg font-bold text-[#1a6b3c]">Courses</h3>
        </div>

        {availableCourses.length === 0 ? (
          <p className="text-sm text-gray-500">
            Every existing course has already been added to this cohort.
          </p>
        ) : (
          <>
            <p className="mb-2 text-xs text-gray-500">
              Select one or more courses to add to this cohort at once. If a
              course has prerequisites, those will be added automatically too.
            </p>

            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-2">
              {availableCourses.map((course) => (
                <label
                  key={course.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedCourseIds.includes(course.id)}
                    onChange={() => toggleCourseSelection(course.id)}
                    className="h-4 w-4 accent-[#1a6b3c]"
                  />
                  {course.title}
                </label>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAssignCourses}
              disabled={savingAssignment || selectedCourseIds.length === 0}
              className="mt-3 rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {savingAssignment
                ? "Adding..."
                : selectedCourseIds.length === 0
                  ? "Add Courses"
                  : `Add ${selectedCourseIds.length} Course${
                      selectedCourseIds.length === 1 ? "" : "s"
                    }`}
            </button>
          </>
        )}

        <div className="mt-4 space-y-2">
          {assignments.length === 0 ? (
            <p className="text-sm text-gray-500">
              No courses have been added to this cohort yet.
            </p>
          ) : (
            assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
              >
                <span className="text-sm font-medium text-gray-700">
                  {assignment.course_details.title}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveAssignment(assignment)}
                  disabled={deletingId === assignment.id}
                  className="text-red-600"
                  aria-label={`Remove ${assignment.course_details.title}`}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <CalendarPlus className="text-[#1a6b3c]" size={22} />
          <h3 className="text-lg font-bold text-[#1a6b3c]">
            Schedule Live Session
          </h3>
        </div>

        <form
          onSubmit={handleScheduleSession}
          className="grid gap-4 md:grid-cols-2"
        >
          <select
            required
            value={sessionForm.cohort_course}
            onChange={(event) =>
              setSessionForm({
                ...sessionForm,
                cohort_course: event.target.value,
              })
            }
            className="rounded-lg border px-4 py-2.5 text-sm md:col-span-2"
          >
            <option value="">Select a course in this cohort...</option>
            {assignments.map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {assignment.course_details.title}
              </option>
            ))}
          </select>

          <input
            required
            value={sessionForm.title}
            onChange={(event) =>
              setSessionForm({ ...sessionForm, title: event.target.value })
            }
            placeholder="Session title"
            className="rounded-lg border px-4 py-2.5 text-sm"
          />

          <input
            required
            type="url"
            value={sessionForm.meeting_url}
            onChange={(event) =>
              setSessionForm({
                ...sessionForm,
                meeting_url: event.target.value,
              })
            }
            placeholder="https://zoom.us/..."
            className="rounded-lg border px-4 py-2.5 text-sm"
          />

          <input
            required
            type="datetime-local"
            value={sessionForm.start_time}
            onChange={(event) =>
              setSessionForm({
                ...sessionForm,
                start_time: event.target.value,
              })
            }
            className="rounded-lg border px-4 py-2.5 text-sm"
          />

          <input
            required
            type="datetime-local"
            value={sessionForm.end_time}
            onChange={(event) =>
              setSessionForm({ ...sessionForm, end_time: event.target.value })
            }
            className="rounded-lg border px-4 py-2.5 text-sm"
          />

          <textarea
            value={sessionForm.description}
            onChange={(event) =>
              setSessionForm({
                ...sessionForm,
                description: event.target.value,
              })
            }
            placeholder="Session description"
            className="h-24 rounded-lg border px-4 py-3 text-sm md:col-span-2"
          />

          <button
            disabled={savingSession || assignments.length === 0}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#1a6b3c] px-5 py-2.5 font-semibold text-white md:col-span-2"
          >
            <Video size={18} />
            {savingSession ? "Scheduling..." : "Schedule Session"}
          </button>
        </form>

        {sessions.length > 0 && (
          <div className="mt-6 space-y-2 border-t pt-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {session.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {session.course_title} ·{" "}
                    {formatDateTime(session.start_time)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteSession(session)}
                  disabled={deletingId === session.id}
                  className="text-red-600"
                  aria-label={`Delete ${session.title}`}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {dialog}
    </div>
  );
}
