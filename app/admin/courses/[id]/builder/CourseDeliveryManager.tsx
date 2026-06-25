"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CalendarPlus, Layers, Trash2, Video } from "lucide-react";
import {
  extractErrorMessage,
  readApiList,
} from "@/app/lib/portal-api";

type Cohort = {
  id: number;
  name: string;
  batch: string;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED";
};

type CohortCourse = {
  id: number;
  cohort: number;
  cohort_name: string;
  course: number;
  assigned_at: string;
};

type LiveSession = {
  id: number;
  cohort_course: number;
  course_title: string;
  cohort_name: string;
  title: string;
  description: string | null;
  meeting_url: string;
  start_time: string;
  end_time: string;
  status: "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED";
};

const emptySessionForm = {
  cohort_course: "",
  title: "",
  description: "",
  meeting_url: "",
  start_time: "",
  end_time: "",
};

export default function CourseDeliveryManager({
  courseId,
}: {
  courseId: number;
}) {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [assignments, setAssignments] = useState<CohortCourse[]>([]);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [selectedCohort, setSelectedCohort] = useState("");
  const [sessionForm, setSessionForm] = useState(emptySessionForm);
  const [loading, setLoading] = useState(true);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [cohortResponse, assignmentResponse, sessionResponse] =
        await Promise.all([
          fetch("/api/training/cohorts", { cache: "no-store" }),
          fetch("/api/training/cohort-courses", { cache: "no-store" }),
          fetch("/api/training/live-sessions", { cache: "no-store" }),
        ]);

      const [cohortPayload, assignmentPayload, sessionPayload] =
        await Promise.all([
          cohortResponse.json().catch(() => null),
          assignmentResponse.json().catch(() => null),
          sessionResponse.json().catch(() => null),
        ]);

      if (!cohortResponse.ok) {
        throw new Error(
          extractErrorMessage(cohortPayload, "Could not load cohorts."),
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

      const courseAssignments = readApiList<CohortCourse>(
        assignmentPayload,
      ).filter((assignment) => assignment.course === courseId);
      const assignmentIds = new Set(
        courseAssignments.map((assignment) => assignment.id),
      );

      setCohorts(readApiList<Cohort>(cohortPayload));
      setAssignments(courseAssignments);
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
          : "Could not load course delivery information.",
      );
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    const fetchData = async () => {
      await loadData();
    };

    void fetchData();
  }, [loadData]);

  const assignedCohortIds = new Set(
    assignments.map((assignment) => assignment.cohort),
  );
  const availableCohorts = cohorts.filter(
    (cohort) => !assignedCohortIds.has(cohort.id),
  );

  const handleAssignCourse = async () => {
    if (!selectedCohort) {
      setError("Please select a cohort.");
      return;
    }

    setSavingAssignment(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/training/cohort-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cohort: Number(selectedCohort),
          course: courseId,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not assign this course."),
        );
      }

      setSelectedCohort("");
      setNotice("Course assigned to cohort successfully.");
      await loadData();
    } catch (assignError) {
      setError(
        assignError instanceof Error
          ? assignError.message
          : "Could not assign this course.",
      );
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleRemoveAssignment = async (assignment: CohortCourse) => {
    const confirmed = window.confirm(
      `Remove this course from ${assignment.cohort_name}?`,
    );

    if (!confirmed) return;

    setDeletingId(assignment.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/training/cohort-courses/${assignment.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          extractErrorMessage(payload, "Could not remove this assignment."),
        );
      }

      setNotice("Course removed from cohort.");
      await loadData();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove this assignment.",
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
    if (!window.confirm(`Delete the live session “${session.title}”?`)) return;

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
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">Loading course delivery...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          <h3 className="text-lg font-bold text-[#1a6b3c]">
            Assign Course to Cohorts
          </h3>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={selectedCohort}
            onChange={(event) => setSelectedCohort(event.target.value)}
            className="flex-1 rounded-lg border px-4 py-2.5 text-sm"
          >
            <option value="">Select a cohort...</option>
            {availableCohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name} - {cohort.batch}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleAssignCourse}
            disabled={savingAssignment || !selectedCohort}
            className="rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {savingAssignment ? "Assigning..." : "Assign Course"}
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {assignments.length === 0 ? (
            <p className="text-sm text-gray-500">
              This course has not been assigned to a cohort.
            </p>
          ) : (
            assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
              >
                <span className="text-sm font-medium text-gray-700">
                  {assignment.cohort_name}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveAssignment(assignment)}
                  disabled={deletingId === assignment.id}
                  className="text-red-600 disabled:opacity-50"
                  aria-label={`Remove ${assignment.cohort_name}`}
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
            <option value="">Select a cohort-course assignment...</option>
            {assignments.map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {assignment.cohort_name}
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
            className="flex items-center justify-center gap-2 rounded-lg bg-[#1a6b3c] px-5 py-2.5 font-semibold text-white disabled:opacity-50 md:col-span-2"
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
                    {session.cohort_name} ·{" "}
                    {new Intl.DateTimeFormat("en-NG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(session.start_time))}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteSession(session)}
                  disabled={deletingId === session.id}
                  className="text-red-600 disabled:opacity-50"
                  aria-label={`Delete ${session.title}`}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
