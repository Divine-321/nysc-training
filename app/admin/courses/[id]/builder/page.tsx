"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Save, FileText, CheckCircle2, Video } from "lucide-react";
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
    <div className="max-w-6xl space-y-6">
      <div>
        <Link href="/admin/courses" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1a6b3c] mb-2 transition">
          <ArrowLeft size={16} /> Back to Courses
        </Link>
        <h2 className="text-2xl font-bold text-gray-800">Course Builder</h2>
        <p className="text-sm text-gray-500 mt-1">{course.title}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5 border border-gray-100">
          <h3 className="font-bold text-[#1a6b3c] text-lg mb-2">Add Module</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module Title</label>
            <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" placeholder="Enter module title" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module Description</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-4 py-3 h-24 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] resize-none"
              placeholder="Briefly describe what this module covers"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            >
              <option>Text</option>
              <option>PDF</option>
              <option>Video</option>
              <option>Audio</option>
              <option>External Link</option>
            </select>
          </div>

          <div>
            {contentType === "Text" && (
              <textarea
                className="w-full border border-gray-300 rounded-lg px-4 py-3 h-32 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] resize-none"
                placeholder="Type lesson content here..."
              />
            )}

            {["PDF", "Video", "Audio"].includes(contentType) && (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer">
                <input type="file" className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                  <FileText size={24} className="text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-[#1a6b3c]">Click to upload {contentType}</span>
                  <span className="text-xs text-gray-500 mt-1">Max file size: 50MB</span>
                </label>
              </div>
            )}

            {contentType === "External Link" && (
              <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" placeholder="https://..." />
            )}
          </div>

          <button className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-6 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 w-full transition">
            <Plus size={18} />
            Add Module to Course
          </button>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
          <h3 className="font-bold text-[#1a6b3c] text-lg mb-4">Existing Modules</h3>

          <div className="space-y-3 flex-1 overflow-y-auto pr-2" style={{ maxHeight: "600px" }}>
            {course.modules.map((module) => (
              <div key={module.id} className="border border-gray-200 rounded-xl p-4 hover:border-[#1a6b3c] transition group cursor-pointer relative">
                <h4 className="font-semibold text-gray-800">{module.title}</h4>
                <p className="text-sm text-gray-500 mt-1">{module.description}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-md font-medium">
                    {module.contentType}
                  </span>
                </div>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition">
                  <button className="text-sm text-[#1a6b3c] font-semibold hover:underline">Edit</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
        <h3 className="font-bold text-[#1a6b3c] text-lg">Assessment Builder</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Type</label>
              <select className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]">
                <option>Pre-Course Test</option>
                <option>Post-Course Test</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
              <textarea className="w-full border border-gray-300 rounded-lg px-4 py-3 h-24 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] resize-none" placeholder="Type your question here..." />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
              <div className="grid grid-cols-2 gap-3">
                <input className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" placeholder="A." />
                <input className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" placeholder="B." />
                <input className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" placeholder="C." />
                <input className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" placeholder="D." />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
              <select className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]">
                <option>Option A</option>
                <option>Option B</option>
                <option>Option C</option>
                <option>Option D</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 flex justify-end">
          <button className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition">
            <CheckCircle2 size={18} />
            Save Question
          </button>
        </div>
      </div>

      {/* Live Session Builder */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <Video className="text-[#1a6b3c]" size={24} />
          <h3 className="font-bold text-[#1a6b3c] text-lg">Schedule Live Session</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session Title</label>
              <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" placeholder="e.g., Q&A Session or Camp Briefing" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input type="time" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zoom Link</label>
              <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" placeholder="https://zoom.us/j/..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting ID <span className="text-gray-400 font-normal">(Optional)</span></label>
                <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" placeholder="123 456 7890" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passcode <span className="text-gray-400 font-normal">(Optional)</span></label>
                <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" placeholder="Secret123" />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 flex justify-end">
          <button className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition">
            <Plus size={18} />
            Add Live Session
          </button>
        </div>
      </div>
    </div>
  );
}