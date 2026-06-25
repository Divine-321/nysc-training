"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  PlayCircle,
  Search,
} from "lucide-react";
import {
  loadStaffCourses,
  toPercentage,
  type StaffCourse,
} from "@/app/lib/staff-learning";

function statusLabel(status: StaffCourse["enrollment"]["status"]) {
  if (status === "COMPLETED") return "Completed";
  if (status === "IN_PROGRESS") return "In progress";
  return "Not started";
}

function statusClass(status: StaffCourse["enrollment"]["status"]) {
  if (status === "COMPLETED") return "bg-green-100 text-green-700";
  if (status === "IN_PROGRESS") return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-700";
}

export default function StaffTraining() {
  const [tab, setTab] = useState<"all" | "inprogress" | "completed">("all");
  const [search, setSearch] = useState("");
  const [courses, setCourses] = useState<StaffCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setCourses(await loadStaffCourses());
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load your assigned courses.",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  const visibleCourses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return courses.filter((item) => {
      const progress = toPercentage(item.enrollment.completion_percentage);
      const matchesTab =
        tab === "all" ||
        (tab === "completed" && item.enrollment.status === "COMPLETED") ||
        (tab === "inprogress" && item.enrollment.status !== "COMPLETED");
      const matchesSearch =
        !normalizedSearch ||
        `${item.enrollment.course_title} ${item.enrollment.cohort_name}`
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesTab && matchesSearch && progress >= 0;
    });
  }, [courses, search, tab]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              My Assigned Courses
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              These are the courses connected to your cohort.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search courses..."
              className="w-full rounded-full border border-gray-200 py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            />
          </div>
        </div>

        <div className="mb-6 flex gap-8 border-b border-gray-100">
          {(["all", "inprogress", "completed"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`border-b-2 pb-3 text-sm font-bold capitalize transition ${
                tab === item
                  ? "border-[#1a6b3c] text-[#1a6b3c]"
                  : "border-transparent text-gray-400"
              }`}
            >
              {item === "inprogress" ? "In progress" : item}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="rounded-xl bg-gray-50 p-6 text-sm text-gray-500">
            Loading your assigned courses...
          </p>
        ) : visibleCourses.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-8 text-center">
            <BookOpen className="mx-auto mb-3 text-gray-300" size={42} />
            <p className="font-semibold text-gray-700">
              No assigned courses found.
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Once an admin assigns your cohort to a course, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleCourses.map((item) => {
              const courseId = item.course?.id ?? item.cohortCourse?.course;
              const progress = toPercentage(
                item.enrollment.completion_percentage,
              );
              const totalDocuments = item.modules.reduce(
                (total, module) => total + module.documents.length,
                0,
              );
              const completedDocuments =
                item.enrollment.document_progress.filter(
                  (progressItem) => progressItem.is_completed,
                ).length;

              return (
                <div
                  key={item.enrollment.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="relative h-40 bg-[#1a6b3c]">
                    <Image
                      src={item.course?.thumbnail_url || "/images/course-thumb.png"}
                      alt={item.enrollment.course_title}
                      width={400}
                      height={200}
                      className="h-40 w-full object-cover"
                    />
                    <span
                      className={`absolute bottom-2 left-2 rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                        item.enrollment.status,
                      )}`}
                    >
                      {statusLabel(item.enrollment.status)}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                      <Clock size={14} className="text-[#1a6b3c]" />
                      {item.enrollment.cohort_name}
                    </p>

                    <h3 className="mb-2 font-bold text-gray-800 transition group-hover:text-[#1a6b3c]">
                      {item.enrollment.course_title}
                    </h3>

                    <p className="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-gray-500">
                      {item.course?.description ||
                        "Open this course to view modules and materials."}
                    </p>

                    <p className="mb-2 text-xs font-medium text-gray-500">
                      {completedDocuments} out of {totalDocuments} material(s)
                      completed
                    </p>

                    <div className="mb-2 h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-[#1a6b3c]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <p className="mb-5 text-xs font-medium text-gray-500">
                      <span className="font-bold text-[#1a6b3c]">
                        {progress}%
                      </span>{" "}
                      Course Completed
                    </p>

                    {courseId && (
                      <Link
                        href={`/staff/course/${courseId}`}
                        className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#1a6b3c] py-2.5 text-sm font-bold text-[#1a6b3c] transition hover:bg-green-50"
                      >
                        {progress > 0 ? (
                          <PlayCircle size={18} />
                        ) : (
                          <CheckCircle2 size={18} />
                        )}
                        {progress > 0 ? "Resume Course" : "Start Course"}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
