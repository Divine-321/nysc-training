import {
  extractErrorMessage,
  readApiItem,
  readApiList,
} from "@/app/lib/portal-api";
import type {
  ProctoringEventType,
  ProctoringFrameResult,
  ProctoringSession,
  ProctoringSessionSummary,
  ProctoringStartResult,
  BrowserProctoringEventType,
} from "@/app/lib/training-types";
import { cachedFetch } from "@/app/lib/data-cache";

// Client for the live proctoring API (AWS Rekognition, backend-mediated).
// All calls go through the local /api proxy routes so tokens stay in
// httpOnly cookies. The response payloads are parsed tolerantly because the
// published OpenAPI schema for these endpoints is looser than the real data.

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function pickNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed = Number(value);
    if (value !== null && value !== undefined && Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

async function postJson(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);

  return { response, payload };
}

/**
 * Pre-assessment identity verification. Sends the captured camera image plus
 * the assessment/enrollment ids; on success the backend atomically creates
 * the attempt and its ProctoringSession.
 */
export async function startProctoringSession(input: {
  assessmentId: number;
  enrollmentId: number;
  imageData: string;
}): Promise<ProctoringStartResult> {
  const { response, payload } = await postJson(
    "/api/training/proctoring/sessions/start",
    {
      assessment_id: input.assessmentId,
      enrollment_id: input.enrollmentId,
      image_data: input.imageData,
    },
  );

  const message = extractErrorMessage(
    payload,
    response.ok
      ? "Identity verified."
      : "Identity verification failed. Please try again.",
  );

  if (!response.ok) {
    return {
      verified: false,
      sessionId: null,
      attemptId: null,
      similarity: null,
      message,
    };
  }

  const data = asRecord(readApiItem(payload));
  const session = asRecord(data.session ?? data.proctoring_session);

  return {
    verified: true,
    sessionId: pickNumber(data.session_id, session.id, data.id),
    attemptId: pickNumber(
      data.attempt_id,
      data.result_id,
      asRecord(data.attempt).id,
      asRecord(data.result).id,
    ),
    similarity: pickNumber(
      data.verification_similarity,
      data.similarity,
      session.verification_similarity,
    ),
    message,
  };
}

/**
 * Uploads one periodic monitoring frame. Never throws — a failed frame must
 * not crash a running exam; the caller just tries again on the next tick.
 */
export async function sendProctoringFrame(
  sessionId: number,
  imageData: string,
): Promise<ProctoringFrameResult> {
  try {
    const { response, payload } = await postJson(
      `/api/training/proctoring/sessions/${sessionId}/frame`,
      { image_data: imageData },
    );

    const data = asRecord(readApiItem(payload));
    const eventsDetected = Array.isArray(data.events_detected)
      ? (data.events_detected.filter(
          (item) => typeof item === "string",
        ) as ProctoringEventType[])
      : [];

    return {
      eventsDetected,
      message: response.ok
        ? ""
        : extractErrorMessage(payload, "Could not upload monitoring frame."),
    };
  } catch {
    return { eventsDetected: [], message: "Could not upload monitoring frame." };
  }
}

/**
 * Reports a browser-detected event (tab switch, window blur, fullscreen exit,
 * camera disabled). Fire-and-forget: failures are swallowed.
 */
export async function reportBrowserEvent(
  sessionId: number,
  eventType: BrowserProctoringEventType,
): Promise<void> {
  try {
    await postJson(
      `/api/training/proctoring/sessions/${sessionId}/browser-event`,
      { event_type: eventType },
    );
  } catch {
    // Never interrupt the exam over a failed telemetry call.
  }
}

/** Ends the proctoring session when the staff member submits the assessment. */
export async function closeProctoringSession(sessionId: number): Promise<void> {
  try {
    await postJson(`/api/training/proctoring/sessions/${sessionId}/close`);
  } catch {
    // The backend also times sessions out server-side; ignore close failures.
  }
}

// The backend's review views currently reject portal admin/superadmin roles
// (permission bug reported 2026-07-10). Show what that means instead of DRF's
// raw "You do not have permission to perform this action."
const REVIEW_ACCESS_403_MESSAGE =
  "Proctoring review access hasn't been enabled for admin accounts on the " +
  "backend yet. The backend team has been notified — sessions will appear " +
  "here as soon as the permission fix is deployed.";

/** Admin: list all proctoring sessions. */
export async function listProctoringSessions(): Promise<
  ProctoringSessionSummary[]
> {
  const response = await cachedFetch("/api/training/proctoring/sessions");
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? REVIEW_ACCESS_403_MESSAGE
        : extractErrorMessage(payload, "Could not load proctoring sessions."),
    );
  }

  return readApiList<ProctoringSessionSummary>(payload);
}

/**
 * Admin: manually override a session's status (e.g. clear a false flag or
 * invalidate a confirmed violation). Returns the error message on failure.
 */
export async function reviewProctoringSession(
  sessionId: number,
  status: "CLEAN" | "INVALIDATED" | "FLAGGED",
  /** Optional reason recorded alongside the decision. */
  reviewNote?: string,
): Promise<void> {
  const { response, payload } = await postJson(
    `/api/training/proctoring/sessions/${sessionId}/review`,
    reviewNote?.trim()
      ? { status, review_note: reviewNote.trim() }
      : { status },
  );

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(payload, "Could not update this session's status."),
    );
  }
}

/** Admin: full session detail including all recorded events. */
export async function getProctoringSession(
  sessionId: number,
): Promise<ProctoringSession | null> {
  const response = await cachedFetch(`/api/training/proctoring/sessions/${sessionId}`);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? REVIEW_ACCESS_403_MESSAGE
        : extractErrorMessage(payload, "Could not load this proctoring session."),
    );
  }

  return readApiItem<ProctoringSession>(payload);
}
