"use client";

import { useParams } from "next/navigation";
import { courses } from "@/app/data/courses";

export default function ModulePage() {
  const params = useParams();

  const courseId = String(params.id);
  const moduleId = String(params.moduleId);

  const currentCourse = courses.find(
    (course) => String(course.id) === courseId
  );

  const currentModule = currentCourse?.modules.find(
    (module) => String(module.id) === moduleId
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

  if (!currentModule) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl p-6">
          <h2 className="text-xl font-bold text-red-600">Module not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <p className="text-sm text-gray-500 mb-1">
          Module • {currentCourse.title}
        </p>

        <h1 className="text-2xl font-bold text-[#1a6b3c] mb-3">
          {currentModule.title}
        </h1>

        <p className="text-sm text-gray-600 mb-6">
          {currentModule.description}
        </p>

        <div className="bg-[#f0f7f3] rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-2">Lesson Content</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            This is where the uploaded lesson content will appear. In the real
            system, the admin will upload text, PDF, video, or audio content for
            this module.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="border rounded-lg p-4">
            <p className="font-semibold text-gray-800">PDF Material</p>
            <p className="text-sm text-gray-500 mt-1">Sample uploaded PDF</p>
          </div>

          <div className="border rounded-lg p-4">
            <p className="font-semibold text-gray-800">Video Lesson</p>
            <p className="text-sm text-gray-500 mt-1">Sample video content</p>
          </div>

          <div className="border rounded-lg p-4">
            <p className="font-semibold text-gray-800">Audio Lesson</p>
            <p className="text-sm text-gray-500 mt-1">Sample audio content</p>
          </div>
        </div>

        <button className="bg-[#1a6b3c] text-white px-6 py-2 rounded-lg text-sm font-semibold">
          Mark Module as Complete
        </button>
      </div>
    </div>
  );
}