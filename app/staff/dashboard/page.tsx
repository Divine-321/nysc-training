import Link from "next/link";
import { courses, deadlines, stats } from "@/app/data/courses";

export default function StaffDashboard() {
  const activeCourses = courses.slice(0, 2);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.color} rounded-2xl p-5 flex items-center justify-between`}
          >
            <p className="text-sm font-medium text-gray-600">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.text}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">My Active Courses</h3>
            <Link
              href="/staff/training"
              className="text-xs text-[#1a6b3c] font-medium hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="space-y-4">
            {activeCourses.map((course) => (
              <div key={course.id} className="border rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {course.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {course.category}
                    </p>
                  </div>

                  <Link
                    href={`/staff/course/${course.id}`}
                    className="text-xs border border-[#1a6b3c] text-[#1a6b3c] px-3 py-1 rounded-full hover:bg-[#e8f5ee] transition shrink-0 ml-4"
                  >
                    Continue
                  </Link>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
                  <div
                    className="bg-[#1a6b3c] h-1.5 rounded-full"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>

                <p className="text-xs text-gray-400 mt-1">
                  {course.progress}% completed
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">
              Overall Progress
            </h3>

            <div className="flex items-center justify-center">
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="#e8f5ee"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="#1a6b3c"
                    strokeWidth="3"
                    strokeDasharray="45 55"
                    strokeLinecap="round"
                  />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-[#1a6b3c]">
                    45%
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center mt-2">
              Overall completion rate
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">
              Upcoming Deadlines
            </h3>

            <ul className="space-y-3">
              {deadlines.map((deadline) => (
                <li
                  key={deadline.title}
                  className="flex items-start justify-between"
                >
                  <p className="text-xs text-gray-700 font-medium">
                    {deadline.title}
                  </p>
                  <p className="text-xs text-red-400 shrink-0 ml-2">
                    {deadline.due}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}