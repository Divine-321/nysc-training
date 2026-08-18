import {
  dedupeById,
  extractErrorMessage,
  readApiItem,
  readApiList,
  type Course,
  type Trainer,
} from "@/app/lib/portal-api";

// New target learning-model vocabulary (Course -> Module -> Activity). The full
// types live in ./training-types and are re-exported here so screens can migrate
// off the old ModuleDocument/DocumentProgress/AssessmentResult types incrementally.
// The top-level `Course` and mid-level `Module` types are intentionally NOT
// re-exported here to avoid clashing with the old `Course` import above — import
// those directly from "@/app/lib/training-types".
import type {
  Activity,
  ActivityContentType,
  ActivityCompletion,
  AssessmentAttempt,
  AssessmentAttemptStatus,
  Batch,
  Month,
} from "@/app/lib/training-types";
import { cachedFetch } from "@/app/lib/data-cache";

export { BATCH_OPTIONS, MONTH_OPTIONS } from "@/app/lib/training-types";
export type {
  Activity,
  ActivityContentType,
  ActivityCompletion,
  AssessmentAttempt,
  AssessmentAttemptStatus,
  Batch,
  Month,
};

/** @deprecated Old model. Replaced by `Activity` in the Course -> Module -> Activity restructure. */
export type ModuleDocument = {
  id: number;
  module: number;
  title: string;
  doc_type: "VIDEO" | "PDF" | "PPT" | "IMAGE" | "OTHER";
  file_url: string;
  cloudinary_public_id: string | null;
  order: number;
  // New-model Activity fields — absent from the legacy module-docs
  // serializer, present once the Activities backend ships.
  content_type?: ActivityContentType;
  content_url?: string | null;
  text_content?: string | null;
  /** Linked assessment for ASSESSMENT-type activities (either spelling). */
  assessment?: number | null;
  assessment_id?: number | null;
};

/** @deprecated Old model. Replaced by `Module` (from ./training-types) in the restructure. */
export type CourseModule = {
  id: number;
  course: number;
  title: string;
  description: string | null;
  notes: string | null;
  order: number;
  /** Library module thumbnail (reusable-modules backend, 2026-07-12). */
  thumbnail_url?: string | null;
  /** Module-level trainers — the single source of truth for who teaches. */
  trainers?: Trainer[];
  documents: ModuleDocument[];
};

/** @deprecated Old model. Replaced by `ActivityCompletion` (from ./training-types). */
export type DocumentProgress = {
  id: number;
  enrollment: number;
  document: number;
  document_title: string;
  document_type: string;
  is_completed: boolean;
  completed_at: string | null;
};

export type CourseEvaluation = {
  id: number;
  enrollment: number;
  staff_name: string;
  rating: number;
  feedback: string | null;
  submitted_at: string;
};

export type CourseEnrollment = {
  id: number;
  staff: number;
  /**
   * New backend (2026-07): the delivery is a Programme. `normalizeEnrollment`
   * mirrors it into `cohort_course` so legacy reads keep working.
   */
  programme?: number;
  cohort_course: number;
  /** New backend name for the delivered Course's title. Mirrored to course_title. */
  programme_title?: string;
  course_title: string;
  cohort_name: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  completion_percentage: string;
  /** @deprecated Legacy serializer name; the restructure renamed it activity_completions. */
  document_progress?: DocumentProgress[];
  /** New-model completion records (restructure, live 2026-07-10). */
  activity_completions?: ActivityCompletion[];
  evaluation: CourseEvaluation | null;
  last_accessed: string;
  enrolled_at: string;
  completed_at: string | null;
  // Certificate-eligibility fields (serialized as booleans or strings).
  post_test_passed?: boolean | string;
  evaluation_submitted?: boolean | string;
};

/** Tolerant reader for backend flags serialized as booleans OR strings. */
export function flagIsTrue(value: boolean | string | null | undefined) {
  if (typeof value === "boolean") return value;
  return typeof value === "string" && value.toLowerCase() === "true";
}

// CohortCourse is the backend "Programme" (the delivery of a Course to a cohort
// in a year), served at /api/training/programmes/. Deployed contract
// (verified 2026-07-11 from /api/schema/): `cohort` is one of the 12 MONTHS
// ("January".."December") plus year/start_date/end_date, a single `course` FK,
// unique on (course, cohort, year). Older Batch A/B/C values still parse.
export type CohortCourse = {
  id: number;
  cohort: Month | Batch | number;
  cohort_name?: string;
  course: number;
  course_details: Course;
  assigned_at?: string;
  assigned_by?: number | null;
  year?: number;
  start_date?: string;
  end_date?: string;
  created_by?: number | null;
};

export type ProgrammeWindow = {
  /** "open" when the content can be used; otherwise why it can't be. */
  state: "before" | "open" | "after";
  startDate: string | null;
  endDate: string | null;
};

/**
 * Whether a programme's training window is currently open.
 *
 * The backend enforces these dates — modules, activities, assessments and live
 * sessions are all refused outside the window — so the UI checks the same
 * dates up front and says what's happening, rather than letting staff walk
 * into an empty page or a bare error.
 *
 * Dates are plain YYYY-MM-DD, so compare by calendar day: a programme ending
 * today is open all day, and one starting today opens at midnight local time.
 * A missing date means that end is unbounded.
 */
export function programmeWindow(
  cohortCourse: CohortCourse | null | undefined,
): ProgrammeWindow {
  const startDate = cohortCourse?.start_date ?? null;
  const endDate = cohortCourse?.end_date ?? null;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  if (startDate && todayKey < startDate) {
    return { state: "before", startDate, endDate };
  }

  if (endDate && todayKey > endDate) {
    return { state: "after", startDate, endDate };
  }

  return { state: "open", startDate, endDate };
}

/** Human label for a programme's cohort across both backend models. */
export function cohortCourseBatchLabel(
  cohortCourse: CohortCourse | null | undefined,
) {
  if (!cohortCourse) return "";

  return typeof cohortCourse.cohort === "string"
    ? cohortCourse.cohort
    : cohortCourse.cohort_name ?? "";
}

export type StaffCourse = {
  enrollment: CourseEnrollment;
  cohortCourse: CohortCourse | null;
  course: Course | null;
  modules: CourseModule[];
};

export type AssessmentOption = {
  id: number;
  text: string;
};

export type AssessmentQuestion = {
  id: number;
  text: string;
  points: number;
  order: number;
  options: AssessmentOption[];
};

export type Assessment = {
  id: number;
  /** Reusable-modules backend (2026-07-12): assessments belong to a Module. */
  module?: number | null;
  module_title?: string;
  /** @deprecated Pre-restructure — assessments used to belong to a Course. */
  course?: number;
  /** @deprecated Renamed module_title in the reusable-modules restructure. */
  course_title?: string;
  type: "PRE_TEST" | "POST_TEST";
  title: string;
  description: string | null;
  pass_mark: string;
  /** Null/0 means unlimited attempts (restructure, 2026-07-10). */
  max_attempts: number | null;
  /** Duration in minutes (reusable-modules backend, 2026-07-12). */
  duration?: number;
  questions: AssessmentQuestion[];
};

/** @deprecated Old model. Replaced by `AssessmentAttempt` (from ./training-types). */
export type AssessmentResult = {
  id: number;
  assessment: number;
  course_title: string;
  assessment_type: string;
  attempt_number: number;
  score: number;
  percentage: string;
  passed: boolean;
  submitted_at: string;
};

export type LiveSession = {
  id: number;
  /** New backend (2026-07): sessions belong to a Programme. Mirrored to cohort_course. */
  programme?: number;
  cohort_course: number;
  course_title: string;
  cohort_name: string;
  /** Which module of the course this session covers (null = whole training). */
  module?: number | null;
  module_title?: string;
  /** Optional session-specific trainer (reusable-modules backend, 2026-07-12). */
  trainer?: number | null;
  trainer_name?: string;
  title: string;
  description: string | null;
  /**
   * @deprecated Staff UIs must NEVER render or open this — joining must go
   * through the backend join endpoint so attendance is recorded first. The
   * backend is expected to stop sending it in staff list payloads.
   */
  meeting_url?: string;
  start_time: string;
  end_time: string;
  status: "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED";
  has_joined: boolean | string;
};

/**
 * The July-2026 backend renamed the enrollment's delivery FK from
 * `cohort_course` to `programme` (and `course_title` to `programme_title`).
 * Mirror the new names onto the old ones so every existing screen keeps working.
 */
export function normalizeEnrollment(
  enrollment: CourseEnrollment,
): CourseEnrollment {
  const programme = enrollment.programme ?? enrollment.cohort_course;
  const title = enrollment.programme_title ?? enrollment.course_title;
  return {
    ...enrollment,
    programme,
    cohort_course: programme,
    programme_title: title,
    course_title: title,
  };
}

/** LiveSessions likewise moved from `cohort_course` to `programme`. */
export function normalizeLiveSession(session: LiveSession): LiveSession {
  const programme = session.programme ?? session.cohort_course;
  return { ...session, programme, cohort_course: programme };
}

function readEnrollments(payload: unknown): CourseEnrollment[] {
  return readApiList<CourseEnrollment>(payload).map(normalizeEnrollment);
}

async function getJson(path: string) {
  const response = await cachedFetch(path);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(payload, `Request failed for ${path}.`),
    );
  }

  return payload;
}

/**
 * Scopes a staff member's assessment attempts to one enrollment, so a course
 * delivered to a staff member again (a refresher) doesn't inherit the previous
 * run's attempts and passes — which would pre-pass its post-tests and silently
 * consume its attempt allowance.
 *
 * The backend now tags each attempt with its `enrollment` (deployed
 * 2026-07-22), so we match on it exactly. Older payloads serialized attempts
 * with no enrollment link (0), so when none of the attempts carry a real
 * enrollment we fall back to the previous heuristic: treat only attempts
 * submitted at/after this enrollment began as belonging to it.
 */
export function attemptsForEnrollment(
  attempts: AssessmentAttempt[],
  enrollment: Pick<CourseEnrollment, "id" | "enrolled_at"> | null | undefined,
): AssessmentAttempt[] {
  if (!enrollment) return attempts;

  // Preferred path: exact match on the backend's enrollment link. Only trust
  // it when at least one attempt actually carries a non-zero enrollment —
  // otherwise an all-zero (older) payload would filter everything out.
  const hasEnrollmentLink = attempts.some(
    (attempt) => (attempt.enrollment ?? 0) > 0,
  );
  if (hasEnrollmentLink && enrollment.id) {
    return attempts.filter((attempt) => attempt.enrollment === enrollment.id);
  }

  // Fallback for older payloads with no enrollment link.
  const enrolledAt = enrollment.enrolled_at
    ? new Date(enrollment.enrolled_at).getTime()
    : NaN;
  if (!Number.isFinite(enrolledAt)) return attempts;

  return attempts.filter((attempt) => {
    const submitted = new Date(
      attempt.submitted_at ?? attempt.submission_time ?? "",
    ).getTime();
    return !Number.isFinite(submitted) || submitted >= enrolledAt;
  });
}

export function toPercentage(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

export function documentIsComplete(
  enrollment: CourseEnrollment | null | undefined,
  documentId: number,
) {
  return Boolean(
    enrollment?.activity_completions?.some(
      (item) => item.activity === documentId && item.is_completed,
    ) ||
      enrollment?.document_progress?.some(
        (item) => item.document === documentId && item.is_completed,
      ),
  );
}

// The restructured serializer nests the module's items as `activities`
// instead of `documents`; accept either so nothing breaks on deploy day.
type RawCourseModule = CourseModule & { activities?: ModuleDocument[] };

function normalizeModule(rawModule: RawCourseModule): CourseModule {
  return {
    ...rawModule,
    documents: rawModule.activities ?? rawModule.documents ?? [],
  };
}

/**
 * Reusable-modules backend (live 2026-07-12): the course payload embeds its
 * ordered modules as `assigned_modules` (M2M through table), so no per-course
 * module fetch is needed. Returns null on pre-restructure payloads so the
 * caller can fall back to the legacy loader.
 */
function modulesFromAssignedModules(
  course: Course | null | undefined,
  courseId: number | undefined,
): CourseModule[] | null {
  if (!course?.assigned_modules) return null;

  return course.assigned_modules
    .slice()
    .sort((first, second) => first.order - second.order)
    .map((link) => ({
      id: link.module_details?.id ?? link.module,
      course: courseId ?? course.id,
      title: link.module_details?.title ?? "",
      description: link.module_details?.description ?? null,
      notes: null,
      order: link.order,
      thumbnail_url: link.module_details?.thumbnail_url ?? null,
      trainers: link.module_details?.trainers ?? [],
      documents:
        (link.module_details?.activities as ModuleDocument[] | undefined) ??
        [],
    }));
}

async function loadModulesForCourse(courseId: number) {
  try {
    const modulePayload = await getJson(
      `/api/training/modules?course=${courseId}`,
    );

    return dedupeById(
      readApiList<RawCourseModule>(modulePayload).map(normalizeModule),
    );
  } catch (filteredError) {
    try {
      const modulePayload = await getJson("/api/training/modules");

      return dedupeById(
        readApiList<RawCourseModule>(modulePayload)
          .filter((rawModule) => rawModule.course === courseId)
          .map(normalizeModule),
      );
    } catch (listError) {
      console.error(
        `Could not load modules for course ${courseId}.`,
        filteredError,
        listError,
      );

      return [];
    }
  }
}

export async function loadStaffCourses() {
  const [enrollmentPayload, cohortCoursePayload] =
    await Promise.all([
      getJson("/api/training/enrollments"),
      getJson("/api/training/programmes"),
    ]);

  const enrollments = readEnrollments(enrollmentPayload);
  const cohortCourses = readApiList<CohortCourse>(cohortCoursePayload);

  // Legacy fallback only: fetch modules per course when the payload predates
  // the reusable-modules restructure (no assigned_modules embedded).
  const legacyCourseIds = Array.from(
    new Set(
      enrollments
        .map((enrollment) =>
          cohortCourses.find((item) => item.id === enrollment.cohort_course),
        )
        .filter(
          (cohortCourse) => !cohortCourse?.course_details?.assigned_modules,
        )
        .map((cohortCourse) => Number(cohortCourse?.course))
        .filter((courseId) => Number.isFinite(courseId)),
    ),
  );

  const legacyModules = (
    await Promise.all(
      legacyCourseIds.map((courseId) => loadModulesForCourse(courseId)),
    )
  ).flat();

  // Orphaned enrollments: when a training is deleted the backend keeps the
  // enrollment for history with programme SET_NULL. There is no course behind
  // them — nothing to open, learn, or certify — so staff screens never show
  // them.
  const liveEnrollments = enrollments.filter(
    (enrollment) =>
      (enrollment.programme ?? enrollment.cohort_course) != null &&
      cohortCourses.some(
        (item) => item.id === (enrollment.programme ?? enrollment.cohort_course),
      ),
  );

  return liveEnrollments.map((enrollment) => {
    const cohortCourse =
      cohortCourses.find((item) => item.id === enrollment.cohort_course) ??
      null;
    const course = cohortCourse?.course_details ?? null;

    // The backend sends `programme_title` as an empty string for some
    // enrollments (and no `course_title`), so the enrollment alone can't be
    // trusted for the display name. Fall back to the course's canonical title.
    const resolvedTitle =
      enrollment.course_title?.trim() ||
      course?.title?.trim() ||
      enrollment.cohort_name ||
      "Course";
    const namedEnrollment: CourseEnrollment = {
      ...enrollment,
      course_title: resolvedTitle,
      programme_title: resolvedTitle,
    };

    const embeddedModules = modulesFromAssignedModules(
      course,
      cohortCourse?.course,
    );

    return {
      enrollment: namedEnrollment,
      cohortCourse,
      course,
      modules:
        embeddedModules ??
        dedupeById(
          legacyModules.filter(
            (module) => module.course === cohortCourse?.course,
          ),
        ).sort((first, second) => first.order - second.order),
    };
  });
}

export async function loadStaffCourse(courseId: number) {
  const courses = await loadStaffCourses();

  return (
    courses.find(
      (item) =>
        item.course?.id === courseId ||
        item.cohortCourse?.course === courseId,
    ) ?? null
  );
}

/**
 * All assessments visible to this staff member, exactly as the backend
 * returns them. Assessments belong to Modules, so the list has one record
 * per assessment — a module reused by several courses does NOT duplicate
 * its assessments. Callers joining these onto courses must preserve that
 * uniqueness (join module→course, never fan out per course and flatten).
 */
export async function loadAllAssessments(): Promise<Assessment[]> {
  const payload = await getJson("/api/training/assessments");
  return readApiList<Assessment>(payload);
}

export async function loadAssessments(courseId: number) {
  const assessments = await loadAllAssessments();

  // Reusable-modules backend: assessments belong to Modules, so scope by the
  // course's assigned module ids (read off the programmes list, which staff
  // can always access). Pre-restructure payloads still carry `course`.
  let moduleIds: Set<number> | null = null;

  try {
    const cohortPayload = await getJson("/api/training/programmes");
    const match = readApiList<CohortCourse>(cohortPayload).find(
      (item) => Number(item.course) === courseId,
    );

    if (match?.course_details?.assigned_modules) {
      moduleIds = new Set(
        match.course_details.assigned_modules.map((link) => link.module),
      );
    }
  } catch {
    // Fall through to the legacy course filter below.
  }

  return assessments.filter((assessment) => {
    if (moduleIds && assessment.module != null) {
      return moduleIds.has(assessment.module);
    }

    return assessment.course === courseId;
  });
}

export async function loadLiveSessionsForCourse(cohortCourseIds: number[]) {
  const payload = await getJson("/api/training/live-sessions");
  const allowedIds = new Set(cohortCourseIds);

  return readApiList<LiveSession>(payload)
    .map(normalizeLiveSession)
    .filter((session) => allowedIds.has(session.cohort_course));
}

// The restructure renamed complete-document to complete-activity. Remembered
// per page load: once the new endpoint answers (or 404s), stop re-probing.
let completeActivityLive: boolean | null = null;

/** Normalized result of marking an activity complete, across both backends. */
export type ActivityCompletionResult = {
  completionPercentage: string | null;
  courseStatus: CourseEnrollment["status"] | null;
};

export async function markDocumentComplete(
  enrollmentId: number,
  documentId: number,
): Promise<ActivityCompletionResult | null> {
  // Both id spellings are sent so either serializer accepts the body.
  const body = JSON.stringify({
    activity: documentId,
    activity_id: documentId,
    document: documentId,
    document_id: documentId,
  });
  const requestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  };

  let response: Response | null = null;

  if (completeActivityLive !== false) {
    response = await fetch(
      `/api/training/enrollments/${enrollmentId}/complete-activity`,
      requestInit,
    );

    if (response.status === 404 && completeActivityLive === null) {
      // Endpoint not shipped yet — fall back to the legacy one below.
      completeActivityLive = false;
      response = null;
    } else {
      completeActivityLive = true;
    }
  }

  if (!response) {
    response = await fetch(
      `/api/training/enrollments/${enrollmentId}/complete-document`,
      requestInit,
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const rawMessage = extractErrorMessage(
      payload,
      "Could not mark this activity complete.",
    );

    // Internal ORM errors occasionally leak through as 400s (e.g. `Cannot
    // query "X": Must be "Module" instance.`). Staff should see a human
    // sentence, not Django internals.
    const looksInternal = /must be .* instance|cannot query|traceback/i.test(
      rawMessage,
    );

    throw new Error(
      looksInternal
        ? "The server could not record your progress due to a backend error. Your place in the course is not lost — please try again later."
        : rawMessage,
    );
  }

  // New backend returns {data: {new_percentage, course_status}}; the legacy
  // one returned the full enrollment. Normalize both.
  const data = readApiItem<{
    new_percentage?: string;
    course_status?: string;
    completion_percentage?: string;
    status?: string;
  }>(payload);

  if (!data) return null;

  return {
    completionPercentage:
      data.new_percentage ?? data.completion_percentage ?? null,
    courseStatus: (data.course_status ??
      data.status ??
      null) as ActivityCompletionResult["courseStatus"],
  };
}

/**
 * Starts (or resumes) an assessment attempt. The backend shuffles questions
 * and options per attempt with a stored seed, so the returned order is stable
 * across refreshes — render it EXACTLY as received, never re-sort.
 * Returns null when the endpoint is unavailable or the payload has no
 * questions, so callers can fall back to the assessment's own question list.
 */
export async function startAssessment(
  assessmentId: number,
  enrollmentId?: number | null,
): Promise<{ questions: AssessmentQuestion[] } | null> {
  let response: Response;

  try {
    // The backend counts attempts PER enrollment, so the enrollment must be
    // explicit — otherwise the same course in a new cohort reuses the old
    // enrollment's exhausted attempts.
    response = await fetch(
      `/api/training/assessments/${assessmentId}/start`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          enrollmentId != null ? { enrollment_id: enrollmentId } : {},
        ),
      },
    );
  } catch {
    // Network failure — fall back to the client-side shuffle.
    return null;
  }

  // 404/405 = old backend without the start endpoint — callers fall back to
  // a client-side shuffle. Any OTHER failure is a real refusal (e.g. 403
  // "Maximum attempts reached"): the exam must NOT open, because without a
  // server-side attempt the submit is guaranteed to fail after the staff has
  // answered everything. Surface it to the caller.
  if (response.status === 404 || response.status === 405) return null;

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(
      extractErrorMessage(errorPayload, "Could not start this assessment."),
    );
  }

  const payload = await response.json().catch(() => null);
  const data = readApiItem<{
    questions?: AssessmentQuestion[];
    assessment?: { questions?: AssessmentQuestion[] };
  }>(payload);

  const questions = data?.questions ?? data?.assessment?.questions;

  if (!Array.isArray(questions) || questions.length === 0) return null;

  return { questions };
}

/** A submission the backend voided because proctoring was invalidated. */
export type ProctoringViolationOutcome = {
  message: string;
  reasons: string[];
};

export type AssessmentSubmission = {
  result: AssessmentResult | null;
  violation: ProctoringViolationOutcome | null;
};

/**
 * Pulls human-readable reasons out of a voided submission's `data`.
 *
 * Deliberately tolerant: the backend reports the detail here, and the exact
 * shape is not pinned down, so accept a list of strings, a list of event
 * objects, or an object wrapping either, and ignore anything unrecognised
 * rather than showing the learner a blank screen or raw JSON.
 */
function readViolationReasons(data: unknown): string[] {
  const fromEntry = (entry: unknown): string | null => {
    if (typeof entry === "string") return entry.trim() || null;
    if (!entry || typeof entry !== "object") return null;

    const record = entry as Record<string, unknown>;
    for (const key of [
      "reason",
      "description",
      "message",
      "detail",
      "event_type",
      "type",
    ]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
  };

  if (Array.isArray(data)) {
    return data.map(fromEntry).filter((item): item is string => item !== null);
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of ["reasons", "violations", "events", "details"]) {
      const value = record[key];
      if (Array.isArray(value)) {
        return value
          .map(fromEntry)
          .filter((item): item is string => item !== null);
      }
    }

    const single = fromEntry(record);
    if (single) return [single];
  }

  return [];
}

const looksLikeResult = (data: unknown) =>
  Boolean(
    data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      "percentage" in (data as Record<string, unknown>),
  );

export async function submitAssessment(
  assessmentId: number,
  answers: { question: number; selected_option: number }[],
  enrollmentId?: number | null,
): Promise<AssessmentSubmission> {
  const response = await fetch(`/api/training/assessments/${assessmentId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // enrollment_id must match the attempt started for this enrollment so the
    // grade and post_test_passed flag land on the right (per-cohort) run.
    body: JSON.stringify(
      enrollmentId != null ? { enrollment_id: enrollmentId, answers } : { answers },
    ),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(payload, "Could not submit this assessment."),
    );
  }

  // A voided attempt comes back as a success: HTTP 200, success true, with the
  // refusal in `message` and the detail in `data`. Reading only `data` would
  // render it as an ordinary result with a blank score, so the message is what
  // distinguishes the two.
  const message =
    payload && typeof payload === "object" && "message" in payload
      ? String((payload as { message?: unknown }).message ?? "")
      : "";
  const data = readApiItem<unknown>(payload);

  if (/proctoring/i.test(message) && !looksLikeResult(data)) {
    return {
      result: null,
      violation: { message: message.trim(), reasons: readViolationReasons(data) },
    };
  }

  return { result: data as AssessmentResult | null, violation: null };
}

/**
 * Loads the staff member's assessment attempts from the server. The server is
 * the only source of truth for results — nothing is cached in localStorage.
 *
 * Deployed 2026-07-14 as StaffAssessmentAttempt: {id, assessment, title,
 * score, percentage, passed, submitted_at}. Normalized onto the richer
 * AssessmentAttempt shape the screens already use.
 */
/**
 * A staff member's own attempts, scoped to one enrolment when given.
 *
 * Scoping matters: attempts are tied to an enrolment, and the same course run
 * in several programmes (Web Dev 2026, 2027, 2028) would otherwise all come
 * back together, inflating the attempt count for whichever run the staff
 * member is actually sitting. Callers still filter client-side, so this stays
 * correct if the backend ignores the parameter.
 */
export async function loadAssessmentAttempts(
  enrollmentId?: number | null,
): Promise<AssessmentAttempt[]> {
  try {
    const query =
      enrollmentId != null ? `?enrollment=${encodeURIComponent(enrollmentId)}` : "";
    const response = await cachedFetch(`/api/training/assessment-attempts${query}`);

    if (!response.ok) return [];

    const payload = await response.json().catch(() => null);

    return readApiList<AssessmentAttempt & { title?: string }>(payload).map(
      (attempt) => ({
        ...attempt,
        enrollment: attempt.enrollment ?? 0,
        attempt_number: attempt.attempt_number ?? 1,
        assessment_title: attempt.assessment_title ?? attempt.title,
      }),
    );
  } catch {
    return [];
  }
}
