"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { courses } from "@/app/data/courses";
import { ArrowLeft, PlayCircle, FileText, Headphones, CheckCircle2 } from "lucide-react";

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

  const moduleIndex = currentCourse?.modules.findIndex(
    (m) => String(m.id) === moduleId
  ) ?? -1;

  const prevModule =
    moduleIndex > 0 ? currentCourse?.modules[moduleIndex - 1] : null;
  const nextModule =
    moduleIndex !== -1 && currentCourse && moduleIndex < currentCourse.modules.length - 1
      ? currentCourse.modules[moduleIndex + 1]
      : null;

  const prevRoute = prevModule ? `/staff/course/${courseId}/module/${prevModule.id}` : `/staff/course/${courseId}`;
  const nextRoute = nextModule ? `/staff/course/${courseId}/module/${nextModule.id}` : 
    (currentCourse?.hasPostTest ? `/staff/course/${courseId}/assessment/post-test` : `/staff/course/${courseId}`);

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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Link href={`/staff/course/${courseId}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1a6b3c] transition font-medium">
        <ArrowLeft size={16} /> Back to Course
      </Link>

      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-2 tracking-wide uppercase">
              {currentCourse.category}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3">
              {currentModule.title}
            </h1>
            <p className="text-gray-600 text-base max-w-3xl">
              {currentModule.description}
            </p>
          </div>
          <div className="bg-green-50 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full shrink-0">
            {currentModule.contentType}
          </div>
        </div>

        {/* Video Placeholder */}
        <div className="w-full aspect-video bg-gray-900 rounded-xl mb-8 relative flex items-center justify-center group cursor-pointer overflow-hidden shadow-inner">
          <PlayCircle size={64} className="text-white/80 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
          <div className="absolute bottom-4 left-4 right-4 flex justify-between text-white/70 text-sm font-medium">
            <span>00:00 / 14:35</span>
            <span>1080p</span>
          </div>
        </div>

        {/* Lesson Text Content */}
        <div className="bg-gray-50 rounded-xl p-6 sm:p-8 mb-8 border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 text-lg">Lesson Notes</h2>
          <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
            This is where the supplementary text or instructions for the module will appear. In a fully integrated system, the admin will use a rich text editor to provide context, external links, and reading materials to accompany the core media content.
          </p>
        </div>

        {/* Attachments */}
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <div className="border border-gray-200 hover:border-[#1a6b3c] hover:bg-green-50 transition rounded-xl p-5 flex items-center gap-4 cursor-pointer group">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-red-600 group-hover:bg-white group-hover:shadow-sm transition">
              <FileText size={24} />
            </div>
            <div>
              <p className="font-bold text-gray-800">Presentation Deck</p>
              <p className="text-xs text-gray-500 mt-0.5">PDF • 2.4 MB</p>
            </div>
          </div>

          <div className="border border-gray-200 hover:border-[#1a6b3c] hover:bg-green-50 transition rounded-xl p-5 flex items-center gap-4 cursor-pointer group">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-white group-hover:shadow-sm transition">
              <Headphones size={24} />
            </div>
            <div>
              <p className="font-bold text-gray-800">Audio Lesson</p>
              <p className="text-xs text-gray-500 mt-0.5">MP3 • 14 mins</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-between sm:items-center gap-4 pt-6 border-t border-gray-100">
          <Link
            href={prevRoute}
            className="text-gray-500 hover:text-gray-800 font-medium text-sm transition text-center sm:text-left"
          >
            {prevModule ? "← Previous Module" : "← Course Overview"}
          </Link>
          <Link
            href={nextRoute}
            className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-6 py-3 rounded-lg font-semibold flex justify-center items-center gap-2 transition shadow-sm"
          >
            <CheckCircle2 size={18} />
            {nextModule ? "Mark as Complete & Continue" : "Complete & Proceed"}
          </Link>
        </div>
      </div>
    </div>
  );
}