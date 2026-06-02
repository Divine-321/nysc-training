import Link from "next/link";
import { adminStats } from "@/app/data/adminData";

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

      <div className="grid grid-cols-3 gap-4">
        <Link
          href="/admin/courses/create"
          className="bg-[#1a6b3c] text-white rounded-2xl p-6 hover:opacity-90"
        >
          <p className="text-2xl mb-2">＋</p>
          <h3 className="font-bold">Create Course</h3>
          <p className="text-sm text-green-100 mt-1">
            Add course details and modules.
          </p>
        </Link>

        <Link
          href="/admin/assignments"
          className="bg-white rounded-2xl p-6 shadow-sm hover:bg-gray-50"
        >
          <p className="text-2xl mb-2">👥</p>
          <h3 className="font-bold text-gray-800">Assign Course</h3>
          <p className="text-sm text-gray-500 mt-1">
            Assign courses to staff, cohort, or department.
          </p>
        </Link>

        <Link
          href="/admin/users"
          className="bg-white rounded-2xl p-6 shadow-sm hover:bg-gray-50"
        >
          <p className="text-2xl mb-2">🧑‍💼</p>
          <h3 className="font-bold text-gray-800">Manage Staff</h3>
          <p className="text-sm text-gray-500 mt-1">
            View staff and training status.
          </p>
        </Link>
      </div>
    </div>
  );
}