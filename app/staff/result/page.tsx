"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  FileText,
  Search,
  XCircle,
} from "lucide-react";
import {
  readStoredAssessmentResults,
  type AssessmentResult,
} from "@/app/lib/staff-learning";
import { formatDateTime as formatDate } from "@/app/lib/format";

export default function ResultPage() {
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadResults = async () => {
      setResults(readStoredAssessmentResults());
    };

    void loadResults();
  }, []);

  const filteredResults = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return results;

    return results.filter((result) =>
      `${result.course_title} ${result.assessment_type}`
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [results, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="mb-1 text-2xl font-bold text-gray-800">
          Assessment Results
        </h2>
        <p className="text-sm text-gray-500">
          View results returned after submitting course assessments.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search courses or assessments..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredResults.length === 0 ? (
            <div className="p-8 text-center">
              <Award className="mx-auto mb-3 text-gray-300" size={42} />
              <p className="font-semibold text-gray-700">
                No assessment results yet.
              </p>
              <p className="mt-1 text-sm text-gray-500">
                After you submit a course assessment, its backend-graded result
                will appear here.
              </p>
              <p className="mt-3 text-xs text-gray-400">
                For permanent result history, backend still needs to expose a
                staff results-list endpoint.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 font-medium text-gray-500">
                <tr>
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Assessment</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredResults.map((result) => (
                  <tr key={result.id} className="transition hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 text-[#1a6b3c]">
                          <Award size={20} />
                        </div>
                        <span
                          className="max-w-xs truncate font-semibold text-gray-800"
                          title={result.course_title}
                        >
                          {result.course_title}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-medium text-gray-600">
                        <FileText size={16} className="text-gray-400" />
                        {result.assessment_type}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-800">
                        {result.percentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                          result.passed
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {result.passed ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <XCircle size={14} />
                        )}
                        {result.passed ? "Passed" : "Failed"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-500">
                      {formatDate(result.submitted_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 p-5 text-sm text-gray-500">
          <p>Showing {filteredResults.length} result(s)</p>
        </div>
      </div>
    </div>
  );
}
