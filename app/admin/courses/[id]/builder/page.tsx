"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { courses } from "@/app/data/courses";

export default function CourseBuilderPage() {
  const params = useParams();
  const courseId = String(params.id);

  const course = courses.find((course) => String(course.id) === courseId);

  const [contentType, setContentType] = useState("Text");

  if (!course) {
    return <div className="bg-white p-6 rounded-xl">Course not found</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Course Builder</h2>
        <p className="text-sm text-gray-500">{course.title}</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-[#1a6b3c]">Add Module</h3>

          <input className="w-full border rounded-lg px-4 py-3" placeholder="Module title" />

          <textarea
            className="w-full border rounded-lg px-4 py-3 h-24"
            placeholder="Module description"
          />

          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="w-full border rounded-lg px-4 py-3"
          >
            <option>Text</option>
            <option>PDF</option>
            <option>Video</option>
            <option>Audio</option>
            <option>External Link</option>
          </select>

          {contentType === "Text" && (
            <textarea
              className="w-full border rounded-lg px-4 py-3 h-32"
              placeholder="Type lesson content..."
            />
          )}

          {["PDF", "Video", "Audio"].includes(contentType) && (
            <input type="file" className="w-full border rounded-lg px-4 py-3" />
          )}

          {contentType === "External Link" && (
            <input className="w-full border rounded-lg px-4 py-3" placeholder="https://..." />
          )}

          <button className="bg-[#1a6b3c] text-white px-5 py-2 rounded-lg">
            Add Module
          </button>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-[#1a6b3c] mb-4">Existing Modules</h3>

          <div className="space-y-3">
            {course.modules.map((module) => (
              <div key={module.id} className="border rounded-lg p-4">
                <h4 className="font-semibold">{module.title}</h4>
                <p className="text-sm text-gray-500">{module.description}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Content: {module.contentType}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-[#1a6b3c]">Assessment Builder</h3>

        <select className="w-full border rounded-lg px-4 py-3">
          <option>Pre-Course Test</option>
          <option>Post-Course Test</option>
        </select>

        <input className="w-full border rounded-lg px-4 py-3" placeholder="Question" />

        <div className="grid grid-cols-2 gap-4">
          <input className="border rounded-lg px-4 py-3" placeholder="Option A" />
          <input className="border rounded-lg px-4 py-3" placeholder="Option B" />
          <input className="border rounded-lg px-4 py-3" placeholder="Option C" />
          <input className="border rounded-lg px-4 py-3" placeholder="Option D" />
        </div>

        <select className="w-full border rounded-lg px-4 py-3">
          <option>Correct Answer: A</option>
          <option>Correct Answer: B</option>
          <option>Correct Answer: C</option>
          <option>Correct Answer: D</option>
        </select>

        <button className="bg-[#1a6b3c] text-white px-5 py-2 rounded-lg">
          Add Question
        </button>
      </div>
    </div>
  );
}