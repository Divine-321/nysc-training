"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Lock,
  PlayCircle,
  Target,
  X,
} from "lucide-react";
import {
  loadStaffCourses,
  toPercentage,
  type StaffCourse,
} from "@/app/lib/staff-learning";

export default function StaffDashboard() {
  const [courses, setCourses] = useState<StaffCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setCourses(await loadStaffCourses());
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load your dashboard.",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  const activeCourses = useMemo(() => courses.slice(0, 3), [courses]);
  const materialsCompletedCount = courses.filter(
    (course) => course.enrollment.status === "COMPLETED",
  ).length;
  const overallProgress = Math.round(
    courses.reduce(
      (total, course) =>
        total + toPercentage(course.enrollment.completion_percentage),
      0,
    ) / (courses.length || 1),
  );

  const stats = [
    {
      label: "Assigned Courses",
      value: courses.length,
      color: "bg-green-50",
      text: "text-[#1a6b3c]",
      icon: <BookOpen size={24} />,
    },
    {
      label: "Average Material Progress",
      value: `${overallProgress}%`,
      color: "bg-blue-50",
      text: "text-blue-700",
      icon: <PlayCircle size={24} />,
    },
    {
      label: "Materials Completed",
      value: materialsCompletedCount,
      color: "bg-amber-50",
      text: "text-amber-700",
      icon: <CheckCircle2 size={24} />,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h2 className="mb-1 text-2xl font-bold text-gray-800">
          Dashboard Overview
        </h2>
        <p className="text-sm text-gray-500">
          Track your assigned courses, materials, tests and certificates.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.color} relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/50 p-6 shadow-sm`}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className={`rounded-xl bg-white/60 p-3 shadow-sm ${stat.text}`}>
                {stat.icon}
              </div>
              <p className={`text-3xl font-extrabold ${stat.text}`}>
                {stat.value}
              </p>
            </div>
            <p className="text-sm font-bold text-gray-700">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">
              My Active Courses
            </h3>
            <Link
              href="/staff/training"
              className="flex items-center gap-1 text-sm font-semibold text-[#1a6b3c] hover:underline"
            >
              View All <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <p className="rounded-xl bg-gray-50 p-6 text-sm text-gray-500">
              Loading courses...
            </p>
          ) : activeCourses.length === 0 ? (
            <p className="rounded-xl bg-gray-50 p-6 text-sm text-gray-500">
              No course has been assigned to you yet.
            </p>
          ) : (
            <div className="space-y-4">
              {activeCourses.map((item) => {
                const courseId = item.course?.id ?? item.cohortCourse?.course;
                const isLocked = item.course?.is_locked ?? false;
                const progress = toPercentage(
                  item.enrollment.completion_percentage,
                );

                return (
                  <div
                    key={item.enrollment.id}
                    className="group rounded-xl border border-gray-100 p-5 transition hover:border-green-200 hover:bg-green-50/30"
                  >
                    <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <h4 className="text-base font-bold text-gray-800 transition group-hover:text-[#1a6b3c]">
                          {item.enrollment.course_title}
                        </h4>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                          {item.enrollment.cohort_name}
                        </p>
                      </div>

                      {courseId && isLocked && (
                        <button
                          type="button"
                          onClick={() =>
                            setLockedNotice(
                              item.course?.lock_reason ||
                                "You need to complete this course's prerequisites first.",
                            )
                          }
                          className="flex shrink-0 items-center justify-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm font-medium text-gray-400"
                        >
                          <Lock size={16} /> Locked
                        </button>
                      )}

                      {courseId && !isLocked && (
                        <Link
                          href={`/staff/course/${courseId}`}
                          className="flex shrink-0 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-[#1a6b3c] hover:text-[#1a6b3c]"
                        >
                          <PlayCircle size={16} /> Continue
                        </Link>
                      )}
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-500">
                          Material Progress
                        </p>
                        <p className="text-xs font-bold text-[#1a6b3c]">
                          {progress}%
                        </p>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-[#1a6b3c] transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
          <div className="relative z-10 mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">
              Overall Material Progress
            </h3>
            <Target className="text-gray-200" size={42} />
          </div>

          <div className="relative z-10 mx-auto mb-4 h-32 w-32">
            <svg viewBox="0 0 36 36" className="h-32 w-32 -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="3.5"
              />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="#1a6b3c"
                strokeWidth="3.5"
                strokeDasharray={`${overallProgress} ${100 - overallProgress}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-gray-800">
                {overallProgress}
                <span className="text-lg text-gray-400">%</span>
              </span>
            </div>
          </div>

          <p className="text-center text-sm font-medium text-gray-500">
            Material completion rate across all your assigned courses.
          </p>
        </div>
      </div>

      {lockedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <Lock size={22} className="text-amber-700" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-gray-800">
              Course Locked
            </h3>
            <p className="mb-5 text-sm text-gray-600">{lockedNotice}</p>
            <button
              type="button"
              onClick={() => setLockedNotice(null)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a6b3c] px-6 py-2.5 text-sm font-bold text-white"
            >
              <X size={16} /> Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
