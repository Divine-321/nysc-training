"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarPlus,
  Layers,
  Plus,
  Trash2,
  UserPlus,
  Video,
  X,
} from "lucide-react";
import {
  extractErrorMessage,
  readApiList,
  type Course,
} from "@/app/lib/portal-api";
import {
  cohortCourseBatchLabel,
  type CohortCourse,
  type LiveSession,
} from "@/app/lib/staff-learning";
import type { Batch } from "@/app/lib/training-types";
import BatchSelect from "@/app/components/BatchSelect";
import { formatDateTime } from "@/app/lib/format";
import { useConfirm } from "@/app/components/useConfirm";

// A Training Programme = one Course delivered to one fixed Batch (A/B/C) in
// one year. The backend enforces uniqueness on (course, cohort, year).

const BATCH_CHIP_STYLES: Record<string, string> = {
  "BATCH A": "bg-green-100 text-green-700",
  "BATCH B": "bg-blue-100 text-blue-700",
  "BATCH C": "bg-amber-100 text-amber-700",
};

const emptyForm = {
  course: "",
  cohort: "" as Batch | "",
  year: String(new Date().getFullYear()),
  start_date: "",
  end_date: "",
};

const emptySessionForm = {
  title: "",
  description: "",
  meeting_url: "",
  start_time: "",
  end_time: "",
};

function friendlyCreateError(rawMessage: string, form: typeof emptyForm) {
  if (/unique/i.test(rawMessage)) {
    return `${form.cohort || "This batch"} already has this course for ${
      form.year
    }. Each course can only run once per batch per year.`;
  }
  return rawMessage;
}

export default function TrainingProgrammesManager() {
  const { confirm, dialog } = useConfirm();
  const [programmes, setProgrammes] = useState<CohortCourse[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allSessions, setAllSessions] = useState<LiveSession[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Live-session management for one programme (modal).
  const [sessionsFor, setSessionsFor] = useState<CohortCourse | null>(null);
  const [sessionForm, setSessionForm] = useState(emptySessionForm);
  const [savingSession, setSavingSession] = useState(false);
  const [sessionError, setSessionError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [programmeResponse, courseResponse, sessionResponse] =
        await Promise.all([
          fetch("/api/training/cohort-courses", { cache: "no-store" }),
          fetch("/api/training/courses", { cache: "no-store" }),
          fetch("/api/training/live-sessions", { cache: "no-store" }),
        ]);

      const [programmePayload, coursePayload, sessionPayload] =
        await Promise.all([
          programmeResponse.json().catch(() => null),
          courseResponse.json().catch(() => null),
          sessionResponse.json().catch(() => null),
        ]);

      if (!programmeResponse.ok) {
        throw new Error(
          extractErrorMessage(
            programmePayload,
            "Could not load training programmes.",
          ),
        );
      }

      setProgrammes(readApiList<CohortCourse>(programmePayload));
      if (courseResponse.ok) setCourses(readApiList<Course>(coursePayload));
      if (sessionResponse.ok) {
        setAllSessions(readApiList<LiveSession>(sessionPayload));
      }
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load training programmes.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await loadData();
    };

    void fetchData();
  }, [loadData]);

  // Group by year (newest first); batches A -> B -> C inside each year.
  const programmesByYear = useMemo(() => {
    const groups = new Map<string, CohortCourse[]>();

    for (const programme of programmes) {
      const year = programme.year ? String(programme.year) : "Undated";
      if (!groups.has(year)) groups.set(year, []);
      groups.get(year)?.push(programme);
    }

    for (const group of groups.values()) {
      group.sort((first, second) => {
        const batchOrder = cohortCourseBatchLabel(first).localeCompare(
          cohortCourseBatchLabel(second),
        );
        if (batchOrder !== 0) return batchOrder;
        return (first.course_details?.title ?? "").localeCompare(
          second.course_details?.title ?? "",
        );
      });
    }

    return Array.from(groups.entries()).sort(([a], [b]) =>
      b.localeCompare(a),
    );
  }, [programmes]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/training/cohort-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: Number(form.course),
          cohort: form.cohort,
          year: Number(form.year),
          start_date: form.start_date,
          end_date: form.end_date,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          friendlyCreateError(
            extractErrorMessage(
              payload,
              "Could not create this training programme.",
            ),
            form,
          ),
        );
      }

      setForm(emptyForm);
      setShowForm(false);
      setNotice("Training programme created successfully.");
      await loadData();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create this training programme.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (programme: CohortCourse) => {
    const confirmed = await confirm(
      `Delete "${programme.course_details?.title}" for ${cohortCourseBatchLabel(
        programme,
      )}${programme.year ? ` ${programme.year}` : ""}? Staff enrollments under it will no longer be reachable.`,
      { danger: true },
    );

    if (!confirmed) return;

    setDeletingId(programme.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/training/cohort-courses/${programme.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          extractErrorMessage(payload, "Could not delete this programme."),
        );
      }

      setNotice("Training programme deleted.");
      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete this programme.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const programmeSessions = sessionsFor
    ? allSessions.filter((session) => session.cohort_course === sessionsFor.id)
    : [];

  const handleScheduleSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionsFor) return;

    if (new Date(sessionForm.end_time) <= new Date(sessionForm.start_time)) {
      setSessionError("The session end time must be after its start time.");
      return;
    }

    setSavingSession(true);
    setSessionError("");

    try {
      const response = await fetch("/api/training/live-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cohort_course: sessionsFor.id,
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
      await loadData();
    } catch (sessionSaveError) {
      setSessionError(
        sessionSaveError instanceof Error
          ? sessionSaveError.message
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

    setSessionError("");

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

      await loadData();
    } catch (deleteError) {
      setSessionError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete this live session.",
      );
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Training Programmes
          </h2>
          <p className="text-sm text-gray-500">
            A programme delivers one course to one batch (A, B or C) in a
            given year.
          </p>
        </div>

        <button
          onClick={() => {
            setShowForm((current) => !current);
            setForm(emptyForm);
            setError("");
            setNotice("");
          }}
          className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#145530]"
        >
          <Plus size={18} />
          {showForm ? "Close form" : "New programme"}
        </button>
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

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="grid gap-4 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-2"
        >
          <h3 className="flex items-center gap-2 text-lg font-bold text-[#1a6b3c] md:col-span-2">
            <Layers size={20} /> New Training Programme
          </h3>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Course
            </label>
            <select
              required
              value={form.course}
              onChange={(event) =>
                setForm({ ...form, course: event.target.value })
              }
              className="w-full rounded-lg border px-4 py-2.5 text-sm"
            >
              <option value="">Select the course to deliver...</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Cohort batch
            </label>
            <BatchSelect
              required
              value={form.cohort}
              onChange={(batch) => setForm({ ...form, cohort: batch })}
              className="w-full px-4 py-2.5"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Year
            </label>
            <input
              required
              type="number"
              min="2020"
              max="2100"
              value={form.year}
              onChange={(event) =>
                setForm({ ...form, year: event.target.value })
              }
              className="w-full rounded-lg border px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Start date
            </label>
            <input
              required
              type="date"
              value={form.start_date}
              onChange={(event) =>
                setForm({ ...form, start_date: event.target.value })
              }
              className="w-full rounded-lg border px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              End date
            </label>
            <input
              required
              type="date"
              value={form.end_date}
              onChange={(event) =>
                setForm({ ...form, end_date: event.target.value })
              }
              className="w-full rounded-lg border px-4 py-2.5 text-sm"
            />
          </div>

          <button
            disabled={saving}
            className="rounded-lg bg-[#1a6b3c] px-6 py-3 font-semibold text-white transition hover:bg-[#145530] disabled:opacity-60 md:col-span-2"
          >
            {saving ? "Creating..." : "Create programme"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading training programmes...
        </p>
      ) : programmes.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <Layers size={30} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">
            No training programmes yet. Create one to deliver a course to a
            batch.
          </p>
        </div>
      ) : (
        programmesByYear.map(([year, yearProgrammes]) => (
          <section key={year} className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400">
              {year}
            </h3>

            <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="p-4">Course</th>
                    <th className="p-4">Batch</th>
                    <th className="p-4">Start</th>
                    <th className="p-4">End</th>
                    <th className="p-4">Live sessions</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {yearProgrammes.map((programme) => {
                    const batch = cohortCourseBatchLabel(programme);
                    const sessionCount = allSessions.filter(
                      (session) => session.cohort_course === programme.id,
                    ).length;

                    return (
                      <tr key={programme.id} className="border-t">
                        <td className="p-4 font-semibold text-gray-800">
                          <span className="flex items-center gap-2">
                            <BookOpen
                              size={15}
                              className="shrink-0 text-[#1a6b3c]"
                            />
                            {programme.course_details?.title ??
                              `Course #${programme.course}`}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              BATCH_CHIP_STYLES[batch] ??
                              "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {batch || "—"}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600">
                          {programme.start_date ?? "—"}
                        </td>
                        <td className="p-4 text-gray-600">
                          {programme.end_date ?? "—"}
                        </td>
                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSessionsFor(programme);
                              setSessionForm(emptySessionForm);
                              setSessionError("");
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1a6b3c] px-3 py-1.5 text-xs font-semibold text-[#1a6b3c] transition hover:bg-green-50"
                          >
                            <Video size={14} />
                            {sessionCount === 0
                              ? "Schedule"
                              : `Manage (${sessionCount})`}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Link
                              href="/admin/users"
                              title="Assign staff to this programme from the Staff page"
                              aria-label="Assign staff"
                              className="text-[#1a6b3c]"
                            >
                              <UserPlus size={17} />
                            </Link>
                            <button
                              onClick={() => handleDelete(programme)}
                              disabled={deletingId === programme.id}
                              className="text-red-600 disabled:opacity-50"
                              aria-label={`Delete ${
                                programme.course_details?.title ?? "programme"
                              }`}
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      {sessionsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                  <CalendarPlus size={20} className="text-[#1a6b3c]" />
                  Live Sessions
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {sessionsFor.course_details?.title} —{" "}
                  {cohortCourseBatchLabel(sessionsFor)}
                  {sessionsFor.year ? ` ${sessionsFor.year}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSessionsFor(null)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            {sessionError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {sessionError}
              </div>
            )}

            <form
              onSubmit={handleScheduleSession}
              className="grid gap-3 md:grid-cols-2"
            >
              <input
                required
                value={sessionForm.title}
                onChange={(event) =>
                  setSessionForm({
                    ...sessionForm,
                    title: event.target.value,
                  })
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
                  setSessionForm({
                    ...sessionForm,
                    end_time: event.target.value,
                  })
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
                placeholder="Session description (optional)"
                className="h-20 rounded-lg border px-4 py-3 text-sm md:col-span-2"
              />
              <button
                disabled={savingSession}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#145530] disabled:opacity-60 md:col-span-2"
              >
                <Video size={16} />
                {savingSession ? "Scheduling..." : "Schedule Session"}
              </button>
            </form>

            {programmeSessions.length > 0 && (
              <div className="mt-5 space-y-2 border-t border-gray-100 pt-4">
                {programmeSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {session.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(session.start_time)} —{" "}
                        {formatDateTime(session.end_time)} · {session.status}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(session)}
                      className="text-red-600"
                      aria-label={`Delete ${session.title}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {dialog}
    </div>
  );
}
