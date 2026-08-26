"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarPlus,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileStack,
  Layers,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import {
  extractErrorMessage,
  readApiItem,
  readApiList,
  sortedAssignedModules,
  type AuthUser,
  type Course,
  type LibraryModule,
} from "@/app/lib/portal-api";
import {
  programmeBatchLabel,
  normalizeLiveSession,
  toPercentage,
  type Programme,
  type CourseEnrollment,
  type LiveSession,
} from "@/app/lib/staff-learning";
import { formatDateTime } from "@/app/lib/format";
import { useConfirm } from "@/app/components/useConfirm";
import { cachedFetch, cachedFetchAll } from "@/app/lib/data-cache";

// A Course = a set of Modules delivered to a Cohort (month) in a given year.
// Each selected module becomes one cohort-course record on the backend,
// which enforces uniqueness on (module, cohort, year).

const BATCH_CHIP_STYLES: Record<string, string> = {
  "BATCH A": "bg-green-100 text-green-700",
  "BATCH B": "bg-blue-100 text-blue-700",
  "BATCH C": "bg-amber-100 text-amber-700",
};

// Cohorts are now months (stakeholder change, 2026-07-11). NOTE: the
// deployed backend still validates cohort as BATCH A/B/C — creating with a
// month fails until its CohortEnum is updated; the error is surfaced clearly.
const COHORT_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const emptyForm = {
  cohort: "",
  year: String(new Date().getFullYear()),
  start_date: "",
  end_date: "",
};

const emptySessionForm = {
  // Which module of the course this session covers ("general" = the whole
  // training). Backend: LiveSession.module (nullable FK).
  module: "",
  title: "",
  description: "",
  meeting_url: "",
  start_time: "",
  end_time: "",
};

// Converts an ISO timestamp to the `YYYY-MM-DDTHH:mm` shape a datetime-local
// input expects, in the admin's local timezone. Used to pre-fill the edit form.
function toDateTimeLocalValue(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Attendance rows are parsed tolerantly — the endpoint is new and its
// serializer shape may still move.
type AttendanceRow = {
  id?: number;
  staff_name?: string;
  staff_email?: string;
  file_number?: string;
  enrollment?: number;
  first_joined_at?: string;
  first_joined?: string;
  last_joined_at?: string;
  last_joined?: string;
  join_count?: number;
  status?: string;
};

type StaffDirectoryEntry = { name: string; fileNumber: string };

/**
 * Names and file numbers for every staff member, keyed by id.
 *
 * Enrolment payloads carry only a staff id, so the enrolled-staff modal has no
 * other way to show who someone is. Loaded lazily when that modal is first
 * opened and cached for the session, never on page load. Drop this entirely if
 * the backend ever adds staff_name to the enrolment payload, as it already
 * does on evaluations and certificates.
 */
async function loadStaffDirectory(): Promise<Map<number, StaffDirectoryEntry>> {
  const directory = new Map<number, StaffDirectoryEntry>();
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 20) {
    const response = await cachedFetch(`/api/accounts/staff?page=${page}&page_size=100`);

    if (!response.ok) break;

    const payload = (await response.json().catch(() => null)) as {
      data?: { results?: AuthUser[]; next?: string | null };
    } | null;

    for (const user of payload?.data?.results ?? []) {
      directory.set(user.id, {
        name:
          [user.first_name, user.last_name].filter(Boolean).join(" ") ||
          user.email,
        fileNumber: user.file_number || "—",
      });
    }

    hasMore = Boolean(payload?.data?.next);
    page += 1;
  }

  return directory;
}

function friendlyCreateError(
  rawMessage: string,
  form: typeof emptyForm,
  courseTitle: string,
) {
  if (/unique/i.test(rawMessage)) {
    return `A ${form.cohort} ${form.year} training for "${courseTitle}" already exists. Each course can only be delivered once per cohort in a year — open the existing training instead, or pick a different month or year.`;
  }
  if (/valid choice/i.test(rawMessage)) {
    return `The backend rejected "${form.cohort}" as a cohort value. Please report this to the backend team.`;
  }
  return `Could not create this training: ${rawMessage}`;
}

export default function TrainingProgrammesManager() {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allSessions, setAllSessions] = useState<LiveSession[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedCourseId, setSelectedCourseId] = useState<number | "">("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Live-session management for one programme (modal).
  const [sessionsFor, setSessionsFor] = useState<Programme | null>(null);
  const [sessionForm, setSessionForm] = useState(emptySessionForm);
  const [savingSession, setSavingSession] = useState(false);
  const [sessionError, setSessionError] = useState("");
  // When set, the session form edits this existing session (PATCH) instead of
  // creating a new one (POST).
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  // Scroll container of the sessions modal, so picking a module can bring the
  // form back into view.
  const sessionModalRef = useRef<HTMLDivElement>(null);

  // Attendance viewer (per live session, inside the sessions modal).
  const [attendanceForId, setAttendanceForId] = useState<number | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Module viewer/attacher for one training's course (modal). Modules
  // belong to the course TEMPLATE, so changes apply to every training of it.
  const [modulesFor, setModulesFor] = useState<Programme | null>(null);
  const [libraryModules, setLibraryModules] = useState<LibraryModule[]>([]);
  const [moduleAttachId, setModuleAttachId] = useState("");
  const [moduleForm, setModuleForm] = useState({ title: "", description: "" });
  const [savingModule, setSavingModule] = useState(false);
  const [moduleError, setModuleError] = useState("");

  // Enrolled-staff management for one programme (modal).
  const [staffFor, setStaffFor] = useState<Programme | null>(null);
  const [programmeEnrollments, setProgrammeEnrollments] = useState<
    CourseEnrollment[]
  >([]);
  const [staffDirectory, setStaffDirectory] = useState<
    Map<number, StaffDirectoryEntry>
  >(new Map());
  const [loadingStaffList, setLoadingStaffList] = useState(false);
  const [removingEnrollmentId, setRemovingEnrollmentId] = useState<
    number | null
  >(null);
  const [removingAllStaff, setRemovingAllStaff] = useState(false);
  const [staffListError, setStaffListError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [programmeResponse, courseResponse, sessionResponse] =
        await Promise.all([
          cachedFetchAll("/api/training/programmes"),
          cachedFetchAll("/api/training/courses"),
          cachedFetchAll("/api/training/live-sessions"),
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
            "Could not load courses.",
          ),
        );
      }

      setProgrammes(readApiList<Programme>(programmePayload));
      if (courseResponse.ok) setCourses(readApiList<Course>(coursePayload));
      if (sessionResponse.ok) {
        // normalizeLiveSession mirrors the new `programme` FK onto the
        // legacy cohort_course so the per-programme filters keep working.
        setAllSessions(
          readApiList<LiveSession>(sessionPayload).map(normalizeLiveSession),
        );
      }
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load courses.",
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
    const groups = new Map<string, Programme[]>();

    for (const programme of programmes) {
      const year = programme.year ? String(programme.year) : "Undated";
      if (!groups.has(year)) groups.set(year, []);
      groups.get(year)?.push(programme);
    }

    for (const group of groups.values()) {
      group.sort((first, second) => {
        const batchOrder = programmeBatchLabel(first).localeCompare(
          programmeBatchLabel(second),
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

  // True when a training for this course + cohort month + year already exists.
  const findDuplicateTraining = (list: Programme[]) =>
    list.find(
      (programme) =>
        Number(programme.course) === Number(selectedCourseId) &&
        programmeBatchLabel(programme).toLowerCase() ===
          form.cohort.toLowerCase() &&
        String(programme.year ?? "") === String(form.year),
    );

  // Creates one Programme: a single Course delivered to a cohort (month) + year.
  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedCourseId) {
      setError("Please select a course for this programme.");
      return;
    }

    const courseTitle =
      courses.find((course) => course.id === Number(selectedCourseId))
        ?.title ?? "this course";
    const duplicateMessage = `"${courseTitle}" already has a training for ${form.cohort} ${form.year}. Open the existing one from the table below, or pick a different month or year.`;

    // Duplicates are rejected here BEFORE calling the backend (it currently
    // crashes with a 500 on the unique constraint instead of returning a
    // clean validation error).
    if (findDuplicateTraining(programmes)) {
      setError(duplicateMessage);
      setNotice("");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/training/programmes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: Number(selectedCourseId),
          cohort: form.cohort,
          year: Number(form.year),
          start_date: form.start_date,
          end_date: form.end_date,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok && response.status >= 500) {
        // The backend 500s on duplicate (course, cohort, year). Only claim
        // "duplicate" if a fresh fetch actually confirms one exists — for
        // example created by another admin since our list loaded.
        let confirmedDuplicate = false;

        try {
          const check = await cachedFetchAll("/api/training/programmes");

          if (check.ok) {
            confirmedDuplicate = Boolean(
              findDuplicateTraining(
                readApiList<Programme>(
                  await check.json().catch(() => null),
                ),
              ),
            );
          }
        } catch {
          // Fall through to the generic server-error message.
        }

        setError(
          confirmedDuplicate
            ? duplicateMessage
            : "The server could not create this training (HTTP 500). This is a backend error — please share it with the backend team.",
        );
      } else if (!response.ok) {
        setError(
          friendlyCreateError(
            extractErrorMessage(
              payload,
              "This programme could not be created.",
            ),
            form,
            courseTitle,
          ),
        );
      } else {
        setNotice(
          `Training created — "${courseTitle}" for ${form.cohort} ${form.year}.`,
        );
        setForm(emptyForm);
        setSelectedCourseId("");
        setShowForm(false);
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    }

    await loadData();
    setSaving(false);
  };

  const handleDelete = async (programme: Programme) => {
    // Backend uses SET_NULL (confirmed 2026-07-10): enrollments, progress
    // and certificates survive the delete; only the course link clears.
    const confirmed = await confirm(
      `Remove "${programme.course_details?.title}" from ${programmeBatchLabel(
        programme,
      )}${programme.year ? ` ${programme.year}` : ""}? Staff enrollments, progress and certificates are kept for history, but this cohort assignment (and its live sessions) will no longer be manageable.`,
      { danger: true },
    );

    if (!confirmed) return;

    setDeletingId(programme.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/training/programmes/${programme.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          extractErrorMessage(payload, "Could not delete this programme."),
        );
      }

      setNotice("Module removed from the course.");
      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete this course entry.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const programmeSessions = sessionsFor
    ? allSessions.filter((session) => session.cohort_course === sessionsFor.id)
    : [];

  // The delivered course's modules — each one should get its own live
  // session inside this training.
  const sessionModuleOptions = (
    sessionsFor?.course_details?.assigned_modules ?? []
  )
    .slice()
    .sort((first, second) => first.order - second.order)
    .map((link) => ({
      id: link.module,
      title: link.module_details?.title ?? `Module ${link.module}`,
      // The session's trainer defaults from the module's trainer.
      trainerId: link.module_details?.trainers?.[0]?.id ?? null,
    }));

  const coveredModuleIds = new Set(
    programmeSessions
      .map((session) => session.module)
      .filter((id): id is number => typeof id === "number"),
  );

  const modulesWithoutSession = sessionModuleOptions.filter(
    (option) => !coveredModuleIds.has(option.id),
  );

  const handleToggleAttendance = async (sessionId: number) => {
    if (attendanceForId === sessionId) {
      setAttendanceForId(null);
      return;
    }

    setAttendanceForId(sessionId);
    setAttendanceRows([]);
    setLoadingAttendance(true);

    try {
      const response = await cachedFetch(`/api/training/live-sessions/${sessionId}/attendance`);
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not load attendance."),
        );
      }

      setAttendanceRows(readApiList<AttendanceRow>(payload));
      setSessionError("");
    } catch (attendanceError) {
      setSessionError(
        attendanceError instanceof Error
          ? attendanceError.message
          : "Could not load attendance.",
      );
    } finally {
      setLoadingAttendance(false);
    }
  };

  const openStaffModal = async (programme: Programme) => {
    setStaffFor(programme);
    setProgrammeEnrollments([]);
    setStaffListError("");
    setLoadingStaffList(true);

    try {
      const [enrollmentResponse, directory] = await Promise.all([
        // Scoped server-side; this used to pull every enrolment in the system
        // and filter in the browser.
        cachedFetch(`/api/training/enrollments?programme=${programme.id}&page_size=100`),
        staffDirectory.size > 0
          ? Promise.resolve(staffDirectory)
          : loadStaffDirectory(),
      ]);

      const payload = await enrollmentResponse.json().catch(() => null);

      if (!enrollmentResponse.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not load enrollments."),
        );
      }

      setStaffDirectory(directory);
      setProgrammeEnrollments(
        readApiList<CourseEnrollment>(payload).filter(
          // The backend enrollment FK is `programme`; older payloads used
          // `cohort_course`. Match either so enrolled staff always show.
          (enrollment) =>
            (enrollment.programme ?? enrollment.cohort_course) === programme.id,
        ),
      );
    } catch (staffError) {
      setStaffListError(
        staffError instanceof Error
          ? staffError.message
          : "Could not load the enrolled staff list.",
      );
    } finally {
      setLoadingStaffList(false);
    }
  };

  const handleUnenroll = async (enrollment: CourseEnrollment) => {
    const staffLabel =
      staffDirectory.get(enrollment.staff)?.name ??
      `Staff #${enrollment.staff}`;
    const confirmed = await confirm(
      `Remove ${staffLabel} from this course? Their progress record for it will be deleted.`,
      { danger: true },
    );

    if (!confirmed) return;

    setRemovingEnrollmentId(enrollment.id);
    setStaffListError("");

    try {
      const response = await fetch(
        `/api/training/enrollments/${enrollment.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          extractErrorMessage(payload, "Could not remove this staff member."),
        );
      }

      setProgrammeEnrollments((current) =>
        current.filter((item) => item.id !== enrollment.id),
      );
    } catch (removeError) {
      setStaffListError(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove this staff member.",
      );
    } finally {
      setRemovingEnrollmentId(null);
    }
  };

  const handleUnenrollAll = async () => {
    if (!staffFor || programmeEnrollments.length === 0) return;

    const confirmed = await confirm(
      `Remove ALL ${programmeEnrollments.length} staff from "${
        staffFor.course_details?.title
      }" (${programmeBatchLabel(staffFor)}${
        staffFor.year ? ` ${staffFor.year}` : ""
      })? Every one of their progress records for this training will be deleted. This cannot be undone.`,
      { danger: true },
    );

    if (!confirmed) return;

    setRemovingAllStaff(true);
    setStaffListError("");

    // Fire the deletes together, then keep only the ones that failed so the
    // admin can retry just those.
    const targets = programmeEnrollments.slice();
    const results = await Promise.allSettled(
      targets.map((enrollment) =>
        fetch(`/api/training/enrollments/${enrollment.id}`, {
          method: "DELETE",
        }),
      ),
    );

    const failedIds = new Set(
      targets
        .filter((_, index) => {
          const result = results[index];
          return !(result.status === "fulfilled" && result.value.ok);
        })
        .map((enrollment) => enrollment.id),
    );

    setProgrammeEnrollments((current) =>
      current.filter((item) => failedIds.has(item.id)),
    );

    if (failedIds.size > 0) {
      setStaffListError(
        `Removed ${targets.length - failedIds.size} of ${
          targets.length
        } staff. ${failedIds.size} could not be removed — please try again.`,
      );
    }

    setRemovingAllStaff(false);
  };

  // ----- Course modules (per training row) ---------------------------------

  const openModulesModal = async (programme: Programme) => {
    setModulesFor(programme);
    setModuleAttachId("");
    setModuleForm({ title: "", description: "" });
    setModuleError("");

    try {
      const response = await cachedFetchAll("/api/training/modules");
      const payload = await response.json().catch(() => null);

      if (response.ok) {
        setLibraryModules(readApiList<LibraryModule>(payload));
      }
    } catch {
      // The attach dropdown just stays empty; the module list still renders.
    }
  };

  /** Replaces the course's ordered module list on the backend. */
  const saveCourseModules = async (courseId: number, moduleIds: number[]) => {
    const response = await fetch(
      `/api/training/courses/${courseId}/assign-modules`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_ids: moduleIds }),
      },
    );
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        extractErrorMessage(payload, "Could not update the course's modules."),
      );
    }
  };

  // The freshest copy of the course being managed (loadData refreshes it).
  const modulesCourse = modulesFor
    ? (courses.find((course) => course.id === modulesFor.course) ??
      modulesFor.course_details ??
      null)
    : null;
  const courseModuleLinks = sortedAssignedModules(modulesCourse);
  const attachableModules = libraryModules.filter(
    (module) => !courseModuleLinks.some((link) => link.module === module.id),
  );

  const handleAttachModuleToCourse = async () => {
    if (!modulesCourse || !moduleAttachId) return;

    setSavingModule(true);
    setModuleError("");

    try {
      await saveCourseModules(modulesCourse.id, [
        ...courseModuleLinks.map((link) => link.module),
        Number(moduleAttachId),
      ]);
      setModuleAttachId("");
      await loadData();
    } catch (attachError) {
      setModuleError(
        attachError instanceof Error
          ? attachError.message
          : "Could not attach this module.",
      );
    } finally {
      setSavingModule(false);
    }
  };

  // Quick-build: creates the module in the shared library, then attaches it
  // to this course in one step.
  const handleBuildModuleForCourse = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!modulesCourse || !moduleForm.title.trim()) return;

    setSavingModule(true);
    setModuleError("");

    try {
      const response = await fetch("/api/training/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: moduleForm.title.trim(),
          description: moduleForm.description.trim(),
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not create the module."),
        );
      }

      const created = readApiItem<LibraryModule>(payload);

      if (created?.id) {
        await saveCourseModules(modulesCourse.id, [
          ...courseModuleLinks.map((link) => link.module),
          created.id,
        ]);

        // Jump straight into the module builder to add activities.
        router.push(`/admin/modules/${created.id}`);
        return;
      }

      setModuleForm({ title: "", description: "" });
      await loadData();
    } catch (buildError) {
      setModuleError(
        buildError instanceof Error
          ? buildError.message
          : "Could not create the module.",
      );
    } finally {
      setSavingModule(false);
    }
  };

  const handleRemoveModuleFromCourse = async (moduleId: number) => {
    if (!modulesCourse) return;

    const moduleTitle =
      courseModuleLinks.find((link) => link.module === moduleId)
        ?.module_details?.title ?? "this module";
    const confirmed = await confirm(
      `Remove "${moduleTitle}" from "${modulesCourse.title}"? It stays in the module library — and this affects every training of this course.`,
    );

    if (!confirmed) return;

    setModuleError("");

    try {
      await saveCourseModules(
        modulesCourse.id,
        courseModuleLinks
          .map((link) => link.module)
          .filter((id) => id !== moduleId),
      );
      await loadData();
    } catch (removeError) {
      setModuleError(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove this module.",
      );
    }
  };

  // Loads an existing session into the form for editing (PATCH on submit).
  const startEditSession = (session: LiveSession) => {
    setEditingSessionId(session.id);
    setSessionError("");
    setSessionForm({
      module: session.module == null ? "general" : String(session.module),
      title: session.title ?? "",
      description: session.description ?? "",
      meeting_url: session.meeting_url ?? "",
      start_time: toDateTimeLocalValue(session.start_time),
      end_time: toDateTimeLocalValue(session.end_time),
    });
  };

  const cancelEditSession = () => {
    setEditingSessionId(null);
    setSessionForm(emptySessionForm);
    setSessionError("");
  };

  // Clicking a module in the coverage list: if it already has a session, load
  // it for editing; otherwise start a fresh session with that module preset.
  const handlePickModule = (moduleId: number) => {
    const existing = programmeSessions.find(
      (session) => session.module === moduleId,
    );
    if (existing) {
      startEditSession(existing);
    } else {
      setEditingSessionId(null);
      setSessionError("");
      setSessionForm({ ...emptySessionForm, module: String(moduleId) });
    }
    sessionModalRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleScheduleSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionsFor) return;

    if (new Date(sessionForm.end_time) <= new Date(sessionForm.start_time)) {
      setSessionError("The session end time must be after its start time.");
      return;
    }

    setSavingSession(true);
    setSessionError("");

    const isEditing = editingSessionId !== null;
    const moduleId =
      sessionForm.module && sessionForm.module !== "general"
        ? Number(sessionForm.module)
        : null;
    // The trainer defaults from the chosen module (single source of truth).
    const trainerId =
      moduleId != null
        ? (sessionModuleOptions.find((option) => option.id === moduleId)
            ?.trainerId ?? null)
        : null;

    const body: Record<string, unknown> = {
      programme: sessionsFor.id,
      module: moduleId,
      trainer: trainerId,
      title: sessionForm.title.trim(),
      description: sessionForm.description.trim() || null,
      meeting_url: sessionForm.meeting_url.trim(),
      start_time: new Date(sessionForm.start_time).toISOString(),
      end_time: new Date(sessionForm.end_time).toISOString(),
    };
    // Only stamp the status when creating; editing leaves the existing status
    // untouched (PATCH is partial).
    if (!isEditing) body.status = "SCHEDULED";

    try {
      const response = await fetch(
        isEditing
          ? `/api/training/live-sessions/${editingSessionId}`
          : "/api/training/live-sessions",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        // A 500 returns Django's HTML error page (no JSON), so give a
        // clearer hint than the generic proxy message.
        if (response.status >= 500) {
          throw new Error(
            "The server could not save this session (HTTP 500). This is a backend error — please share it with the backend team.",
          );
        }

        throw new Error(
          extractErrorMessage(payload, "Could not save this session."),
        );
      }

      setSessionForm(emptySessionForm);
      setEditingSessionId(null);
      await loadData();
    } catch (sessionSaveError) {
      setSessionError(
        sessionSaveError instanceof Error
          ? sessionSaveError.message
          : "Could not save this session.",
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
          <h2 className="text-2xl font-bold text-gray-800">Training</h2>
          <p className="text-sm text-gray-500">
            Schedule a course to a cohort and year — each one is a training
            offering.
          </p>
        </div>

        <button
          onClick={() => {
            setShowForm((current) => !current);
            setForm(emptyForm);
            setSelectedCourseId("");
            setError("");
            setNotice("");
          }}
          className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#145530]"
        >
          <Plus size={18} />
          {showForm ? "Close form" : "Create Training"}
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
            <Layers size={20} /> Create Training
          </h3>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Course
            </label>
            <p className="mb-2 text-xs text-gray-500">
              Pick the course to deliver for this cohort. The course already
              contains its modules and activities.
            </p>
            {courses.length === 0 ? (
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                No courses exist yet — create them under Courses first.
              </p>
            ) : (
              <select
                required
                value={selectedCourseId}
                onChange={(event) =>
                  setSelectedCourseId(
                    event.target.value ? Number(event.target.value) : "",
                  )
                }
                className="w-full rounded-lg border px-4 py-2.5 text-sm"
              >
                <option value="" disabled>
                  Select a course...
                </option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Cohort
            </label>
            <select
              required
              value={form.cohort}
              onChange={(event) =>
                setForm({ ...form, cohort: event.target.value })
              }
              className="w-full rounded-lg border px-4 py-2.5 text-sm"
            >
              <option value="" disabled>
                Select a cohort month...
              </option>
              {COHORT_MONTHS.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
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
            disabled={saving || !selectedCourseId}
            className="rounded-lg bg-[#1a6b3c] px-6 py-3 font-semibold text-white transition hover:bg-[#145530] disabled:opacity-60 md:col-span-2"
          >
            {saving ? "Creating..." : "Create Training"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading courses...
        </p>
      ) : programmes.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <Layers size={30} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">
            No courses yet. Create one to deliver modules to a cohort.
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
                    <th className="p-4">Cohort</th>
                    <th className="p-4">Start</th>
                    <th className="p-4">End</th>
                    <th className="p-4">Modules</th>
                    <th className="p-4">Live sessions</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {yearProgrammes.map((programme) => {
                    const batch = programmeBatchLabel(programme);
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
                              "bg-[#e3f2ea] text-[#1a6b3c]"
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
                            onClick={() => void openModulesModal(programme)}
                            title="View, attach or build this course's modules"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1a6b3c] px-3 py-1.5 text-xs font-semibold text-[#1a6b3c] transition hover:bg-green-50"
                          >
                            <Layers size={14} />
                            {(programme.course_details?.assigned_modules
                              ?.length ?? 0) === 0
                              ? "Assign modules"
                              : `Assign modules (${programme.course_details?.assigned_modules?.length})`}
                          </button>
                        </td>
                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSessionsFor(programme);
                              setSessionForm(emptySessionForm);
                              setEditingSessionId(null);
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
                            <button
                              type="button"
                              onClick={() => void openStaffModal(programme)}
                              title="View and manage enrolled staff"
                              aria-label="Enrolled staff"
                              className="text-[#1a6b3c]"
                            >
                              <Users size={17} />
                            </button>
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

      {modulesFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                  <Layers size={20} className="text-[#1a6b3c]" />
                  Course Modules
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {modulesCourse?.title ?? modulesFor.course_details?.title} —{" "}
                  {programmeBatchLabel(modulesFor)}
                  {modulesFor.year ? ` ${modulesFor.year}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModulesFor(null)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mb-4 rounded-lg bg-[#f0f7f3] px-3 py-2 text-xs text-gray-600">
              Modules belong to the course template — adding or removing one
              here applies to <span className="font-semibold">every</span>{" "}
              training of this course.
            </p>

            {moduleError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {moduleError}
              </div>
            )}

            {/* Current modules */}
            {courseModuleLinks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-4 text-sm text-gray-500">
                No modules in this course yet — attach one from the library or
                build a new one below.
              </p>
            ) : (
              <div className="space-y-2">
                {courseModuleLinks.map((link, index) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition hover:border-gray-200"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f0f7f3] text-sm font-bold text-[#1a6b3c]">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-800">
                        {link.module_details?.title}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-gray-500">
                        <FileStack size={12} className="text-gray-400" />
                        {link.module_details?.activities?.length ?? 0} activit
                        {(link.module_details?.activities?.length ?? 0) === 1
                          ? "y"
                          : "ies"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void handleRemoveModuleFromCourse(link.module)
                      }
                      title="Remove from this course (stays in the library)"
                      aria-label={`Remove ${link.module_details?.title} from this course`}
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Attach from library */}
            <div className="mt-5 border-t border-gray-100 pt-4">
              <h4 className="text-sm font-bold text-gray-800">
                Attach from the Module Library
              </h4>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                <select
                  value={moduleAttachId}
                  onChange={(event) => setModuleAttachId(event.target.value)}
                  className="w-full rounded-lg border px-4 py-2.5 text-sm"
                >
                  <option value="">Select a module to attach</option>
                  {attachableModules.map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.title} ({module.activities?.length ?? 0} item(s))
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void handleAttachModuleToCourse()}
                  disabled={!moduleAttachId || savingModule}
                  className="rounded-lg border border-[#1a6b3c] px-4 py-2.5 text-sm font-semibold text-[#1a6b3c] transition hover:bg-green-50 disabled:opacity-50"
                >
                  {savingModule ? "Working..." : "Attach"}
                </button>
              </div>
              {attachableModules.length === 0 && (
                <p className="mt-1.5 text-xs text-gray-400">
                  Every library module is already in this course.
                </p>
              )}
            </div>

            {/* Build a new module */}
            <form
              onSubmit={handleBuildModuleForCourse}
              className="mt-5 border-t border-gray-100 pt-4"
            >
              <h4 className="text-sm font-bold text-gray-800">
                Or build a new module
              </h4>
              <p className="mt-0.5 text-xs text-gray-500">
                Created in the shared library, attached to this course, and
                you&apos;re taken straight to the module builder to add its
                activities.
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2">
                <input
                  required
                  value={moduleForm.title}
                  onChange={(event) =>
                    setModuleForm({ ...moduleForm, title: event.target.value })
                  }
                  placeholder="Module title"
                  className="w-full rounded-lg border px-4 py-2.5 text-sm"
                />
                <textarea
                  value={moduleForm.description}
                  onChange={(event) =>
                    setModuleForm({
                      ...moduleForm,
                      description: event.target.value,
                    })
                  }
                  placeholder="Description (optional)"
                  className="h-16 w-full rounded-lg border px-4 py-2.5 text-sm"
                />
                <button
                  disabled={savingModule || !moduleForm.title.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#145530] disabled:opacity-60"
                >
                  <Plus size={16} />
                  {savingModule
                    ? "Working..."
                    : "Build module & add activities"}
                </button>
              </div>
            </form>

            {modulesCourse ? (
              <Link
                href={`/admin/courses/${modulesCourse.id}/builder`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1a6b3c] underline-offset-2 hover:underline"
              >
                Open the course builder for activities, assessments &
                reordering <ArrowRight size={14} />
              </Link>
            ) : null}
          </div>
        </div>
      )}

      {sessionsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            ref={sessionModalRef}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                  <CalendarPlus size={20} className="text-[#1a6b3c]" />
                  Live Sessions
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {sessionsFor.course_details?.title} —{" "}
                  {programmeBatchLabel(sessionsFor)}
                  {sessionsFor.year ? ` ${sessionsFor.year}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSessionsFor(null);
                  setEditingSessionId(null);
                  setSessionForm(emptySessionForm);
                }}
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
              {sessionModuleOptions.length > 0 ? (
                <div className="md:col-span-2">
                  <select
                    required
                    value={sessionForm.module}
                    onChange={(event) =>
                      setSessionForm({
                        ...sessionForm,
                        module: event.target.value,
                      })
                    }
                    aria-label="Module this session covers"
                    className="w-full rounded-lg border px-4 py-2.5 text-sm"
                  >
                    <option value="">
                      Select what this session covers…
                    </option>
                    {/* Saved as module: null. The form already understood
                        "general" — editing such a session set it — but the
                        option was never offered, so it could be read back and
                        not chosen. */}
                    <option value="general">
                      The whole training (not one module)
                    </option>
                    {sessionModuleOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.title}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Each module can have its own session. Pick the whole
                    training for anything that is not about one module — an
                    opening address, a closing ceremony.
                  </p>
                </div>
              ) : (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 md:col-span-2">
                  This course has no modules yet. Attach modules in the course
                  builder first — each live session must belong to a module.
                </p>
              )}

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
              <div className="flex gap-2 md:col-span-2">
                <button
                  disabled={savingSession || sessionModuleOptions.length === 0}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#145530] disabled:opacity-60"
                >
                  <Video size={16} />
                  {editingSessionId !== null
                    ? savingSession
                      ? "Updating..."
                      : "Update Session"
                    : savingSession
                      ? "Scheduling..."
                      : "Schedule Session"}
                </button>
                {editingSessionId !== null && (
                  <button
                    type="button"
                    onClick={cancelEditSession}
                    disabled={savingSession}
                    className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {sessionModuleOptions.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
                <div className="flex items-center justify-between bg-gray-50 px-3 py-2">
                  <span className="text-xs font-semibold text-gray-700">
                    Module coverage
                  </span>
                  <span className="text-xs font-medium text-gray-500">
                    {sessionModuleOptions.length -
                      modulesWithoutSession.length}{" "}
                    of {sessionModuleOptions.length} scheduled
                  </span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {sessionModuleOptions.map((option) => {
                    const covered = coveredModuleIds.has(option.id);
                    return (
                      <li key={option.id}>
                        <button
                          type="button"
                          onClick={() => handlePickModule(option.id)}
                          title={
                            covered
                              ? "Edit this module's live session"
                              : "Schedule a live session for this module"
                          }
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-gray-50"
                        >
                          {covered ? (
                            <CheckCircle2
                              size={14}
                              className="shrink-0 text-[#1a6b3c]"
                            />
                          ) : (
                            <Circle
                              size={14}
                              className="shrink-0 text-amber-400"
                            />
                          )}
                          <span className="min-w-0 flex-1 truncate text-gray-700">
                            {option.title}
                          </span>
                          <span
                            className={`shrink-0 font-medium ${
                              covered ? "text-[#1a6b3c]" : "text-amber-600"
                            }`}
                          >
                            {covered ? "Scheduled" : "Not scheduled"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {programmeSessions.length > 0 && (
              <div className="mt-5 space-y-2 border-t border-gray-100 pt-4">
                {programmeSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`rounded-lg p-3 ${
                      editingSessionId === session.id
                        ? "bg-green-50 ring-1 ring-[#1a6b3c]"
                        : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800">
                            {session.title}
                          </p>
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-[#1a6b3c]">
                            <Layers size={11} />
                            {session.module_title || "Whole training"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {formatDateTime(session.start_time)} —{" "}
                          {formatDateTime(session.end_time)} · {session.status}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleToggleAttendance(session.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#1a6b3c] px-3 py-1.5 text-xs font-semibold text-[#1a6b3c] transition hover:bg-green-50"
                        >
                          <ClipboardList size={13} />
                          {attendanceForId === session.id
                            ? "Hide attendance"
                            : "Attendance"}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditSession(session)}
                          className="text-gray-500 transition hover:text-[#1a6b3c]"
                          aria-label={`Edit ${session.title}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSession(session)}
                          className="text-red-600"
                          aria-label={`Delete ${session.title}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {attendanceForId === session.id && (
                      <div className="mt-3 border-t border-gray-200 pt-3">
                        {loadingAttendance ? (
                          <p className="text-xs text-gray-400">
                            Loading attendance...
                          </p>
                        ) : attendanceRows.length === 0 ? (
                          <p className="text-xs text-gray-400">
                            Nobody has joined this session through the portal
                            yet.
                          </p>
                        ) : (
                          <ul className="space-y-1.5">
                            {attendanceRows.map((row, index) => (
                              <li
                                key={row.id ?? index}
                                className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-xs"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold text-gray-800">
                                    {row.staff_name ??
                                      row.staff_email ??
                                      (row.enrollment
                                        ? `Enrollment #${row.enrollment}`
                                        : "Staff member")}
                                  </span>
                                  <span className="text-gray-400">
                                    {row.file_number ?? ""}
                                  </span>
                                </span>
                                <span className="shrink-0 text-right text-gray-500">
                                  <span className="block">
                                    First joined:{" "}
                                    {row.first_joined_at ?? row.first_joined
                                      ? formatDateTime(
                                          (row.first_joined_at ??
                                            row.first_joined) as string,
                                        )
                                      : "—"}
                                  </span>
                                  <span className="block">
                                    Joins: {row.join_count ?? 1}
                                    {row.status ? ` · ${row.status}` : ""}
                                  </span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {staffFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                  <Users size={20} className="text-[#1a6b3c]" />
                  Enrolled Staff
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {staffFor.course_details?.title} —{" "}
                  {programmeBatchLabel(staffFor)}
                  {staffFor.year ? ` ${staffFor.year}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStaffFor(null)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            {staffListError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {staffListError}
              </div>
            )}

            {loadingStaffList ? (
              <p className="text-sm text-gray-400">Loading enrolled staff...</p>
            ) : programmeEnrollments.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nobody is enrolled in this course yet.
              </p>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {programmeEnrollments.length} enrolled
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleUnenrollAll()}
                    disabled={removingAllStaff}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    {removingAllStaff ? "Removing all…" : "Unassign everyone"}
                  </button>
                </div>
                <ul className="space-y-2">
                {programmeEnrollments.map((enrollment) => {
                  const entry = staffDirectory.get(enrollment.staff);

                  return (
                    <li
                      key={enrollment.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-4 py-3 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-gray-800">
                          {entry?.name ?? `Staff #${enrollment.staff}`}
                        </span>
                        <span className="text-xs text-gray-400">
                          {entry?.fileNumber ?? "—"} ·{" "}
                          {toPercentage(enrollment.completion_percentage)}%
                          complete · {enrollment.status.replace("_", " ")}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleUnenroll(enrollment)}
                        disabled={removingEnrollmentId === enrollment.id}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        {removingEnrollmentId === enrollment.id
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    </li>
                  );
                })}
                </ul>
              </>
            )}

            <p className="mt-5 border-t border-gray-100 pt-4 text-xs text-gray-500">
              To add staff, use{" "}
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-1 font-semibold text-[#1a6b3c] hover:underline"
              >
                <UserPlus size={12} /> the Staff page
              </Link>{" "}
              — select staff there and assign them to this course, upload a
              CSV, or assign a whole department.
            </p>
          </div>
        </div>
      )}

      {dialog}
    </div>
  );
}
