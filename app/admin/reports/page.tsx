import { Download, Filter } from "lucide-react";
import { results } from "@/app/data/courses";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Reports & Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">View completion rates, staff progress, and assessment results.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition">
            <Filter size={16} />
            Filter
          </button>
          <button className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition">
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Course Completions", value: "854", trend: "+12% vs last month" },
          { label: "Average Score", value: "76%", trend: "+3% vs last month" },
          { label: "Active Learners", value: "1,205", trend: "+5% vs last month" },
          { label: "Pass Rate", value: "92%", trend: "-1% vs last month" },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-2">{stat.value}</h3>
            <p className="text-xs text-green-600 font-medium mt-2">{stat.trend}</p>
          </div>
        ))}
      </div>

      {/* Chart Placeholder */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-6">Completion by Department</h3>
        <div className="flex items-end gap-4 h-56 mt-4">
          {[
            { dept: "Training", value: 85, color: "bg-[#1a6b3c]" },
            { dept: "ICT", value: 65, color: "bg-yellow-500" },
            { dept: "Compliance", value: 45, color: "bg-[#1a6b3c]" },
            { dept: "Logistics", value: 90, color: "bg-[#1a6b3c]" },
            { dept: "Finance", value: 75, color: "bg-yellow-500" },
          ].map((item, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <div
                className={`w-full max-w-[4rem] ${item.color} rounded-t-md transition-all duration-500 hover:opacity-80 cursor-pointer`}
                style={{ height: `${item.value}%` }}
              ></div>
              <span className="text-xs font-medium text-gray-500 truncate w-full text-center">
                {item.dept}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Results Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Recent Assessment Results</h3>
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
                  <td className="px-6 py-4 text-gray-600">{result.assessment}</td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{result.score}%</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
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