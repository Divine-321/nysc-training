"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { courses } from "@/app/data/courses";
import { ArrowLeft, Calendar, Clock, Video } from "lucide-react";

export default function CourseLiveSessionsPage() {
  const params = useParams();
  const courseId = String(params.id);

  const currentCourse = courses.find(
    (course) => String(course.id) === courseId
  );

  if (!currentCourse) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl p-6">
          <h2 className="text-xl font-bold text-red-600">Course not found</h2>
        </div>
      </div>
    );
  }

  const { liveSessions } = currentCourse;

  return (
    <div className="max-w-5xl space-y-6">
      <Link
        href={`/staff/course/${courseId}`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1a6b3c] transition font-medium"
      >
        <ArrowLeft size={16} /> Back to Course
      </Link>

      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">
          Live Sessions for &quot;{currentCourse.title}&quot;
        </h1>

        {liveSessions && liveSessions.length > 0 ? (
          <div className="space-y-6">
            {liveSessions.map((session) => (
              <div
                key={session.id}
                className="border border-gray-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50 hover:bg-white transition"
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-1">
                    {session.title}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar size={16} className="text-[#1a6b3c]" />{" "}
                      {session.scheduledDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={16} className="text-[#1a6b3c]" />{" "}
                      {session.time} ({session.duration})
                    </span>
                  </div>
                  {session.meetingId && (
                    <p className="text-xs text-gray-500 mt-2">
                      Meeting ID:{" "}
                      <span className="font-mono">{session.meetingId}</span>
                      {session.passcode && (
                        <>
                          {" "}
                          | Passcode:{" "}
                          <span className="font-mono">
                            {session.passcode}
                          </span>
                        </>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {session.status === "upcoming" && (
                    <Link
                      href={`/staff/course/${courseId}/live/${session.id}`}
                      className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-sm"
                    >
                      <Video size={18} />
                      Join Session
                    </Link>
                  )}
                  {session.status === "live" && (
                    <Link
                      href={`/staff/course/${courseId}/live/${session.id}`}
                      className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-sm"
                    >
                      <Video size={18} />
                      Join Live Now
                    </Link>
                  )}
                  {session.status === "completed" && (
                    <span className="bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-sm font-medium">
                      Completed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-10">No live sessions scheduled for this course.</p>
        )}
      </div>
    </div>
  );
}