import Link from "next/link";
import { PlusCircle, Users, UserCog, BookOpen, CheckCircle2, TrendingUp, ArrowRight, Calendar, Clock, Video, Filter, Download, BarChart3, Award } from "lucide-react";
import { adminStats, staffUsers } from "@/app/data/adminData";
import { courses, results } from "@/app/data/courses";

export default function AdminDashboardPage() {
  const upcomingSessions = courses
    .flatMap((c) =>
      (c.liveSessions || [])
        .filter((s) => s.status === "upcoming")
        .map((s) => ({ ...s, courseTitle: c.title }))
    )
    .slice(0, 3);

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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: Enrollment Overview */}
        <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Enrollment Overview</h3>
          <div className="flex items-end gap-3 h-48 mt-4">
            {[
              { value: 40, day: "Mon", color: "bg-[#1a6b3c]" },
              { value: 70, day: "Tue", color: "bg-yellow-500" },
              { value: 45, day: "Wed", color: "bg-red-600" },
              { value: 90, day: "Thu", color: "bg-[#1a6b3c]" },
              { value: 65, day: "Fri", color: "bg-yellow-500" },
              { value: 85, day: "Sat", color: "bg-red-600" },
              { value: 120, day: "Sun", color: "bg-[#1a6b3c]" },
            ].map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center h-full">
                <div className="flex-1 w-full flex items-end pb-2">
                  <div
                    className={`w-full ${item.color} rounded-t-md transition-all duration-500 hover:opacity-80 cursor-pointer`}
                    style={{ height: `${(item.value / 120) * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs font-medium text-gray-400 shrink-0">
                  {item.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Chart: Course Completion */}
        <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Course Progress Overview</h3>
          <div className="space-y-6">
            {[
              { label: "NYSC Mandates & Public Admin", progress: 75, color: "bg-[#1a6b3c]" },
              { label: "Camp Operations & Field Logistics", progress: 45, color: "bg-yellow-500" },
              { label: "Youth Mentorship", progress: 20, color: "bg-red-600" },
            ].map((course, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700 truncate mr-4">{course.label}</span>
                  <span className="text-gray-500 font-semibold">{course.progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`${course.color} h-2 rounded-full`} style={{ width: `${course.progress}%` }}></div>
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
          <h3 className="text-lg font-bold mb-1">Manage Staff</h3>
          <p className="text-sm text-red-100 mt-1">
            View staff and training status.
          </p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Staff Registrations */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">Recent Staff Enrollments</h3>
            <Link href="/admin/users" className="text-sm text-[#1a6b3c] font-semibold hover:underline flex items-center gap-1">
              View All <ArrowRight size={16} />
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Department</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staffUsers.slice(0, 3).map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#f0f7f3] text-[#1a6b3c] flex items-center justify-center font-bold text-sm shrink-0">
                          {staff.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{staff.name}</p>
                          <p className="text-xs text-gray-500">{staff.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{staff.department}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${staff.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {staff.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Placeholder */}
          <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100 lg:col-span-1">
            <h3 className="text-lg font-bold text-gray-800 mb-8">Completion by Department</h3>
            <div className="flex items-end gap-4 h-64 mt-4">
              {[
                { dept: "Training", value: 85, color: "bg-[#1a6b3c]" },
                { dept: "ICT", value: 65, color: "bg-yellow-500" },
                { dept: "Compliance", value: 45, color: "bg-blue-600" },
                { dept: "Logistics", value: 90, color: "bg-[#1a6b3c]" },
                { dept: "Finance", value: 75, color: "bg-yellow-500" },
              ].map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center h-full group">
                  <div className="flex-1 w-full flex items-end justify-center pb-3 relative">
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold text-gray-600 pointer-events-none">
                      {item.value}%
                    </div>
                    <div
                      className={`w-full max-w-[3rem] ${item.color} rounded-t-lg transition-all duration-500 hover:opacity-80 cursor-pointer shadow-sm`}
                      style={{ height: `${item.value}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-bold text-gray-500 truncate w-full text-center shrink-0">
                    {item.dept}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Results Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-2 flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Recent Assessment Results</h3>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Course Title</th>
                    <th className="px-6 py-4 font-medium">Score</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.slice(0, 5).map((result) => (
                    <tr key={result.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-800">{result.courseTitle}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{result.date}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-800 font-extrabold">{result.score}%</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                          result.status === 'Passed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {result.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}