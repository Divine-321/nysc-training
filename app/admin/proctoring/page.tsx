"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Flag, Search, ShieldCheck } from "lucide-react";
import { listProctoringSessions } from "@/app/lib/proctoring";
import type {
  ProctoringSessionStatus,
  ProctoringSessionSummary,
} from "@/app/lib/training-types";
import { formatDateTime } from "@/app/lib/format";
import ProctoringStatusBadge from "@/app/components/ProctoringStatusBadge";

// Admin overview of all proctoring sessions (PDF section 17: "Provide
// ProctoringSession information to authorized Admins"). Flagged sessions are
// surfaced first so reviewers can triage suspicious attempts.
export default function ProctoringSessionsPage() {
  const [sessions, setSessions] = useState<ProctoringSessionSummary[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | ProctoringSessionStatus
  >("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setSessions(await listProctoringSessions());
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load proctoring sessions.",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchSessions();
  }, []);

  const filteredSessions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return sessions
      .filter(
        (session) =>
          statusFilter === "ALL" || session.status === statusFilter,
      )
      .filter(
        (session) =>
          !normalizedSearch ||
          session.staff_email.toLowerCase().includes(normalizedSearch),
      )
      .slice()
      .sort((first, second) => {
        // Flagged sessions first, then most recent.
        const firstFlagged = first.status === "FLAGGED" ? 0 : 1;
        const secondFlagged = second.status === "FLAGGED" ? 0 : 1;

        if (firstFlagged !== secondFlagged) return firstFlagged - secondFlagged;

        return (second.start_time ?? "").localeCompare(first.start_time ?? "");
      });
  }, [sessions, search, statusFilter]);

  const flaggedCount = sessions.filter(
    (session) => session.status === "FLAGGED",
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-bold text-gray-800">
            <ShieldCheck size={24} className="text-[#1a6b3c]" />
            Assessment Proctoring
          </h2>
          <p className="text-sm text-gray-500">
            Review identity verification and monitoring sessions recorded
            during assessments.
          </p>
        </div>
        {flaggedCount > 0 && (
          <span className="flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-800">
            <Flag size={16} /> {flaggedCount} flagged for review
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

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
              placeholder="Search by staff email..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "ALL" | ProctoringSessionStatus,
              )
            }
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
          >
            <option value="ALL">All statuses</option>
            <option value="FLAGGED">Flagged</option>
            <option value="ACTIVE">Active</option>
            <option value="CLEAN">Clean</option>
            <option value="INVALIDATED">Invalidated</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-8 text-center text-sm text-gray-500">
              Loading proctoring sessions...
            </p>
          ) : filteredSessions.length === 0 ? (
            <div className="p-8 text-center">
              <ShieldCheck className="mx-auto mb-3 text-gray-300" size={42} />
              <p className="font-semibold text-gray-700">
                No proctoring sessions found.
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Sessions appear here after staff verify their identity and
                start a proctored assessment.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 font-medium text-gray-500">
                <tr>
                  <th className="px-6 py-4">Staff</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Flags</th>
                  <th className="px-6 py-4">Started</th>
                  <th className="px-6 py-4">Ended</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSessions.map((session) => (
                  <tr key={session.id} className="transition hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-800">
                      {session.staff_email}
                    </td>
                    <td className="px-6 py-4">
                      <ProctoringStatusBadge
                        status={session.status}
                        label={session.status_display}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`font-bold ${
                          session.total_flags > 0
                            ? "text-amber-600"
                            : "text-gray-500"
                        }`}
                      >
                        {session.total_flags}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {session.start_time
                        ? formatDateTime(session.start_time)
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {session.end_time
                        ? formatDateTime(session.end_time)
                        : "In progress"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/proctoring/${session.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-[#1a6b3c] hover:text-[#1a6b3c]"
                      >
                        <Eye size={14} /> Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-gray-100 p-5 text-sm text-gray-500">
          Showing {filteredSessions.length} session(s)
        </div>
      </div>
    </div>
  );
}
