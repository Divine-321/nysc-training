"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { courses, deadlines, stats } from "@/app/data/courses";
import { BookOpen, PlayCircle, CheckCircle2, Calendar, Target, ArrowRight } from "lucide-react";
import { readApiList, type Course } from "@/app/lib/portal-api";

const fallbackCourses = courses;

export default function StaffDashboard() {
  const [liveCourses, setLiveCourses] = useState<Course[]>([]);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const response = await fetch("/api/training/courses", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        setLiveCourses(readApiList<Course>(payload));
      } catch {
        setLiveCourses([]);
      }
    };

    void loadCourses();
  }, []);

  const activeCourses = useMemo(() => {
    if (liveCourses.length > 0) {
      return liveCourses.slice(0, 2).map((course) => ({
        id: String(course.id),
        title: course.title,
        category: course.category_name || "Training",
        progress: 0,
      }));
    }

    return fallbackCourses.slice(0, 2);
  }, [liveCourses]);

  const overallProgress = Math.round(
    activeCourses.reduce((acc, course) => acc + (course.progress || 0), 0) / (activeCourses.length || 1)
  );

  const getStatIcon = (label: string) => {
    if (label.includes("Assigned")) return <BookOpen size={24} />;
    if (label.includes("Progress")) return <PlayCircle size={24} />;
    return <CheckCircle2 size={24} />;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Dashboard Overview</h2>
        <p className="text-sm text-gray-500">Track your learning progress and upcoming deadlines.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.color} rounded-2xl p-6 flex flex-col justify-between border border-white/50 shadow-sm relative overflow-hidden`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl bg-white/60 ${stat.text} shadow-sm`}>
                {getStatIcon(stat.label)}
              </div>
              <p className={`text-3xl font-extrabold ${stat.text}`}>{stat.value}</p>
            </div>
            <p className="text-sm font-bold text-gray-700">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800">My Active Courses</h3>
            <Link
              href="/staff/training"
              className="text-sm text-[#1a6b3c] font-semibold hover:underline flex items-center gap-1"
            >
              View All <ArrowRight size={16} />
            </Link>
          </div>

          <div className="space-y-4">
            {activeCourses.map((course) => (
              <div key={course.id} className="border border-gray-100 rounded-xl p-5 hover:border-green-200 hover:bg-green-50/30 transition group">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-4">
                  <div>
                    <h4 className="text-base font-bold text-gray-800 group-hover:text-[#1a6b3c] transition">
                      {course.title}
                    </h4>
                    <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wider">
                      {course.category}
                    </p>
                  </div>

                  <Link
                    href={`/staff/course/${course.id}`}
                    className="text-sm bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-full hover:border-[#1a6b3c] hover:text-[#1a6b3c] transition shrink-0 shadow-sm font-medium flex items-center justify-center gap-2"
                  >
                    <PlayCircle size={16} /> Continue
                  </Link>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-500">Progress</p>
                    <p className="text-xs font-bold text-[#1a6b3c]">{course.progress}%</p>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-[#1a6b3c] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100 flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Target size={100} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-6 w-full text-left z-10">
              Overall Progress
            </h3>

            <div className="relative w-32 h-32 z-10 mb-4">
              <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="#f3f4f6"
                  strokeWidth="3.5"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="#1a6b3c"
                  strokeWidth="3.5"
                  strokeDasharray={`${overallProgress} ${100 - overallProgress}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-gray-800">
                  {overallProgress}<span className="text-lg text-gray-400">%</span>
                </span>
              </div>
            </div>

            <p className="text-sm font-medium text-gray-500 text-center z-10">
              Total completion rate across all assigned courses
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-5">
              Upcoming Deadlines
            </h3>

            <ul className="space-y-3">
              {deadlines.map((deadline) => (
                <li
                  key={deadline.title}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100/50 transition"
                >
                  <div className="flex items-center gap-3 overflow-hidden pr-2">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                      <Calendar size={14} />
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {deadline.title}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-md shrink-0 whitespace-nowrap">
                    {deadline.due}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
