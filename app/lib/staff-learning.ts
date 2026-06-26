import {
  extractErrorMessage,
  readApiItem,
  readApiList,
  type Course,
} from "@/app/lib/portal-api";

export type ModuleDocument = {
  id: number;
  module: number;
  title: string;
  doc_type: "VIDEO" | "PDF" | "PPT" | "IMAGE" | "OTHER";
  file_url: string;
  cloudinary_public_id: string | null;
  order: number;
};

export type CourseModule = {
  id: number;
  course: number;
  title: string;
  description: string | null;
  notes: string | null;
  order: number;
  documents: ModuleDocument[];
};

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
  document_progress: DocumentProgress[];
  evaluation: CourseEvaluation | null;
  last_accessed: string;
  enrolled_at: string;
  completed_at: string | null;
};

export type CohortCourse = {
  id: number;
  cohort: number;
  cohort_name: string;
  course: number;
  course_details: Course;
  assigned_at: string;
};

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
  max_attempts: number;
  questions: AssessmentQuestion[];
};

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
  meeting_url: string;
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
    enrollment?.document_progress?.some(
      (item) => item.document === documentId && item.is_completed,
    ),
  );
}

async function loadModulesForCourse(courseId: number) {
  try {
    const modulePayload = await getJson(
      `/api/training/modules?course=${courseId}`,
    );

    return readApiList<CourseModule>(modulePayload);
  } catch (filteredError) {
    try {
      const modulePayload = await getJson("/api/training/modules");

      return readApiList<CourseModule>(modulePayload).filter(
        (module) => module.course === courseId,
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
        .map((cohortCourse) => cohortCourse?.course)
        .filter((courseId): courseId is number => typeof courseId === "number"),
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
      modules: modules
        .filter((module) => module.course === cohortCourse?.course)
        .sort((first, second) => first.order - second.order),
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

export async function markDocumentComplete(
  enrollmentId: number,
  documentId: number,
) {
  const response = await fetch(
    `/api/training/enrollments/${enrollmentId}/complete-document`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document: documentId,
        document_id: documentId,
      }),
    },
  );
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(payload, "Could not mark this document complete."),
    );
  }

  return readApiItem<CourseEnrollment>(payload);
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

  const result = readApiItem<AssessmentResult>(payload);

  if (result) {
    saveAssessmentResult(result);
  }

  return result;
}

const ASSESSMENT_RESULTS_STORAGE_KEY = "nysc-assessment-results";

export function readStoredAssessmentResults() {
  if (typeof window === "undefined") return [];

  try {
    const rawResults = window.localStorage.getItem(
      ASSESSMENT_RESULTS_STORAGE_KEY,
    );

    return rawResults ? (JSON.parse(rawResults) as AssessmentResult[]) : [];
  } catch {
    return [];
  }
}

export function saveAssessmentResult(result: AssessmentResult) {
  if (typeof window === "undefined") return;

  const existingResults = readStoredAssessmentResults();
  const withoutDuplicate = existingResults.filter(
    (item) => item.id !== result.id,
  );

  window.localStorage.setItem(
    ASSESSMENT_RESULTS_STORAGE_KEY,
    JSON.stringify([result, ...withoutDuplicate]),
  );
}
