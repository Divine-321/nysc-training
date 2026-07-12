/**
 * Target learning-model types for the NYSC E-Training restructure.
 *
 * New hierarchy:  Course -> Module -> Activity  (Activity may own an Assessment).
 *
 * Old -> new mapping during the transition:
 *   old portal-api `Course`            -> new `Module`
 *   old staff-learning `CourseModule`  -> new `Module` grouping of activities
 *   old `ModuleDocument`               -> new `Activity` (content collapses onto the activity)
 *
 * These types describe the *target* backend contract and back the new proxy routes
 * (activities, activity-completion, assessment-attempts, identity-verification,
 * proctoring, live-session join-redirect). They are ADDITIVE: the existing old-model
 * types in ./staff-learning.ts and ./portal-api.ts stay in place until each consuming
 * screen migrates (restructure Phases 2-3).
 *
 * NOTE: src/types/openapi.ts is generated from the live (old) schema via `npm run
 * gen:types`. Re-run that once the backend ships the new schema; until then this file
 * is the hand-authored source of truth for the new model.
 */

// ---------------------------------------------------------------------------
// Course -> Module -> Activity
// ---------------------------------------------------------------------------

// Exact deployed backend enum (ContentTypeEnum, verified 2026-07-10):
// EXTERNAL (not EXTERNAL_LINK), plus PPT and ASSESSMENT.
export type ActivityContentType =
  | "VIDEO"
  | "PDF"
  | "PPT"
  | "TEXT"
  | "AUDIO"
  | "EXTERNAL"
  | "ASSESSMENT";

export type Activity = {
  id: number;
  module: number; // Module FK
  title: string;
  content_type: ActivityContentType;
  /** Used by VIDEO / PDF / AUDIO / EXTERNAL_LINK. */
  content_url: string | null;
  /** Used by TEXT. */
  text_content: string | null;
  order: number;
  /** An Activity may optionally have an Assessment (Pre-Test / Post-Test). */
  assessment?: number | null;
  has_assessment?: boolean;
};

export type Module = {
  id: number;
  course: number; // new top-level Course FK
  title: string;
  description: string | null;
  order: number;
  activities: Activity[];
  /** 0-100, completed activities / total activities. Provided by the backend. */
  progress_percentage?: number;
  is_complete?: boolean;
};

/** New top-level learning container (the "training programme" content shell). */
export type Course = {
  id: number;
  title: string;
  description: string;
  thumbnail_url: string | null;
  category: number | null;
  category_name?: string;
  trainers?: { id: number; full_name: string }[];
  modules: Module[];
  /** 0-100, equal module weighting. Provided by the backend. */
  progress_percentage?: number;
};

// ---------------------------------------------------------------------------
// Progress tracking:  ActivityCompletion -> Module progress -> Course progress
// ---------------------------------------------------------------------------

export type ActivityCompletion = {
  id: number;
  enrollment: number;
  activity: number;
  activity_title?: string;
  is_completed: boolean;
  completed_at: string | null;
};

// ---------------------------------------------------------------------------
// Assessment attempts (replaces the old single AssessmentResult)
// ---------------------------------------------------------------------------

export type AssessmentAttemptStatus =
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "FLAGGED"
  | "INVALIDATED";

// Aligned to the deployed serializer (2026-07-10): submitted_at + staff_name;
// attempt_status / is_official_result / start_time are NOT returned (kept
// optional in case a later deploy adds them).
export type AssessmentAttempt = {
  id: number;
  enrollment: number;
  assessment: number;
  attempt_number: number;
  score: number | null;
  percentage: string | null;
  passed: boolean;
  submitted_at?: string;
  staff_name?: string;
  assessment_type?: string;
  course_title?: string;
  assessment_title?: string;
  start_time?: string | null;
  submission_time?: string | null;
  attempt_status?: AssessmentAttemptStatus;
  is_official_result?: boolean;
};

// ---------------------------------------------------------------------------
// Cohort is a fixed classification. The deployed backend (verified 2026-07-11
// from /api/schema/ CohortEnum) uses the 12 MONTHS: "January" .. "December".
// The old "BATCH A/B/C" values are kept only so older data still renders.
// ---------------------------------------------------------------------------

export type Month =
  | "January"
  | "February"
  | "March"
  | "April"
  | "May"
  | "June"
  | "July"
  | "August"
  | "September"
  | "October"
  | "November"
  | "December";

export const MONTH_OPTIONS: { value: Month; label: string }[] = [
  { value: "January", label: "January" },
  { value: "February", label: "February" },
  { value: "March", label: "March" },
  { value: "April", label: "April" },
  { value: "May", label: "May" },
  { value: "June", label: "June" },
  { value: "July", label: "July" },
  { value: "August", label: "August" },
  { value: "September", label: "September" },
  { value: "October", label: "October" },
  { value: "November", label: "November" },
  { value: "December", label: "December" },
];

/** @deprecated The backend switched cohort from Batch A/B/C to the 12 months. */
export type Batch = "BATCH A" | "BATCH B" | "BATCH C";

/** @deprecated Use MONTH_OPTIONS. Kept so pre-migration Batch data still renders. */
export const BATCH_OPTIONS: { value: Batch; label: string }[] = [
  { value: "BATCH A", label: "Batch A" },
  { value: "BATCH B", label: "Batch B" },
  { value: "BATCH C", label: "Batch C" },
];

// ---------------------------------------------------------------------------
// Proctoring & identity verification (AWS Rekognition, backend-mediated)
//
// These types mirror the LIVE backend schema (already shipped):
//   POST /api/training/proctoring/sessions/start/            (verify identity + open session)
//   POST /api/training/proctoring/sessions/{id}/frame/        (periodic monitoring frame)
//   POST /api/training/proctoring/sessions/{id}/browser-event/(tab switch, blur, ...)
//   POST /api/training/proctoring/sessions/{id}/close/        (end session on submit)
//   GET  /api/training/proctoring/sessions/(+{id}/)           (admin review)
// ---------------------------------------------------------------------------

export type ProctoringSessionStatus =
  | "ACTIVE"
  | "CLEAN"
  | "FLAGGED"
  | "INVALIDATED";

export type ProctoringEventType =
  | "NO_FACE"
  | "MULTIPLE_FACES"
  | "IDENTITY_MISMATCH"
  | "SUSPICIOUS_MOUTH"
  | "CAMERA_DISABLED"
  | "TAB_SWITCH"
  | "WINDOW_BLUR"
  | "FULLSCREEN_EXIT";

/** Subset of event types the FRONTEND is allowed to report via browser-event. */
export type BrowserProctoringEventType =
  | "CAMERA_DISABLED"
  | "FULLSCREEN_EXIT"
  | "TAB_SWITCH"
  | "WINDOW_BLUR";

export type ProctoringEventReviewStatus = string;

export type ProctoringEvent = {
  id: number;
  event_type: ProctoringEventType;
  event_type_display?: string;
  /** Decimal string (0-100) from Rekognition; null for browser events. */
  confidence_score: string | null;
  occurrence_time: string;
  evidence_url?: string | null;
  metadata?: unknown;
  review_status?: ProctoringEventReviewStatus;
  review_status_display?: string;
};

/** Full session detail (admin review; includes nested events). */
export type ProctoringSession = {
  id: number;
  attempt_id: number;
  staff_email: string;
  identity_verified: boolean;
  /** Decimal string (0-100) face similarity from Rekognition. */
  verification_similarity: string | null;
  status: ProctoringSessionStatus;
  status_display?: string;
  start_time: string | null;
  end_time: string | null;
  total_flags: number;
  reviewer?: number | null;
  events: ProctoringEvent[];
};

/** Lightweight session shape used in list views. */
export type ProctoringSessionSummary = {
  id: number;
  staff_email: string;
  status: ProctoringSessionStatus;
  status_display?: string;
  total_flags: number;
  start_time: string | null;
  end_time: string | null;
};

/**
 * Normalised result of POST proctoring/sessions/start/ (identity verification).
 * The client lib parses the response tolerantly since the published schema is
 * looser than the actual payload.
 */
export type ProctoringStartResult = {
  verified: boolean;
  /** ProctoringSession id — needed for frame/browser-event/close calls. */
  sessionId: number | null;
  /** Assessment attempt/result id created alongside the session. */
  attemptId: number | null;
  similarity: number | null;
  message: string;
};

/** Response of a frame upload: event types raised by that frame (if any). */
export type ProctoringFrameResult = {
  eventsDetected: ProctoringEventType[];
  message: string;
};
