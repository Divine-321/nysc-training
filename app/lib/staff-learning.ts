import {
  dedupeById,
  extractErrorMessage,
  readApiItem,
  readApiList,
  type Course,
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
} from "@/app/lib/training-types";

export { BATCH_OPTIONS } from "@/app/lib/training-types";
export type {
  Activity,
  ActivityContentType,
  ActivityCompletion,
  AssessmentAttempt,
  AssessmentAttemptStatus,
  Batch,
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
};

/** @deprecated Old model. Replaced by `Module` (from ./training-types) in the restructure. */
export type CourseModule = {
  id: number;
  course: number;
  title: string;
  description: string | null;
  notes: string | null;
  order: number;
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
  cohort_course: number;
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

// CohortCourse is the "Training Programme" (delivery of a Course to a fixed
// Batch in a year). OLD backend: `cohort` is a Cohort FK (number) and
// `cohort_name` is derived. NEW backend (confirmed contract, 2026-07-10):
// `cohort` IS the batch string ("BATCH A" | "BATCH B" | "BATCH C") plus
// year/start_date/end_date, unique on (course, cohort, year).
export type CohortCourse = {
  id: number;
  cohort: number | Batch;
  cohort_name?: string;
  course: number;
  course_details: Course;
  assigned_at?: string;
  year?: number;
  start_date?: string;
  end_date?: string;
  created_by?: number | null;
};

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
  course: number;
  course_title: string;
  type: "PRE_TEST" | "POST_TEST";
  title: string;
  description: string | null;
  pass_mark: string;
  /** Null/0 means unlimited attempts (restructure, 2026-07-10). */
  max_attempts: number | null;
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
  cohort_course: number;
  course_title: string;
  cohort_name: string;
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

async function getJson(path: string) {
  const response = await fetch(path, { cache: "no-store" });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(payload, `Request failed for ${path}.`),
    );
  }

  return payload;
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
      getJson("/api/training/cohort-courses"),
    ]);

  const enrollments = readApiList<CourseEnrollment>(enrollmentPayload);
  const cohortCourses = readApiList<CohortCourse>(cohortCoursePayload);
  const assignedCourseIds = Array.from(
    new Set(
      enrollments
        .map((enrollment) =>
          cohortCourses.find((item) => item.id === enrollment.cohort_course),
        )
        .map((cohortCourse) => Number(cohortCourse?.course))
        .filter((courseId) => Number.isFinite(courseId)),
    ),
  );

  const modules = (
    await Promise.all(
      assignedCourseIds.map((courseId) => loadModulesForCourse(courseId)),
    )
  ).flat();

  return enrollments.map((enrollment) => {
    const cohortCourse =
      cohortCourses.find((item) => item.id === enrollment.cohort_course) ??
      null;
    const course = cohortCourse?.course_details ?? null;

    return {
      enrollment,
      cohortCourse,
      course,
      modules: dedupeById(
        modules.filter((module) => module.course === cohortCourse?.course),
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

export async function loadAssessments(courseId: number) {
  const payload = await getJson("/api/training/assessments");

  return readApiList<Assessment>(payload).filter(
    (assessment) => assessment.course === courseId,
  );
}

export async function loadLiveSessionsForCourse(cohortCourseIds: number[]) {
  const payload = await getJson("/api/training/live-sessions");
  const allowedIds = new Set(cohortCourseIds);

  return readApiList<LiveSession>(payload).filter((session) =>
    allowedIds.has(session.cohort_course),
  );
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
    throw new Error(
      extractErrorMessage(payload, "Could not mark this activity complete."),
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

export async function submitAssessment(
  assessmentId: number,
  answers: { question: number; selected_option: number }[],
) {
  const response = await fetch(`/api/training/assessments/${assessmentId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(payload, "Could not submit this assessment."),
    );
  }

  return readApiItem<AssessmentResult>(payload);
}

/**
 * Loads the staff member's assessment attempts from the server. The server is
 * the only source of truth for results — nothing is cached in localStorage.
 *
 * The attempts endpoint is part of the AssessmentAttempt restructure and is
 * not live on the backend yet, so this returns [] (instead of throwing) until
 * it ships; the result/CBT screens then light up automatically.
 */
export async function loadAssessmentAttempts(): Promise<AssessmentAttempt[]> {
  try {
    const response = await fetch("/api/training/assessment-attempts", {
      cache: "no-store",
    });

    if (!response.ok) return [];

    const payload = await response.json().catch(() => null);

    return readApiList<AssessmentAttempt>(payload);
  } catch {
    return [];
  }
}
