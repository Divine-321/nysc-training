"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Plus,
  Trash2,
} from "lucide-react";
import {
  dedupeById,
  extractErrorMessage,
  readApiList,
  type Course,
} from "@/app/lib/portal-api";
import { useConfirm } from "@/app/components/useConfirm";

type CourseModule = {
  id: number;
  course: number;
};

async function readJsonResponse(response: Response) {
  return response.json().catch(() => null);
}

export default function AdminCoursesPage() {
  const { confirm, dialog } = useConfirm();
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const coursesResponse = await fetch("/api/training/courses", {
          cache: "no-store",
        });

        const coursesPayload = await readJsonResponse(coursesResponse);

        if (!coursesResponse.ok) {
          throw new Error(
            extractErrorMessage(
              coursesPayload,
              "Could not load courses."
            )
          );
        }

        const courseList = readApiList<Course>(coursesPayload);
        setCourses(courseList);

        try {
          const modulesResponse = await fetch("/api/training/modules", {
            cache: "no-store",
          });
          const modulesPayload = await readJsonResponse(modulesResponse);

          if (!modulesResponse.ok) {
            throw new Error(
              extractErrorMessage(
                modulesPayload,
                "Could not load course modules.",
              ),
            );
          }

          setModules(dedupeById(readApiList<CourseModule>(modulesPayload)));
        } catch (moduleError) {
          console.error("Could not load course module counts.", moduleError);
          setModules([]);
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load courses."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const handleDelete = async (course: Course) => {
    const confirmed = await confirm(`Delete "${course.title}"?`, {
      danger: true,
    });

    if (!confirmed) return;

    const response = await fetch(
      `/api/training/courses/${course.id}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      setError(
        `Could not delete module (HTTP ${response.status}).`
      );
      return;
    }

    setCourses((current) =>
      current.filter((item) => item.id !== course.id)
    );

    setModules((current) =>
      current.filter((module) => module.course !== course.id)
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Courses
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Manage courses and their modules.
          </p>
        </div>

        <Link
          href="/admin/courses/create"
          className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={18} />
          New Course
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl bg-white p-6 shadow-sm">
        {loading ? (
          <p className="py-8 text-center text-gray-500">
            Loading courses...
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#f0f7f3]">
              <tr>
                <th className="px-4 py-3 text-left">Course</th>
                <th className="px-4 py-3 text-left">Trainers</th>
                <th className="px-4 py-3 text-left">Modules</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {courses.map((course) => {
                const moduleCount = modules.filter(
                  (module) => module.course === course.id
                ).length;

                const trainerNames =
                  (course.trainers ?? [])
                    .map((trainer) => trainer.full_name)
                    .join(", ") || "Unassigned";

                return (
                  <tr
                    key={course.id}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-4 py-4 font-medium">
                      {course.title}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {trainerNames}
                    </td>

                    <td className="px-4 py-4">
                      {moduleCount}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/courses/${course.id}/builder`}
                          className="flex items-center gap-1 font-semibold text-[#1a6b3c]"
                        >
                          View Course
                          <ArrowRight size={16} />
                        </Link>

                        <button
                          onClick={() => handleDelete(course)}
                          aria-label={`Delete ${course.title}`}
                          className="text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {courses.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No courses have been created.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {dialog}
    </div>
  );
}
