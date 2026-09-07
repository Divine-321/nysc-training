"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Loader2, Radio, Video } from "lucide-react";
import {
  loadLiveSessionsForCourse,
  type LiveSession,
} from "@/app/lib/staff-learning";
import { extractErrorMessage, readApiItem } from "@/app/lib/portal-api";

/**
 * Live sessions that cover a whole training rather than one module, shown as
 * its own card in the course overview page's module grid — same visual
 * language as a Module card and the closing "Final Step" evaluation card,
 * positioned between them.
 *
 * The module player only shows sessions tagged to a module
 * (`session.module === module.id`), so a session left untagged — the admin's
 * "General / whole training" option — has nowhere else to appear. The
 * backend still counts it towards completion, so it quietly holds back
 * progress and blocks certificates if staff never see it.
 */

const DOT_TEXTURE = {
  backgroundImage:
    "radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)",
  backgroundSize: "16px 16px",
} as const;

const formatWhen = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Date to be confirmed"
    : parsed.toLocaleString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const hasEnded = (session: LiveSession, now: number) => {
  // The backend leaves status at SCHEDULED/ONGOING after a session ends, so
  // the end time is the reliable signal — same rule the module player uses.
  if (session.status === "COMPLETED" || session.status === "CANCELLED") {
    return true;
  }
  const end = new Date(session.end_time).getTime();
  return !Number.isNaN(end) && end < now;
};

const attended = (session: LiveSession) =>
  session.has_joined === true || session.has_joined === "true";

export default function CourseLiveSessions({
  cohortCourseId,
  variant,
  onSessionsChange,
}: {
  cohortCourseId: number;
  /** Matches whichever layout the surrounding module grid is currently in. */
  variant: "grid" | "list";
  /**
   * Fired once the course's general sessions are known (and again after a
   * join), so the overview page can gate the evaluation card on them — it
   * has no other way to see this component's data, since the fetch lives in
   * here rather than being lifted up.
   */
  onSessionsChange?: (sessions: LiveSession[]) => void;
}) {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  // Captured once per render pass rather than ticking, so an open page does
  // not re-render every second just to grey out a session that has ended.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let active = true;

    loadLiveSessionsForCourse([cohortCourseId])
      .then((all) => {
        if (!active) return;
        // module == null is the admin's "whole training" choice. Anything
        // tagged to a module is shown inside that module instead.
        setSessions(all.filter((session) => session.module == null));
      })
      .catch(() => {
        // A missing sessions list should never take down the course page.
        if (active) setSessions([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [cohortCourseId]);

  // Only reported once real data has landed — an empty array from the
  // initial render, before the fetch resolves, would otherwise tell the
  // parent "nothing to attend" for a moment and briefly unlock the
  // evaluation card before the real answer arrives.
  useEffect(() => {
    if (!loading) onSessionsChange?.(sessions);
  }, [loading, sessions, onSessionsChange]);

  const handleJoin = useCallback(async (session: LiveSession) => {
    setJoiningId(session.id);
    setNotice("");

    // Opened before awaiting so popup blockers treat it as a click.
    const meetingTab = window.open("about:blank", "_blank");

    try {
      // Never link `session.meeting_url` directly — going through the join
      // endpoint is what records attendance, and attendance is what the
      // certificate rule counts.
      const response = await fetch(
        `/api/training/live-sessions/${session.id}/join`,
        { method: "POST" },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not join this live session."),
        );
      }

      const joinData = readApiItem<{ meeting_url?: string }>(payload);

      if (!joinData?.meeting_url) {
        throw new Error(
          "Attendance was recorded, but no meeting link was returned.",
        );
      }

      if (meetingTab) {
        meetingTab.location.href = joinData.meeting_url;
      } else {
        window.open(joinData.meeting_url, "_blank", "noopener,noreferrer");
      }

      setSessions((current) =>
        current.map((item) =>
          item.id === session.id ? { ...item, has_joined: true } : item,
        ),
      );
    } catch (joinError) {
      meetingTab?.close();
      setNotice(
        joinError instanceof Error
          ? joinError.message
          : "Could not join this live session.",
      );
    } finally {
      setJoiningId(null);
    }
  }, []);

  // Nothing to announce: no general sessions on this training.
  if (loading || sessions.length === 0) return null;

  const allAttended = sessions.every(
    (session) => attended(session) || hasEnded(session, now),
  );
  const single = sessions.length === 1 ? sessions[0] : null;

  const SessionRow = ({ session }: { session: LiveSession }) => {
    const ended = hasEnded(session, now);
    const joined = attended(session);

    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-800">
            {session.title}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
            <CalendarClock size={12} />
            {formatWhen(session.start_time)}
          </p>
        </div>

        {joined ? (
          <span className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
            Attended
          </span>
        ) : ended ? (
          <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500">
            Ended
          </span>
        ) : (
          <button
            type="button"
            onClick={() => handleJoin(session)}
            disabled={joiningId === session.id}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a6b3c] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#145530] disabled:opacity-60"
          >
            {joiningId === session.id ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Video size={13} />
            )}
            {joiningId === session.id ? "Joining..." : "Join"}
          </button>
        )}
      </div>
    );
  };

  const badge = (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-gray-700 shadow-sm">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          allAttended ? "bg-emerald-500" : "bg-blue-500 animate-pulse"
        }`}
      />
      {allAttended ? "Attended" : "Live session"}
    </span>
  );

  if (variant === "list") {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white">
          <div className="absolute inset-0" style={DOT_TEXTURE} />
          <Radio size={26} className="relative" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-bold text-gray-800">
              {single?.title || "Live sessions for this training"}
            </h3>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-600">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  allAttended ? "bg-emerald-500" : "bg-blue-500 animate-pulse"
                }`}
              />
              {allAttended ? "Attended" : "Live"}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-sm text-gray-500">
            Covers the whole course, not one module.
            {notice ? ` ${notice}` : ""}
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:min-w-[220px]">
          {sessions.map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:shadow-xl">
      <div className="relative h-28 overflow-hidden bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700">
        <div className="absolute inset-0" style={DOT_TEXTURE} />
        <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-sky-300/40 blur-2xl" />
        <Radio
          size={104}
          strokeWidth={1.25}
          className="absolute -bottom-3 right-1 text-white/15"
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
            Live Session
          </span>
          {badge}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="mb-1.5 line-clamp-2 font-bold leading-snug text-gray-800">
            {single?.title || `${sessions.length} live sessions`}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-gray-500">
            Covers the whole course, not one module.
          </p>
        </div>

        {notice ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {notice}
          </p>
        ) : null}

        <div className="mt-auto space-y-2 pt-1">
          {sessions.map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </div>
      </div>
    </div>
  );
}
