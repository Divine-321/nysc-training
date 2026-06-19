"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, ArrowRight, Trash2 } from "lucide-react";
import { courses } from "@/app/data/courses";
import { readApiList, type Course } from "@/app/lib/portal-api";

export default function AdminCoursesPage() {
  const [liveCourses, setLiveCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const response = await fetch("/api/training/courses", { cache: "no-store" });
        if (!response.ok) return;
        setLiveCourses(readApiList<Course>(await response.json()));
      } finally {
        setIsLoading(false);
      }
    };

    void loadCourses();
  }, []);

  const visibleCourses = useMemo(() => {
    if (liveCourses.length > 0) {
      return liveCourses.map((course) => ({
        id: String(course.id),
        title: course.title,
        trainers: course.trainers.map((trainer) => trainer.full_name).join(", ") || "Unassigned",
        modules: 0,
        progress: course.status,
        isLive: true,
      }));
    }

    return courses.map((course) => ({
      id: String(course.id),
      title: course.title,
      trainers: course.instructors.map((instructor) => instructor.name).join(", "),
      modules: course.modules.length,
      progress: `${course.progress}%`,
      isLive: false,
    }));
  }, [liveCourses]);

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/training/courses/${id}`, { method: "DELETE" });
    if (response.ok) {
      setLiveCourses((current) => current.filter((course) => String(course.id) !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Courses</h2>
          <p className="text-sm text-gray-500 mt-1">Manage courses and modules.</p>
        </div>

        <Link
          href="/admin/courses/create"
          className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition"
        >
          <Plus size={18} />
          New Course
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-[#f0f7f3]">
            <tr>
              <th className="text-left px-4 py-3">Course</th>
              <th className="text-left px-4 py-3">Trainers</th>
              <th className="text-left px-4 py-3">Modules</th>
              <th className="text-left px-4 py-3">Progress</th>
              <th className="text-left px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
              {visibleCourses.map((course) => (
              <tr key={course.id} className="border-b hover:bg-gray-50 transition">
                <td className="px-4 py-4 font-medium">{course.title}</td>
                <td className="px-4 py-4 text-gray-600">{course.trainers}</td>
                <td className="px-4 py-4">{course.modules}</td>
                <td className="px-4 py-4">{course.progress}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/courses/${course.id}/builder`}
                      className="text-[#1a6b3c] font-semibold hover:underline flex items-center gap-1 w-fit"
                    >
                      Build Course
                      <ArrowRight size={16} />
                    </Link>
                    {course.isLive && (
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="text-red-600 hover:text-red-700"
                        aria-label={`Delete ${course.title}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              ))}
              {!isLoading && visibleCourses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No courses found.
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
