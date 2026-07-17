"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Clock,
  ExternalLink,
  Flag,
  Monitor,
  ShieldCheck,
  ShieldX,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  getProctoringSession,
  reviewProctoringSession,
} from "@/app/lib/proctoring";
import type {
  ProctoringEvent,
  ProctoringEventType,
  ProctoringSession,
} from "@/app/lib/training-types";
import { formatDateTime } from "@/app/lib/format";
import { useConfirm } from "@/app/components/useConfirm";
import ProctoringStatusBadge from "@/app/components/ProctoringStatusBadge";

const EVENT_LABELS: Record<ProctoringEventType, string> = {
  NO_FACE: "No face detected",
  MULTIPLE_FACES: "Multiple faces detected",
  IDENTITY_MISMATCH: "Identity mismatch",
  SUSPICIOUS_MOUTH: "Suspicious mouth activity",
  CAMERA_DISABLED: "Camera disabled",
  TAB_SWITCH: "Tab switch",
  WINDOW_BLUR: "Window focus lost",
  FULLSCREEN_EXIT: "Fullscreen exited",
};

// Camera/AI events come from Rekognition; the rest are browser-reported.
const CAMERA_EVENTS: ProctoringEventType[] = [
  "NO_FACE",
  "MULTIPLE_FACES",
  "IDENTITY_MISMATCH",
  "SUSPICIOUS_MOUTH",
];

function eventLabel(event: ProctoringEvent) {
  return (
    event.event_type_display ||
    EVENT_LABELS[event.event_type] ||
    event.event_type
  );
}

export default function ProctoringSessionDetailPage() {
  const params = useParams();
  const sessionId = Number(params.id);

  const invalidId = !Number.isFinite(sessionId);
  const { confirm, dialog } = useConfirm();

  const [session, setSession] = useState<ProctoringSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewNotice, setReviewNotice] = useState("");

  const handleReview = async (status: "CLEAN" | "INVALIDATED" | "FLAGGED") => {
    if (status === "INVALIDATED") {
      const confirmed = await confirm(
        "Invalidate this proctoring session? This records a reviewer decision that the session cannot be trusted. Review the event timeline and evidence first.",
        { danger: true },
      );
      if (!confirmed) return;
    }

    setReviewing(true);
    setReviewNotice("");
    setError("");

    try {
      await reviewProctoringSession(sessionId, status);
      setSession(await getProctoringSession(sessionId));
      setReviewNotice(
        status === "CLEAN"
          ? "Session marked clean — the attempt stands."
          : status === "INVALIDATED"
            ? "Session invalidated."
            : "Session flagged for further review.",
      );
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Could not update this session's status.",
      );
    } finally {
      setReviewing(false);
    }
  };

  useEffect(() => {
    if (invalidId) return;

    const fetchSession = async () => {
      try {
        setSession(await getProctoringSession(sessionId));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load this proctoring session.",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchSession();
  }, [sessionId, invalidId]);

  const sortedEvents = useMemo(
    () =>
      (session?.events ?? [])
        .slice()
        .sort((first, second) =>
          (second.occurrence_time ?? "").localeCompare(
            first.occurrence_time ?? "",
          ),
        ),
    [session?.events],
  );

  if (invalidId) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Link
          href="/admin/proctoring"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#1a6b3c]"
        >
          <ArrowLeft size={16} /> Back to Proctoring
        </Link>
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          Invalid session id.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-10 text-sm text-gray-500">
        Loading proctoring session...
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Link
          href="/admin/proctoring"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#1a6b3c]"
        >
          <ArrowLeft size={16} /> Back to Proctoring
        </Link>
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error || "This proctoring session could not be found."}
        </div>
      </div>
    );
  }

  const similarity =
    session.verification_similarity !== null
      ? Math.round(Number(session.verification_similarity))
      : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {dialog}
      <Link
        href="/admin/proctoring"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#1a6b3c]"
      >
        <ArrowLeft size={16} /> Back to Proctoring
      </Link>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="mb-1 text-2xl font-bold text-gray-800">
              Session #{session.id}
            </h1>
            <p className="text-sm text-gray-500">
              {session.staff_email} · Attempt #{session.attempt_id}
            </p>
          </div>
          <ProctoringStatusBadge
            status={session.status}
            label={session.status_display}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            {session.identity_verified ? (
              <UserCheck size={18} className="mb-2 text-[#1a6b3c]" />
            ) : (
              <UserX size={18} className="mb-2 text-red-500" />
            )}
            <p className="text-xs font-medium text-gray-500">Identity</p>
            <p
              className={`text-sm font-bold ${
                session.identity_verified ? "text-[#1a6b3c]" : "text-red-600"
              }`}
            >
              {session.identity_verified ? "Verified" : "Not verified"}
              {similarity !== null && ` (${similarity}%)`}
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <Flag
              size={18}
              className={`mb-2 ${
                session.total_flags > 0 ? "text-amber-500" : "text-gray-400"
              }`}
            />
            <p className="text-xs font-medium text-gray-500">Total flags</p>
            <p className="text-sm font-bold text-gray-800">
              {session.total_flags}
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <Clock size={18} className="mb-2 text-gray-400" />
            <p className="text-xs font-medium text-gray-500">Started</p>
            <p className="text-sm font-bold text-gray-800">
              {session.start_time ? formatDateTime(session.start_time) : "—"}
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <Clock size={18} className="mb-2 text-gray-400" />
            <p className="text-xs font-medium text-gray-500">Ended</p>
            <p className="text-sm font-bold text-gray-800">
              {session.end_time
                ? formatDateTime(session.end_time)
                : "In progress"}
            </p>
          </div>
        </div>

        {session.status === "FLAGGED" && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <p>
              This attempt was flagged by the monitoring system. Review the
              events below — AI-detected activity is a review signal, not
              automatic proof of misconduct.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-800">
          <ShieldCheck size={20} className="text-[#1a6b3c]" />
          Event Timeline
        </h2>

        {sortedEvents.length === 0 ? (
          <div className="py-8 text-center">
            <ShieldCheck className="mx-auto mb-3 text-green-200" size={42} />
            <p className="font-semibold text-gray-700">No events recorded.</p>
            <p className="mt-1 text-sm text-gray-500">
              The monitoring system did not detect anything unusual during this
              session.
            </p>
          </div>
        ) : (
          <ol className="space-y-4">
            {sortedEvents.map((event) => {
              const isCameraEvent = CAMERA_EVENTS.includes(event.event_type);

              return (
                <li
                  key={event.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        isCameraEvent
                          ? "bg-red-50 text-red-500"
                          : "bg-blue-50 text-blue-500"
                      }`}
                    >
                      {isCameraEvent ? (
                        <Camera size={18} />
                      ) : (
                        <Monitor size={18} />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">
                        {eventLabel(event)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(event.occurrence_time)}
                        {event.confidence_score !== null &&
                          event.confidence_score !== undefined &&
                          ` · Confidence ${Math.round(
                            Number(event.confidence_score),
                          )}%`}
                      </p>
                    </div>
                  </div>

                  {event.evidence_url && (
                    <button
                      type="button"
                      onClick={() =>
                        setEvidencePreview(event.evidence_url ?? null)
                      }
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-[#1a6b3c] hover:text-[#1a6b3c]"
                    >
                      <Camera size={14} /> View evidence
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-6 border-t border-gray-100 pt-5">
          <p className="mb-1 text-sm font-bold text-gray-800">
            Reviewer decision
          </p>
          <p className="mb-4 text-xs text-gray-500">
            AI flags are signals, not proof. After examining the timeline and
            evidence, record your decision — it overrides the automatic
            status.
          </p>

          {reviewNotice && (
            <p className="mb-3 rounded-lg bg-green-50 p-3 text-xs text-green-700">
              {reviewNotice}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleReview("CLEAN")}
              disabled={reviewing}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#145530] disabled:opacity-50"
            >
              <ShieldCheck size={16} /> Mark clean
            </button>
            <button
              type="button"
              onClick={() => handleReview("FLAGGED")}
              disabled={reviewing}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
            >
              <Flag size={16} /> Keep flagged
            </button>
            <button
              type="button"
              onClick={() => handleReview("INVALIDATED")}
              disabled={reviewing}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              <ShieldX size={16} /> Invalidate attempt
            </button>
          </div>
        </div>
      </div>

      {evidencePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setEvidencePreview(null)}
        >
          <div className="max-h-[85vh] max-w-3xl overflow-auto rounded-2xl bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={evidencePreview}
              alt="Proctoring evidence"
              className="max-h-[70vh] w-full rounded-xl object-contain"
            />
            <div className="mt-3 flex items-center justify-between">
              <a
                href={evidencePreview}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1a6b3c] hover:underline"
              >
                <ExternalLink size={14} /> Open original
              </a>
              <button
                type="button"
                onClick={() => setEvidencePreview(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
