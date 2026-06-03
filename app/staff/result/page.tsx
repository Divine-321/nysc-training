import { results } from "@/app/data/courses";
import { Search, Filter, CheckCircle2, XCircle, FileText, Award } from "lucide-react";

export default function ResultPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Assessment Results</h2>
        <p className="text-sm text-gray-500">Track your test scores, assignments, and overall performance.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="relative max-w-md w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses or assessments..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            />
          </div>
          <button className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition">
            <Filter size={16} />
            Filter Options
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Assessment</th>
                <th className="px-6 py-4">Score</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {results.map((result) => (
                <tr key={result.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-[#1a6b3c] shrink-0">
                        <Award size={20} />
                      </div>
                      <span className="font-semibold text-gray-800 max-w-xs truncate" title={result.courseTitle}>
                        {result.courseTitle}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600 font-medium">
                      <FileText size={16} className="text-gray-400" />
                      {result.assessment}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-800">{result.score}%</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                        result.status === "Passed"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {result.status === "Passed" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {result.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-medium">{result.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Placeholder */}
        <div className="p-5 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <p>Showing {results.length} results</p>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">Prev</button>
            <button className="px-3 py-1 bg-[#1a6b3c] text-white rounded">1</button>
            <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}