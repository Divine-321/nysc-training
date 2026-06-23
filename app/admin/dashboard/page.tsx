"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle, Users, UserCog, BookOpen, CheckCircle2, TrendingUp, Calendar, Clock, Video, Filter, Download, BarChart3, Award } from "lucide-react";
import { adminStats } from "@/app/data/adminData";
import { courses } from "@/app/data/courses";
import { readApiList, type Course, type Department } from "@/app/lib/portal-api";

const fallbackCourses = courses;

export default function AdminDashboardPage() {
  const [liveCourses, setLiveCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [coursesResponse, departmentsResponse] = await Promise.all([
          fetch("/api/training/courses", { cache: "no-store" }),
          fetch("/api/organization/departments", { cache: "no-store" }),
        ]);

        if (coursesResponse.ok) {
          const coursesPayload = await coursesResponse.json();
          setLiveCourses(readApiList<Course>(coursesPayload));
        }

        if (departmentsResponse.ok) {
          const departmentsPayload = await departmentsResponse.json();
          setDepartments(readApiList<Department>(departmentsPayload));
        }
      } catch {
        setLiveCourses([]);
        setDepartments([]);
      }
    };

    void loadData();
  }, []);

  const additionalSessions = [
    {
      id: "LS-PROM-01",
      title: "Objectives of the NYSC",
      courseTitle: "Annual Assessment",
      duration: "3h 00m",
      scheduledDate: "Aug 10, 2026",
      time: "09:00 AM",
      status: "upcoming"
    },
    {
      id: "LS-ADV-01",
      title: "Historical Background of the NYSC",
      courseTitle: "Leadership & Management",
      duration: "1h 30m",
      scheduledDate: "Jul 22, 2026",
      time: "01:00 PM",
      status: "upcoming"
    },
    {
      id: "LS-IT-01",
      title: "Cardinal Programmes",
      courseTitle: "ICT Proficiency",
      duration: "2h 00m",
      scheduledDate: "Jul 28, 2026",
      time: "11:00 AM",
      status: "upcoming"
    }
  ];

  const upcomingSessions = [
    ...additionalSessions,
    ...liveCourses.slice(0, 5).map((course, index) => ({
      id: String(course.id),
      title: course.title,
      courseTitle: course.category_name || "General Training",
      duration: "Live API",
      scheduledDate: course.created_at.slice(0, 10),
      time: "--:--",
      status: course.status === "PUBLISHED" ? "upcoming" : "completed",
      color: index % 3 === 0 ? "bg-[#1a6b3c]" : index % 3 === 1 ? "bg-yellow-500" : "bg-red-600",
    }))
  ].slice(0, 8);

  const getStatIcon = (label: string) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes("course")) return <BookOpen size={24} />;
    if (lowerLabel.includes("staff") || lowerLabel.includes("user")) return <Users size={24} />;
    if (lowerLabel.includes("completion") || lowerLabel.includes("rate")) return <CheckCircle2 size={24} />;
    return <TrendingUp size={24} />;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Overview</h2>
        <p className="text-sm text-gray-500">
          Manage courses, staff assignments, and training progress.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {adminStats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl bg-[#f0f7f3] text-[#1a6b3c] shadow-sm">
                {getStatIcon(stat.label)}
              </div>
              <h3 className="text-3xl font-extrabold text-[#1a6b3c]">{stat.value}</h3>
            </div>
            <p className="text-sm font-bold text-gray-700">{stat.label}</p>
            <p className="text-xs text-gray-400 font-medium mt-1">{stat.meta}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500">Live Courses</h3>
          <p className="text-3xl font-extrabold text-[#1a6b3c] mt-2">{liveCourses.length || fallbackCourses.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500">Departments</h3>
          <p className="text-3xl font-extrabold text-[#1a6b3c] mt-2">{departments.length || 0}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500">Upcoming Sessions</h3>
          <p className="text-3xl font-extrabold text-[#1a6b3c] mt-2">{upcomingSessions.length}</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6">

        {/* Progress Chart: Course Completion */}
        <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Course Progress Overview</h3>
          <div className="space-y-6">
            {(liveCourses.length > 0 ? liveCourses.slice(0, 3).map((course, index) => ({
              title: course.title,
              progress: 0,
              color: index % 3 === 0 ? "bg-[#1a6b3c]" : index % 3 === 1 ? "bg-yellow-500" : "bg-red-600",
            })) : [
            { title: "Historical Background of the NYSC", progress: 75, color: "bg-[#1a6b3c]" },
            { title: "Mission/ Vision statements", progress: 45, color: "bg-yellow-500" },
            { title: "Objectives of the NYSC", progress: 20, color: "bg-red-600" },
            ]).map((course, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700 truncate mr-4">{course.title}</span>
                  <span className="text-gray-500 font-semibold">{(course as { progress?: number }).progress ?? 0}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`${course.color} h-2 rounded-full`} style={{ width: `${(course as { progress?: number }).progress ?? 0}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/courses/create"
          className="group bg-[#1a6b3c] text-white rounded-2xl p-6 lg:p-8 shadow-sm hover:bg-[#145530] transition relative overflow-hidden"
        >
          <PlusCircle size={32} className="mb-4 text-green-200 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-bold mb-1">Create Course</h3>
          <p className="text-sm text-green-100 mt-1">
            Add course details and modules.
          </p>
        </Link>

        <Link
          href="/admin/assignments"
          className="group bg-yellow-500 text-white rounded-2xl p-6 lg:p-8 shadow-sm hover:bg-yellow-600 transition relative overflow-hidden"
        >
          <Users size={32} className="mb-4 text-yellow-100 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-bold mb-1">Assign Course</h3>
          <p className="text-sm text-yellow-100 mt-1">
            Assign courses to staff, cohort, or department.
          </p>
        </Link>

        <Link
          href="/admin/users"
          className="group bg-red-600 text-white rounded-2xl p-6 lg:p-8 shadow-sm hover:bg-red-700 transition relative overflow-hidden"
        >
          <UserCog size={32} className="mb-4 text-red-200 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-bold mb-1">Staff</h3>
          <p className="text-sm text-red-100 mt-1">
            View staff and training status.
          </p>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6">

        {/* Upcoming Live Classes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="text-[#1a6b3c]" size={20} />
              <h3 className="text-lg font-bold text-gray-800">Upcoming Live Classes</h3>
            </div>
          </div>
          
          <ul className="divide-y divide-gray-100 flex-1">
            {upcomingSessions.map((session) => (
              <li key={session.id} className="p-6 hover:bg-gray-50 transition flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-800">{session.title}</h4>
                    <p className="text-xs font-medium text-[#1a6b3c] mt-1 truncate max-w-[250px]">{session.courseTitle}</p>
                  </div>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md shrink-0 border border-blue-100">
                    {session.duration}
                  </span>
                </div>
                <div className="flex items-center gap-5 text-sm text-gray-500 font-medium mt-1">
                  <span className="flex items-center gap-1.5"><Calendar size={14} /> {session.scheduledDate}</span>
                  <span className="flex items-center gap-1.5"><Clock size={14} /> {session.time}</span>
                </div>
              </li>
            ))}
            {upcomingSessions.length === 0 && (
              <li className="p-8 text-center text-gray-500 text-sm font-medium flex-1 flex items-center justify-center">
                No upcoming sessions scheduled at the moment.
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* --- REPORTS & ANALYTICS SECTION --- */}
      <div className="pt-8 mt-4 border-t border-gray-200 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Reports & Analytics</h2>
            <p className="text-sm text-gray-500">View completion rates, staff progress, and assessment results.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition shadow-sm">
              <Filter size={16} />
              Filter Options
            </button>
            <button className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-sm">
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Reports Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Course Completions", value: "854", trend: "+12% vs last month", icon: Award, color: "text-[#1a6b3c]", bg: "bg-[#f0f7f3]" },
            { label: "Average Score", value: "76%", trend: "+3% vs last month", icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Active Learners", value: "1,205", trend: "+5% vs last month", icon: Users, color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "Pass Rate", value: "92%", trend: "-1% vs last month", icon: TrendingUp, color: "text-red-600", bg: "bg-red-50" },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} shadow-sm`}>
                  <stat.icon size={24} />
                </div>
                <h3 className="text-3xl font-extrabold text-gray-800">{stat.value}</h3>
              </div>
              <p className="text-sm font-bold text-gray-700">{stat.label}</p>
              <p className="text-xs text-gray-400 font-medium mt-1">{stat.trend}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
