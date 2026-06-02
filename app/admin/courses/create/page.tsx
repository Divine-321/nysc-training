"use client";

import { useState } from "react";

export default function CreateCoursePage() {
  const [hasPreTest, setHasPreTest] = useState(true);
  const [hasPostTest, setHasPostTest] = useState(true);
  const [hasEvaluation, setHasEvaluation] = useState(true);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Create Course</h2>
        <p className="text-sm text-gray-500">
          Create a course before adding modules and assessments.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <input className="w-full border rounded-lg px-4 py-3" placeholder="Course title" />

        <textarea
          className="w-full border rounded-lg px-4 py-3 h-28"
          placeholder="Course description"
        />

        <div className="grid grid-cols-2 gap-4">
          <input className="border rounded-lg px-4 py-3" placeholder="Category" />
          <input className="border rounded-lg px-4 py-3" placeholder="Target audience" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <label className="flex gap-3 border rounded-lg px-4 py-3">
            <input type="checkbox" checked={hasPreTest} onChange={() => setHasPreTest(!hasPreTest)} />
            Pre-Test
          </label>

          <label className="flex gap-3 border rounded-lg px-4 py-3">
            <input type="checkbox" checked={hasPostTest} onChange={() => setHasPostTest(!hasPostTest)} />
            Post-Test
          </label>

          <label className="flex gap-3 border rounded-lg px-4 py-3">
            <input type="checkbox" checked={hasEvaluation} onChange={() => setHasEvaluation(!hasEvaluation)} />
            Evaluation
          </label>
        </div>

        <button className="bg-[#1a6b3c] text-white px-6 py-3 rounded-lg">
          Save Course
        </button>
      </div>
    </div>
  );
}