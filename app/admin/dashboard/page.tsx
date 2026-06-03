import Link from "next/link";
import { PlusCircle, Users, UserCog, BookOpen, CheckCircle2, TrendingUp, ArrowRight, Calendar, Clock, Video } from "lucide-react";
import { adminStats, staffUsers } from "@/app/data/adminData";
import { courses } from "@/app/data/courses";

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
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div
                  className={`w-full ${item.color} rounded-t-md transition-all duration-500 hover:opacity-80 cursor-pointer`}
                  style={{ height: `${(item.value / 120) * 100}%` }}
                ></div>
                <span className="text-xs font-medium text-gray-400">
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
                <th className="px-6 py-4 font-medium">Cohort</th>
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
                  <td className="px-6 py-4 text-gray-600 font-medium">{staff.cohort}</td>
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
    </div>
  );
}