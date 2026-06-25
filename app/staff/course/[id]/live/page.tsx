"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Video } from "lucide-react";
import {
  loadLiveSessionsForCourse,
  loadStaffCourse,
  type LiveSession,
  type StaffCourse,
} from "@/app/lib/staff-learning";
import { extractErrorMessage } from "@/app/lib/portal-api";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function sessionButtonLabel(session: LiveSession) {
  if (session.status === "ONGOING") return "Join Live Now";
  if (session.status === "SCHEDULED") return "Join Session";
  return session.status;
}

export default function CourseLiveSessionsPage() {
  const params = useParams();
  const courseId = Number(params.id);
  const [staffCourse, setStaffCourse] = useState<StaffCourse | null>(null);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const course = await loadStaffCourse(courseId);
        setStaffCourse(course);
        setSessions(
          course
            ? await loadLiveSessionsForCourse([course.enrollment.cohort_course])
            : [],
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load live sessions.",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [courseId]);

  const handleJoin = async (session: LiveSession) => {
    setJoiningId(session.id);
    setError("");

    try {
      const response = await fetch(`/api/training/live-sessions/${session.id}/join`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not join this live session."),
        );
      }

      window.open(session.meeting_url, "_blank", "noopener,noreferrer");
    } catch (joinError) {
      setError(
        joinError instanceof Error
          ? joinError.message
          : "Could not join this live session.",
      );
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="max-w-5xl space-y-6 p-6">
      <Link
        href={`/staff/course/${courseId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#1a6b3c]"
      >
        <ArrowLeft size={16} /> Back to Course
      </Link>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-800 sm:text-3xl">
          Live Sessions
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          {staffCourse
            ? `Sessions for ${staffCourse.enrollment.course_title}`
            : "Sessions for this course"}
        </p>

        {loading ? (
          <p className="py-10 text-center text-gray-500">
            Loading live sessions...
          </p>
        ) : sessions.length > 0 ? (
          <div className="space-y-6">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-col justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 p-5 transition hover:bg-white md:flex-row md:items-center"
              >
                <div>
                  <h2 className="mb-1 text-lg font-semibold text-gray-800">
                    {session.title}
                  </h2>
                  <p className="mb-3 text-sm text-gray-500">
                    {session.description || "No description provided."}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar size={16} className="text-[#1a6b3c]" />
                      {formatDateTime(session.start_time)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={16} className="text-[#1a6b3c]" />
                      Ends {formatDateTime(session.end_time)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {session.status === "COMPLETED" ||
                  session.status === "CANCELLED" ? (
                    <span className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500">
                      {session.status}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleJoin(session)}
                      disabled={joiningId === session.id}
                      className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60 ${
                        session.status === "ONGOING"
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-[#1a6b3c] hover:bg-[#145530]"
                      }`}
                    >
                      <Video size={18} />
                      {joiningId === session.id
                        ? "Joining..."
                        : sessionButtonLabel(session)}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-10 text-center text-gray-500">
            No live sessions have been scheduled for this course.
          </p>
        )}
      </div>
    </div>
  );
}
