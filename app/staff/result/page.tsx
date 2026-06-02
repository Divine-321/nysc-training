import { results } from "@/app/data/courses";

export default function ResultPage() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-[#1a6b3c] mb-4">Results</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#f0f7f3] text-gray-700">
            <tr>
              <th className="text-left px-4 py-3">Course</th>
              <th className="text-left px-4 py-3">Assessment</th>
              <th className="text-left px-4 py-3">Score</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Date</th>
            </tr>
          </thead>

          <tbody>
            {results.map((result) => (
              <tr key={result.id} className="border-b">
                <td className="px-4 py-3 font-medium text-gray-800">
                  {result.courseTitle}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {result.assessment}
                </td>
                <td className="px-4 py-3 text-gray-600">{result.score}%</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      result.status === "Passed"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {result.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{result.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}