import React from "react";
import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { courses } from "@/app/data/courses";

export default function AdminCoursesPage() {
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
              {courses.map((course) => (
              <tr key={course.id} className="border-b hover:bg-gray-50 transition">
                <td className="px-4 py-4 font-medium">{course.title}</td>
                <td className="px-4 py-4 text-gray-600">{course.instructors.map(i => i.name).join(", ")}</td>
                <td className="px-4 py-4">{course.modules.length}</td>
                <td className="px-4 py-4">{course.progress}%</td>
                <td className="px-4 py-4">
                  <Link
                    href={`/admin/courses/${course.id}/builder`}
                    className="text-[#1a6b3c] font-semibold hover:underline flex items-center gap-1 w-fit"
                  >
                    Build Course
                    <ArrowRight size={16} />
                  </Link>
                </td>
              </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}