"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { courses } from "@/app/data/courses";

export default function StaffTraining() {
  const [mainTab, setMainTab] = useState<"overview" | "induction">("overview");
  const [overviewTab, setOverviewTab] = useState<"all" | "inprogress" | "past">(
    "all"
  );
  const [inductionTab, setInductionTab] = useState<"induction" | "outstanding">(
    "induction"
  );

  return (
    <div>
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setMainTab("overview")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            mainTab === "overview"
              ? "bg-[#1a6b3c] text-white"
              : "bg-white text-gray-600 border"
          }`}
        >
          Course Overview
        </button>

        <button
          onClick={() => setMainTab("induction")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            mainTab === "induction"
              ? "bg-[#1a6b3c] text-white"
              : "bg-white text-gray-600 border"
          }`}
        >
          Induction
        </button>
      </div>

      {mainTab === "overview" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#1a6b3c] mb-4">
            Course overview
          </h2>

          <div className="flex gap-6 mb-4">
            {(["all", "inprogress", "past"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setOverviewTab(tab)}
                className={`pb-2 text-sm font-medium capitalize transition ${
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
            <select className="border rounded-full px-4 py-2 text-sm text-gray-600 outline-none">
              <option>Sort by course name</option>
            </select>

            <input
              type="text"
              placeholder="Type here..."
              className="rounded-full px-4 py-2 text-sm outline-none flex-1 max-w-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="rounded-2xl overflow-hidden shadow-sm"
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

                <div className="p-4">
                  <h3 className="font-semibold text-sm text-gray-800 mb-3">
                    {course.title}
                  </h3>

                  <p className="text-xs text-gray-400 mb-1">
                    {course.completedActivities} out of {course.totalActivities}{" "}
                    activities completed
                  </p>

                  <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                    <div
                      className="bg-[#1a6b3c] h-1.5 rounded-full"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>

                  <p className="text-xs text-gray-400 mb-4">
                    {course.progress}% Courses Completed
                  </p>

                  <Link
                    href={`/staff/course/${course.id}`}
                    className="block w-full border border-[#1a6b3c] text-[#1a6b3c] text-sm rounded-lg py-1.5 hover:bg-[#e8f5ee] transition text-center"
                  >
                    View Course
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mainTab === "induction" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex gap-2 mb-6">
            {(["induction", "outstanding"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setInductionTab(tab)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                  inductionTab === tab
                    ? "bg-[#e8f5ee] text-[#1a6b3c] font-semibold"
                    : "border text-gray-400"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex justify-end mb-4">
            <button className="bg-[#c9a84c] text-white text-sm px-4 py-2 rounded-lg">
              Go to Class
            </button>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="rounded-2xl overflow-hidden shadow-sm p-4"
              >
                <Image
                  src={course.image}
                  alt={course.title}
                  width={400}
                  height={160}
                  className="w-full h-36 object-cover rounded-xl mb-3"
                />

                <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                  🕐 {course.duration}
                </p>

                <h3 className="font-semibold text-sm text-[#1a6b3c] mb-2">
                  {course.title}
                </h3>

                <p className="text-xs text-gray-500 mb-3">
                  {course.description}
                </p>

                <Link
                  href={`/staff/course/${course.id}`}
                  className="block w-full border border-[#1a6b3c] text-[#1a6b3c] text-sm rounded-lg py-1.5 hover:bg-[#e8f5ee] transition text-center"
                >
                  View Course
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}