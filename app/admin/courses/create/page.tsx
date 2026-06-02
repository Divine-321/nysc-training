"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

export default function CreateCoursePage() {
  const [hasPreTest, setHasPreTest] = useState(true);
  const [hasPostTest, setHasPostTest] = useState(true);
  const [hasEvaluation, setHasEvaluation] = useState(true);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/admin/courses" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1a6b3c] mb-2 transition">
          <ArrowLeft size={16} /> Back to Courses
        </Link>
        <h2 className="text-2xl font-bold text-gray-800">Create Course</h2>
        <p className="text-sm text-gray-500 mt-1">
          Create a course before adding modules and assessments.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
          <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" placeholder="Enter course title" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Course Description</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-4 py-3 h-28 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] resize-none"
            placeholder="Enter course description"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" placeholder="e.g. Legal Compliance" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
            <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" placeholder="e.g. NYSC Permanent Staff" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <label className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50 transition">
            <input type="checkbox" className="w-4 h-4 accent-[#1a6b3c]" checked={hasPreTest} onChange={() => setHasPreTest(!hasPreTest)} />
            <span className="text-sm font-medium text-gray-700">Pre-Test</span>
          </label>

          <label className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50 transition">
            <input type="checkbox" className="w-4 h-4 accent-[#1a6b3c]" checked={hasPostTest} onChange={() => setHasPostTest(!hasPostTest)} />
            <span className="text-sm font-medium text-gray-700">Post-Test</span>
          </label>

          <label className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50 transition">
            <input type="checkbox" className="w-4 h-4 accent-[#1a6b3c]" checked={hasEvaluation} onChange={() => setHasEvaluation(!hasEvaluation)} />
            <span className="text-sm font-medium text-gray-700">Evaluation</span>
          </label>
        </div>

        <button className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition">
          <Save size={18} />
          Save Course
        </button>
      </div>
    </div>
  );
}