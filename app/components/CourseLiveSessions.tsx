"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Loader2, Radio, Video } from "lucide-react";
import {
  loadLiveSessionsForCourse,
  type LiveSession,
} from "@/app/lib/staff-learning";
import { extractErrorMessage, readApiItem } from "@/app/lib/portal-api";

/**
 * Live sessions that cover a whole training rather than one module.
 *
 * The module player only shows sessions tagged to a module
 * (`session.module === module.id`), so a session left untagged — the admin's
 * "General / whole training" option — had nowhere to appear and staff never
 * saw it. The backend still counted it towards `total_sessions`, so it quietly
 * held back progress and blocked certificates.
 *
 * Module-tagged sessions stay in their module. This panel is only for the ones
 * that belong to the training as a whole.
 */

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
}: {
  cohortCourseId: number;
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

  return (
    <section className="rounded-2xl border border-[#1a6b3c]/20 bg-[#1a6b3c]/[0.03] p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Radio size={18} className="text-[#1a6b3c]" />
        <div>
          <h2 className="text-base font-bold text-gray-900">
            Live sessions for this training
          </h2>
          <p className="text-sm text-gray-500">
            These cover the whole course rather than one module. Join from here
            — sessions inside a module appear in that module.
          </p>
        </div>
      </div>

      {notice && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {notice}
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {sessions.map((session) => {
          const ended = hasEnded(session, now);
          const joined = attended(session);

          return (
            <li
              key={session.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-800">
                  {session.title}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                  <CalendarClock size={13} />
                  {formatWhen(session.start_time)}
                  {session.trainer_name ? ` · ${session.trainer_name}` : ""}
                </p>
              </div>

              {joined ? (
                <span className="rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
                  Attended
                </span>
              ) : ended ? (
                <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-500">
                  Ended
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleJoin(session)}
                  disabled={joiningId === session.id}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#145530] disabled:opacity-60"
                >
                  {joiningId === session.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Video size={15} />
                  )}
                  {joiningId === session.id ? "Joining..." : "Join"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
