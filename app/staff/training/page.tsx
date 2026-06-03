"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { courses } from "@/app/data/courses";
import { Search, Clock, PlayCircle, BookOpen } from "lucide-react";

export default function StaffTraining() {
  const [mainTab, setMainTab] = useState<"overview" | "induction">("overview");
  const [overviewTab, setOverviewTab] = useState<"all" | "inprogress" | "past">(
    "all"
  );
  const [inductionTab, setInductionTab] = useState<"induction" | "outstanding">(
    "induction"
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex gap-2 mb-2 bg-white p-1.5 rounded-full shadow-sm w-fit border border-gray-100">
        <button
          onClick={() => setMainTab("overview")}
          className={`px-6 py-2.5 rounded-full text-sm font-bold transition ${
            mainTab === "overview"
              ? "bg-[#1a6b3c] text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Course Overview
        </button>

        <button
          onClick={() => setMainTab("induction")}
          className={`px-6 py-2.5 rounded-full text-sm font-bold transition ${
            mainTab === "induction"
              ? "bg-[#1a6b3c] text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Induction
        </button>
      </div>

      {mainTab === "overview" && (
        <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Course Overview
          </h2>

          <div className="flex gap-8 mb-6 border-b border-gray-100">
            {(["all", "inprogress", "past"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setOverviewTab(tab)}
                className={`pb-3 text-sm font-bold capitalize transition border-b-2 ${
                  overviewTab === tab
                    ? "text-[#1a6b3c]"
                    : "text-gray-400"
                }`}
              >
                {tab === "inprogress"
                  ? "In progress"
                  : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex gap-3 mb-6">
            <select className="border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-[#1a6b3c]">
              <option>Sort by course name</option>
            </select>

            <div className="relative flex-1 max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses..."
                className="w-full border border-gray-200 rounded-full pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition group bg-white flex flex-col"
              >
                <div className="relative">
                  <Image
                    src={course.image}
                    alt={course.title}
                    width={400}
                    height={200}
                    className="w-full h-40 object-cover"
                  />

                  <span
                    className={`absolute bottom-2 left-2 ${course.categoryColor} text-white text-xs px-2 py-0.5 rounded`}
                  >
                    {course.category}
                  </span>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-gray-800 mb-3 group-hover:text-[#1a6b3c] transition">
                    {course.title}
                  </h3>

                  <p className="text-xs text-gray-500 font-medium mb-2">
                    {course.completedActivities} out of {course.totalActivities}{" "}
                    activities completed
                  </p>

                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div
                      className="bg-[#1a6b3c] h-2 rounded-full"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>

                  <p className="text-xs text-gray-500 font-medium mb-5">
                    <span className="text-[#1a6b3c] font-bold">{course.progress}%</span> Course Completed
                  </p>

                  <Link
                    href={`/staff/course/${course.id}`}
                    className="mt-auto flex items-center justify-center gap-2 w-full border-2 border-[#1a6b3c] text-[#1a6b3c] font-bold text-sm rounded-xl py-2.5 hover:bg-green-50 transition"
                  >
                    <PlayCircle size={18} />
                    Resume Course
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mainTab === "induction" && (
        <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
          <div className="flex gap-2 mb-6">
            {(["induction", "outstanding"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setInductionTab(tab)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition ${
                  inductionTab === tab
                    ? "bg-[#e8f5ee] text-[#1a6b3c] font-semibold"
                    : "border text-gray-500 hover:bg-gray-50"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex justify-end mb-4">
            <button className="bg-[#c9a84c] hover:bg-[#b59744] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm">
              <BookOpen size={16} /> Go to Class
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm p-5 hover:shadow-md transition flex flex-col bg-white group"
              >
                <Image
                  src={course.image}
                  alt={course.title}
                  width={400}
                  height={160}
                  className="w-full h-36 object-cover rounded-xl mb-3"
                />

                <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5 mb-2">
                  <Clock size={14} className="text-[#1a6b3c]" /> {course.duration}
                </p>

                <h3 className="font-bold text-[#1a6b3c] mb-2 group-hover:text-green-700 transition">
                  {course.title}
                </h3>

                <p className="text-sm text-gray-500 mb-5 leading-relaxed flex-1">
                  {course.description}
                </p>

                <Link
                  href={`/staff/course/${course.id}`}
                  className="flex items-center justify-center gap-2 w-full border-2 border-[#1a6b3c] text-[#1a6b3c] font-bold text-sm rounded-xl py-2.5 hover:bg-green-50 transition mt-auto"
                >
                  <PlayCircle size={18} />
                  Start Course
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}