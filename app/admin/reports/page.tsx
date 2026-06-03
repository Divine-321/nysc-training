import { Download, Filter, BarChart3, TrendingUp, Users, Award } from "lucide-react";
import { results } from "@/app/data/courses";

export default function ReportsPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Reports & Analytics</h2>
          <p className="text-sm text-gray-500">View completion rates, staff progress, and assessment results.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="border border-gray-200 text-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition shadow-sm">
            <Filter size={16} />
            Filter Options
          </button>
          <button className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-sm">
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
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

      {/* Chart Placeholder */}
      <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-8">Completion by Department</h3>
        <div className="flex items-end gap-4 h-64 mt-4">
          {[
            { dept: "Training", value: 85, color: "bg-[#1a6b3c]" },
            { dept: "ICT", value: 65, color: "bg-yellow-500" },
            { dept: "Compliance", value: 45, color: "bg-blue-600" },
            { dept: "Logistics", value: 90, color: "bg-[#1a6b3c]" },
            { dept: "Finance", value: 75, color: "bg-yellow-500" },
            { dept: "HR", value: 55, color: "bg-red-500" },
          ].map((item, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full justify-end group">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold text-gray-600">
                {item.value}%
              </div>
              <div
                className={`w-full max-w-[5rem] ${item.color} rounded-t-lg transition-all duration-500 hover:opacity-80 cursor-pointer shadow-sm`}
                style={{ height: `${item.value}%` }}
              ></div>
              <span className="text-xs font-bold text-gray-500 truncate w-full text-center">
                {item.dept}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Results Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Recent Assessment Results</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Course Title</th>
                <th className="px-6 py-4 font-medium">Assessment</th>
                <th className="px-6 py-4 font-medium">Score</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.map((result) => (
                <tr key={result.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-semibold text-gray-800">{result.courseTitle}</td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{result.assessment}</td>
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
                  <td className="px-6 py-4 text-gray-500">{result.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}