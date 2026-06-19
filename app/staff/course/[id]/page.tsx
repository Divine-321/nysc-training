"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { courses } from "@/app/data/courses";
import { readApiItem, type Course } from "@/app/lib/portal-api";

export default function CourseOverviewPage() {
  const params = useParams();
  const courseId = String(params.id);
  const [liveCourse, setLiveCourse] = useState<Course | null>(null);

  const currentCourse = courses.find(
    (course) => String(course.id) === courseId
  );

  useEffect(() => {
    const loadCourse = async () => {
      const response = await fetch(`/api/training/courses/${courseId}`, { cache: "no-store" });
      if (!response.ok) return;
      setLiveCourse(readApiItem<Course>(await response.json()));
    };

    if (!currentCourse) {
      void loadCourse();
    }
  }, [courseId, currentCourse]);

  if (!currentCourse && !liveCourse) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl p-6">
          <h2 className="text-xl font-bold text-gray-800">Loading course...</h2>
        </div>
      </div>
    );
  }

  if (!currentCourse && liveCourse) {
    return (
      <div className="p-6">
        <div className="relative rounded-xl overflow-hidden mb-6 bg-[#1a6b3c] min-h-72">
          <div className="absolute inset-0 flex flex-col justify-end p-6">
            <p className="text-green-100 text-sm font-medium">
              {liveCourse.category_name || "Training"} | {liveCourse.status}
            </p>
            <h2 className="text-white text-xl font-bold mt-3">{liveCourse.title}</h2>
          </div>
        </div>

        <div className="bg-[#f0f7f3] rounded-xl p-6 text-sm text-gray-700 leading-relaxed mb-6">
          <p>{liveCourse.description}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">Trainers</h3>
          {liveCourse.trainers.length > 0 ? (
            <ul className="space-y-2">
              {liveCourse.trainers.map((trainer) => (
                <li key={trainer.id} className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-800">{trainer.full_name}</span> - {trainer.designation}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No trainers assigned yet.</p>
          )}
        </div>
      </div>
    );
  }

  if (!currentCourse) {
    return null;
  }

  const firstModule = currentCourse.modules[0];

  return (
    <div className="p-6">
      <div className="relative rounded-xl overflow-hidden mb-6">
        <Image
          src={currentCourse.heroImage}
          alt={currentCourse.title}
          width={1200}
          height={400}
          className="w-full h-72 object-cover"
        />

        <div className="absolute inset-0 bg-black/40 flex flex-col justify-between p-6">
          <p className="text-white text-sm font-medium">
            {currentCourse.category} | Target: {currentCourse.target}
          </p>

          <div>
            <h2 className="text-white text-xl font-bold mb-3">
              {currentCourse.title}
            </h2>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {currentCourse.instructors.map((inst) => (
                  <div key={inst.name} className="flex items-center gap-1">
                    <div
                      className={`w-7 h-7 rounded-full ${inst.color} flex items-center justify-center text-white text-xs font-bold`}
                    >
                      {inst.initial}
                    </div>
                    <span className="text-white text-sm">{inst.name}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <p className="text-white text-xs mb-1">
                    {currentCourse.progress}% Course Completed
                  </p>

                  <div className="w-40 bg-white/30 rounded-full h-1.5">
                    <div
                      className="bg-white h-1.5 rounded-full"
                      style={{ width: `${currentCourse.progress}%` }}
                    />
                  </div>
                </div>

                {firstModule && (
                  <Link
                    href={`/staff/course/${currentCourse.id}/module/${firstModule.id}`}
                    className="border border-white text-white text-xs px-3 py-1.5 rounded"
                  >
                    Resume
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#f0f7f3] rounded-xl p-6 text-sm text-gray-700 leading-relaxed mb-6">
        <p className="mb-3">{currentCourse.description}</p>

        <p>
          The course is divided into modules. Complete each module, attempt the
          assessments, and track your progress as you proceed.
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">Course Modules</h3>

        {currentCourse.modules.length === 0 ? (
          <p className="text-sm text-gray-400">
            No modules have been added to this course yet.
          </p>
        ) : (
          <div className="space-y-3">
            {currentCourse.modules.map((module) => (
              <Link
                key={module.id}
                href={`/staff/course/${currentCourse.id}/module/${module.id}`}
                className="block border rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-800">
                      {module.title}
                    </h4>

                    <p className="text-sm text-gray-500 mt-1">
                      {module.description}
                    </p>

                    <p className="text-xs text-gray-400 mt-2">
                      Content: {module.contentType}
                    </p>
                  </div>

                  <span
                    className={`text-xs px-3 py-1 rounded-full ${
                      module.completed
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {module.completed ? "Completed" : "Pending"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
