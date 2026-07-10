"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Info,
  PlayCircle,
  UserCheck,
  Video,
} from "lucide-react";
import {
  documentIsComplete,
  loadAssessments,
  loadLiveSessionsForCourse,
  loadStaffCourse,
  toPercentage,
  type Assessment,
  type LiveSession,
  type StaffCourse,
} from "@/app/lib/staff-learning";
import { extractErrorMessage, readApiItem } from "@/app/lib/portal-api";
import { formatDateTime } from "@/app/lib/format";

function trainerLabel(staffCourse: StaffCourse) {
  const trainers = staffCourse.course?.trainers ?? [];

  if (trainers.length === 0) return "Trainer not assigned";

  return trainers.map((trainer) => trainer.full_name).join(", ");
}

function AssessmentCard({
  assessment,
  courseId,
  type,
}: {
  assessment: Assessment;
  courseId: number;
  type: "pre-test" | "post-test";
}) {
  const isPreTest = type === "pre-test";

  return (
    <Link
      href={`/staff/course/${courseId}/assessment/${type}`}
      className="block rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-[#1a6b3c]"
    >
      <ClipboardCheck className="mb-3 text-[#1a6b3c]" size={28} />
      <p className="text-xs font-semibold uppercase tracking-wide text-[#1a6b3c]">
        {isPreTest ? "Before modules" : "After modules"}
      </p>
      <h3 className="mt-1 font-bold text-gray-800">{assessment.title}</h3>
      <p className="mt-1 text-sm text-gray-500">
        {isPreTest
          ? "Attempt the pre-course assessment before starting the modules."
          : "Attempt the post-course assessment after completing the modules."}
      </p>
    </Link>
  );
}

export default function CourseOverviewPage() {
  const params = useParams();
  const courseId = Number(params.id);
  const [staffCourse, setStaffCourse] = useState<StaffCourse | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [joiningSessionId, setJoiningSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseData, assessmentData] = await Promise.all([
          loadStaffCourse(courseId),
          loadAssessments(courseId).catch(() => []),
        ]);

        setStaffCourse(courseData);
        setAssessments(assessmentData);
        setLiveSessions(
          courseData
            ? await loadLiveSessionsForCourse([
                courseData.enrollment.cohort_course,
              ]).catch(() => [])
            : [],
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load this course.",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [courseId]);

  const totalDocuments = useMemo(
    () =>
      staffCourse?.modules.reduce(
        (total, module) => total + module.documents.length,
        0,
      ) ?? 0,
    [staffCourse?.modules],
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-white p-6">
          <h2 className="text-xl font-bold text-gray-800">Loading course...</h2>
        </div>
      </div>
    );
  }

  if (error || !staffCourse) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-white p-6">
          <h2 className="text-xl font-bold text-red-600">
            Course not available
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {error || "This course is not assigned to you."}
          </p>
        </div>
      </div>
    );
  }

  const progress = toPercentage(staffCourse.enrollment.completion_percentage);
  const isCompleted =
    staffCourse.enrollment.status === "COMPLETED" || progress >= 100;
  const firstModule = staffCourse.modules[0];

  const handleJoinSession = async (session: LiveSession) => {
    setJoiningSessionId(session.id);
    setError("");

    // Open the tab before any await so popup blockers allow it; point it at
    // the meeting only after the backend records attendance.
    const meetingTab = window.open("about:blank", "_blank");

    try {
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
          "Attendance was recorded, but the backend did not return a meeting link.",
        );
      }

      if (meetingTab) {
        meetingTab.location.href = joinData.meeting_url;
      } else {
        window.open(joinData.meeting_url, "_blank", "noopener,noreferrer");
      }
    } catch (joinError) {
      meetingTab?.close();
      setError(
        joinError instanceof Error
          ? joinError.message
          : "Could not join this live session.",
      );
    } finally {
      setJoiningSessionId(null);
    }
  };
  const preTest = assessments.find((assessment) => assessment.type === "PRE_TEST");
  const postTest = assessments.find(
    (assessment) => assessment.type === "POST_TEST",
  );
  const trainers = staffCourse.course?.trainers ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="relative min-h-72 overflow-hidden rounded-xl bg-[#1a6b3c]">
        {staffCourse.course?.thumbnail_url && (
          <Image
            src={staffCourse.course.thumbnail_url}
            alt={staffCourse.enrollment.course_title}
            width={1200}
            height={400}
            className="h-72 w-full object-cover opacity-80"
          />
        )}

        <div className="absolute inset-0 flex flex-col justify-end bg-black/35 p-6">
          <p className="text-sm font-medium text-green-100">
            {staffCourse.course?.category_name || "Training"} |{" "}
            {staffCourse.enrollment.cohort_name}
          </p>
          <h2 className="mt-3 text-2xl font-bold text-white">
            {staffCourse.enrollment.course_title}
          </h2>
          <p className="mt-2 flex items-center gap-2 text-sm font-medium text-green-50">
            <UserCheck size={16} />
            {trainers.length === 1 ? "Trainer:" : "Trainers:"}{" "}
            {trainerLabel(staffCourse)}
          </p>

          <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3 text-xs font-semibold text-white">
              <span className="rounded-full bg-white/20 px-3 py-1">
                {staffCourse.modules.length} module(s)
              </span>
              <span className="rounded-full bg-white/20 px-3 py-1">
                {totalDocuments} material(s)
              </span>
              {isCompleted ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500 px-3 py-1">
                  <CheckCircle2 size={13} /> Completed
                </span>
              ) : (
                <span className="rounded-full bg-white/20 px-3 py-1">
                  {progress}% materials complete
                </span>
              )}
            </div>

            {firstModule && (
              <Link
                href={`/staff/course/${courseId}/learn`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white px-4 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-[#1a6b3c]"
              >
                <PlayCircle size={17} />
                {isCompleted
                  ? "Review course"
                  : progress > 0
                    ? "Resume"
                    : "Start learning"}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-[#f0f7f3] p-6 text-sm leading-relaxed text-gray-700">
        <p className="mb-3">
          {staffCourse.course?.description ||
            "Complete the uploaded module materials, take the tests, and submit your course evaluation."}
        </p>
        <div className="mb-3 rounded-lg bg-white/70 p-4">
          <p className="mb-2 flex items-center gap-2 font-bold text-gray-800">
            <UserCheck size={17} className="text-[#1a6b3c]" />
            Course {trainers.length === 1 ? "Trainer" : "Trainers"}
          </p>
          {trainers.length === 0 ? (
            <p className="text-gray-500">Trainer not assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {trainers.map((trainer) => (
                <div key={trainer.id}>
                  <p className="font-semibold text-gray-800">
                    {trainer.full_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {trainer.designation}
                    {trainer.organization ? ` • ${trainer.organization}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        <p>
          Material progress updates when you mark uploaded documents as
          completed. Tests and evaluation may still be required before your
          certificate is issued.
        </p>
      </div>

      {preTest && (
        <AssessmentCard
          assessment={preTest}
          courseId={courseId}
          type="pre-test"
        />
      )}

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-800">
          <BookOpen size={20} className="text-[#1a6b3c]" />
          Course Modules
        </h3>

        {staffCourse.modules.length === 0 ? (
          <p className="text-sm text-gray-400">
            No modules have been added to this course yet.
          </p>
        ) : (
          <div className="space-y-3">
            {staffCourse.modules.map((module) => {
              const completedDocuments = module.documents.filter((document) =>
                documentIsComplete(staffCourse.enrollment, document.id),
              ).length;
              const firstDoc = module.documents
                .slice()
                .sort((first, second) => first.order - second.order)[0];

              return (
                <Link
                  key={module.id}
                  href={
                    firstDoc
                      ? `/staff/course/${courseId}/learn?doc=${firstDoc.id}`
                      : `/staff/course/${courseId}/learn`
                  }
                  className="block rounded-lg border p-4 transition hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        {module.title}
                      </h4>
                      <p className="mt-1 text-sm text-gray-500">
                        {module.description || "No description"}
                      </p>
                      <p className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                        <FileText size={13} />
                        {completedDocuments} of {module.documents.length}{" "}
                        material(s) completed
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        module.documents.length > 0 &&
                        completedDocuments === module.documents.length
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {module.documents.length > 0 &&
                      completedDocuments === module.documents.length ? (
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          Done
                        </span>
                      ) : (
                        "Pending"
                      )}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {liveSessions.length > 0 && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-2 flex items-center gap-2 font-bold text-gray-800">
            <Video size={20} className="text-[#1a6b3c]" />
            Live Sessions
          </h3>
          <p className="mb-4 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
            <Info size={14} className="mt-0.5 shrink-0" />
            Before joining, set your meeting display name to your full name
            and file number (for example &quot;ADAMU MUSA — TS0001&quot;) so
            your attendance can be matched.
          </p>

          <div className="space-y-3">
            {liveSessions.map((session) => {
              const isClosed =
                session.status === "COMPLETED" ||
                session.status === "CANCELLED";

              return (
                <div
                  key={session.id}
                  className="flex flex-col justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <h4 className="font-semibold text-gray-800">
                      {session.title}
                    </h4>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDateTime(session.start_time)} —{" "}
                      {formatDateTime(session.end_time)}
                    </p>
                  </div>

                  {isClosed ? (
                    <span className="shrink-0 rounded-full bg-gray-100 px-4 py-1.5 text-xs font-semibold text-gray-500">
                      {session.status}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleJoinSession(session)}
                      disabled={joiningSessionId === session.id}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60 ${
                        session.status === "ONGOING"
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-[#1a6b3c] hover:bg-[#145530]"
                      }`}
                    >
                      <Video size={16} />
                      {joiningSessionId === session.id
                        ? "Joining..."
                        : session.status === "ONGOING"
                          ? "Join Live Now"
                          : "Join Session"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {postTest && (
        <AssessmentCard
          assessment={postTest}
          courseId={courseId}
          type="post-test"
        />
      )}
    </div>
  );
}
