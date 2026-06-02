import Link from "next/link";
import { PlusCircle, Users, UserCog } from "lucide-react";
import { adminStats, staffUsers } from "@/app/data/adminData";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Overview</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage courses, staff assignments, and training progress.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {adminStats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <h3 className="text-3xl font-bold text-[#1a6b3c] mt-2">
              {stat.value}
            </h3>
            <p className="text-xs text-gray-400 mt-2">{stat.meta}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart: Enrollment Overview */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-6">Enrollment Overview</h3>
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
        <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col justify-center">
          <h3 className="font-bold text-gray-800 mb-6">Course Progress Overview</h3>
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

      <div className="grid grid-cols-3 gap-4">
        <Link
          href="/admin/courses/create"
          className="bg-[#1a6b3c] text-white rounded-2xl p-6 hover:opacity-90"
        >
          <PlusCircle size={28} className="mb-3 text-green-200" />
          <h3 className="font-bold">Create Course</h3>
          <p className="text-sm text-green-100 mt-1">
            Add course details and modules.
          </p>
        </Link>

        <Link
          href="/admin/assignments"
          className="bg-yellow-500 text-white rounded-2xl p-6 shadow-sm hover:bg-yellow-600 transition"
        >
          <Users size={28} className="mb-3 text-yellow-100" />
          <h3 className="font-bold">Assign Course</h3>
          <p className="text-sm text-yellow-100 mt-1">
            Assign courses to staff, cohort, or department.
          </p>
        </Link>

        <Link
          href="/admin/users"
          className="bg-red-600 text-white rounded-2xl p-6 shadow-sm hover:bg-red-700 transition"
        >
          <UserCog size={28} className="mb-3 text-red-200" />
          <h3 className="font-bold">Manage Staff</h3>
          <p className="text-sm text-red-100 mt-1">
            View staff and training status.
          </p>
        </Link>
      </div>

      {/* Recent Staff Registrations */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Recent Staff Enrollments</h3>
          <Link href="/admin/users" className="text-sm text-[#1a6b3c] font-semibold hover:underline">
            View All
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Department</th>
                <th className="px-5 py-3 font-medium">Cohort</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffUsers.slice(0, 3).map((staff) => (
                <tr key={staff.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-gray-800">{staff.name}</p>
                    <p className="text-xs text-gray-500">{staff.email}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{staff.department}</td>
                  <td className="px-5 py-3 text-gray-600">{staff.cohort}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${staff.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
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