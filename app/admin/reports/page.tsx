"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BarChart3,
  GraduationCap,
  Layers,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { extractErrorMessage, readApiList } from "@/app/lib/portal-api";
import {
  cohortCourseBatchLabel,
  type CohortCourse,
} from "@/app/lib/staff-learning";

// Shapes from the deployed /api/analytics/ endpoints (2026-07-10).

type CertificateReport = {
  year?: number;
  total: number;
  breakdown?: {
    cohort_course_id: number;
    programme: string;
    count: number;
  }[];
};

type CompletionRateItem = {
  cohort_course_id: number;
  programme: string;
  year: number;
  average_completion_rate: number;
  total_enrolled: number;
};

type StaffCompletion = {
  staff_name: string;
  file_number: string | null;
  course_title: string;
  cohort: string;
  year: number;
  completed_at: string | null;
};

type TopPerformer = {
  staff_name: string;
  file_number: string | null;
  course_title: string;
  cohort: string;
  year: number;
  best_post_test_score: number;
};

type IssuedCertificate = {
  id: number;
  issued_at: string;
};

function unwrap<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  return (record.data ?? payload) as T;
}

function monthKey(dateValue: string) {
  return dateValue.slice(0, 7); // YYYY-MM
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-NG", {
    month: "short",
    year: "2-digit",
  });
}

function lastTwelveMonthKeys() {
  const keys: string[] = [];
  const now = new Date();

  for (let index = 11; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    keys.push(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    );
  }

  return keys;
}

// Management reports, powered by the backend analytics service. Year-wide
// figures come from ?year=; picking a Training Programme narrows every
// section (and unlocks the per-staff lists) via ?cohort_course=.
export default function AdminReportsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [programmes, setProgrammes] = useState<CohortCourse[]>([]);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState("");

  const [certificateReport, setCertificateReport] =
    useState<CertificateReport | null>(null);
  const [completionRates, setCompletionRates] = useState<CompletionRateItem[]>(
    [],
  );
  const [completions, setCompletions] = useState<StaffCompletion[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [allCertificates, setAllCertificates] = useState<IssuedCertificate[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Programme list for the filter + the raw certificates for the monthly
  // chart — loaded once.
  useEffect(() => {
    const loadStatic = async () => {
      const [programmeResponse, certificateResponse] = await Promise.all([
        fetch("/api/training/cohort-courses", { cache: "no-store" }),
        fetch("/api/training/certificates", { cache: "no-store" }),
      ]);

      if (programmeResponse.ok) {
        const payload = await programmeResponse.json().catch(() => null);
        setProgrammes(readApiList<CohortCourse>(payload));
      }
      if (certificateResponse.ok) {
        const payload = await certificateResponse.json().catch(() => null);
        setAllCertificates(readApiList<IssuedCertificate>(payload));
      }
    };

    void loadStatic();
  }, []);

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      setError("");

      const scope = selectedProgrammeId
        ? `cohort_course=${selectedProgrammeId}`
        : `year=${year}`;

      try {
        const [certificateResponse, rateResponse] = await Promise.all([
          fetch(`/api/analytics/reports/certificates/?${scope}`, {
            cache: "no-store",
          }),
          fetch(`/api/analytics/reports/completion-rate/?${scope}`, {
            cache: "no-store",
          }),
        ]);

        const certificatePayload = await certificateResponse
          .json()
          .catch(() => null);
        const ratePayload = await rateResponse.json().catch(() => null);

        if (!certificateResponse.ok) {
          throw new Error(
            extractErrorMessage(
              certificatePayload,
              "Could not load the certificate report.",
            ),
          );
        }

        setCertificateReport(unwrap<CertificateReport>(certificatePayload));
        setCompletionRates(
          rateResponse.ok ? readApiList<CompletionRateItem>(ratePayload) : [],
        );

        // Per-staff sections need a specific programme.
        if (selectedProgrammeId) {
          const [completionResponse, performerResponse] = await Promise.all([
            fetch(
              `/api/analytics/reports/completions/?cohort_course=${selectedProgrammeId}`,
              { cache: "no-store" },
            ),
            fetch(
              `/api/analytics/reports/top-performers/?cohort_course=${selectedProgrammeId}`,
              { cache: "no-store" },
            ),
          ]);

          const completionPayload = await completionResponse
            .json()
            .catch(() => null);
          const performerPayload = await performerResponse
            .json()
            .catch(() => null);

          setCompletions(
            completionResponse.ok
              ? readApiList<StaffCompletion>(completionPayload)
              : [],
          );
          setTopPerformers(
            performerResponse.ok
              ? readApiList<TopPerformer>(performerPayload)
              : [],
          );
        } else {
          setCompletions([]);
          setTopPerformers([]);
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load report data.",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadReports();
  }, [year, selectedProgrammeId]);

  const monthlyIssued = useMemo(() => {
    const counts = new Map<string, number>();

    for (const certificate of allCertificates) {
      if (!certificate.issued_at) continue;
      const key = monthKey(certificate.issued_at);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const keys = lastTwelveMonthKeys();
    const max = Math.max(1, ...keys.map((key) => counts.get(key) ?? 0));

    return keys.map((key) => ({
      key,
      label: monthLabel(key),
      count: counts.get(key) ?? 0,
      heightPercentage: Math.round(((counts.get(key) ?? 0) / max) * 100),
    }));
  }, [allCertificates]);

  const sortedRates = useMemo(
    () =>
      completionRates
        .slice()
        .sort(
          (first, second) =>
            second.average_completion_rate - first.average_completion_rate,
        ),
    [completionRates],
  );

  const selectedProgramme = programmes.find(
    (programme) => String(programme.id) === selectedProgrammeId,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="mb-1 flex items-center gap-2 text-2xl font-bold text-gray-800">
          <BarChart3 size={24} className="text-[#1a6b3c]" />
          Training Reports
        </h2>
        <p className="text-sm text-gray-500">
          Training delivery, certification, and performance figures.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Scope filter */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="text-sm text-gray-600">
            Year
            <input
              type="number"
              min="2020"
              max="2100"
              value={year}
              disabled={Boolean(selectedProgrammeId)}
              onChange={(event) => setYear(event.target.value)}
              className="mt-1 block w-32 rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] disabled:bg-gray-50"
            />
          </label>

          <label className="flex-1 text-sm text-gray-600">
            Training Programme (optional — unlocks per-staff reports)
            <select
              value={selectedProgrammeId}
              onChange={(event) => setSelectedProgrammeId(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            >
              <option value="">All programmes in {year}</option>
              {programmes.map((programme) => (
                <option key={programme.id} value={String(programme.id)}>
                  {programme.course_details?.title ??
                    `Course #${programme.course}`}{" "}
                  — {cohortCourseBatchLabel(programme)}
                  {programme.year ? ` ${programme.year}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <Award size={20} className="mb-3 text-[#1a6b3c]" />
          <p className="text-3xl font-extrabold text-gray-800">
            {loading ? "..." : certificateReport?.total ?? 0}
          </p>
          <p className="mt-1 text-sm font-bold text-gray-600">
            Certificates issued{" "}
            {selectedProgramme
              ? "for this programme"
              : `across ${year} programmes`}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <Users size={20} className="mb-3 text-[#1a6b3c]" />
          <p className="text-3xl font-extrabold text-gray-800">
            {loading
              ? "..."
              : selectedProgramme
                ? completions.length
                : completionRates.reduce(
                    (total, item) => total + item.total_enrolled,
                    0,
                  )}
          </p>
          <p className="mt-1 text-sm font-bold text-gray-600">
            {selectedProgramme
              ? "Staff who completed this programme"
              : `Staff enrolled across ${year} programmes`}
          </p>
        </div>
      </div>

      {/* Certificates per programme */}
      {!selectedProgramme &&
        (certificateReport?.breakdown?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-1 flex items-center gap-2 font-bold text-gray-800">
              <Award size={18} className="text-[#1a6b3c]" />
              Certificates issued per programme — {year}
            </h3>
            <p className="mb-4 text-xs text-gray-500">
              Exact counts from the analytics service.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-gray-500">
                  <tr className="border-b border-gray-100">
                    <th className="py-2 pr-4">Programme</th>
                    <th className="py-2">Certificates</th>
                  </tr>
                </thead>
                <tbody>
                  {certificateReport?.breakdown?.map((row) => (
                    <tr
                      key={row.cohort_course_id}
                      className="border-b border-gray-50"
                    >
                      <td className="py-2.5 pr-4 font-medium text-gray-800">
                        {row.programme}
                      </td>
                      <td className="py-2.5 font-bold text-[#1a6b3c]">
                        {row.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Completion rate per programme */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 font-bold text-gray-800">
          <Layers size={18} className="text-[#1a6b3c]" />
          Course completion rate{" "}
          {selectedProgramme ? "— this programme" : `by programme — ${year}`}
        </h3>
        <p className="mb-6 text-xs text-gray-500">
          Average enrollment completion percentage.
        </p>

        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : sortedRates.length === 0 ? (
          <p className="text-sm text-gray-400">
            No enrollment data for this selection yet.
          </p>
        ) : (
          <div className="space-y-4">
            {sortedRates.map((row) => {
              const rate = Math.round(row.average_completion_rate);

              return (
                <div key={row.cohort_course_id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-800">
                      {row.programme}
                    </span>
                    <span className="text-gray-500">
                      {row.total_enrolled} enrolled —{" "}
                      <span className="font-bold text-[#1a6b3c]">{rate}%</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-gray-100">
                    <div
                      className="h-2.5 rounded-full bg-[#1a6b3c]"
                      style={{ width: `${Math.min(rate, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Per-programme staff sections */}
      {selectedProgramme ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-1 flex items-center gap-2 font-bold text-gray-800">
              <Trophy size={18} className="text-amber-500" />
              Top performers — post-test
            </h3>
            <p className="mb-4 text-xs text-gray-500">
              Best post-test score per staff member in this programme.
            </p>
            {topPerformers.length === 0 ? (
              <p className="text-sm text-gray-400">
                No post-test scores recorded yet.
              </p>
            ) : (
              <ol className="space-y-2">
                {topPerformers.map((performer, index) => (
                  <li
                    key={`${performer.file_number ?? performer.staff_name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-4 py-2.5 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          index === 0
                            ? "bg-amber-400 text-white"
                            : index < 3
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-gray-800">
                          {performer.staff_name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {performer.file_number ?? "No file number"}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 font-bold text-[#1a6b3c]">
                      {Math.round(performer.best_post_test_score)}%
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-1 flex items-center gap-2 font-bold text-gray-800">
              <GraduationCap size={18} className="text-[#1a6b3c]" />
              Staff who completed
            </h3>
            <p className="mb-4 text-xs text-gray-500">
              Everyone who finished this programme.
            </p>
            {completions.length === 0 ? (
              <p className="text-sm text-gray-400">No completions yet.</p>
            ) : (
              <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {completions.map((completion, index) => (
                  <li
                    key={`${completion.file_number ?? completion.staff_name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-4 py-2.5 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-gray-800">
                        {completion.staff_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {completion.file_number ?? "No file number"}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-gray-500">
                      {completion.completed_at
                        ? new Date(
                            completion.completed_at,
                          ).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500 shadow-sm">
          <span className="font-semibold text-gray-700">
            Best performing staff and completion lists:
          </span>{" "}
          pick a Training Programme in the filter above to see its top
          post-test performers and every staff member who completed it.
        </div>
      )}

      {/* Certificates issued per month (all-time trend) */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 font-bold text-gray-800">
          <TrendingUp size={18} className="text-[#1a6b3c]" />
          Certificates issued — last 12 months
        </h3>
        <p className="mb-6 text-xs text-gray-500">
          How many certificates were generated each month, across all
          programmes.
        </p>

        <div className="flex h-40 items-end gap-2">
          {monthlyIssued.map((month) => (
            <div
              key={month.key}
              className="flex flex-1 flex-col items-center gap-1"
              title={`${month.label}: ${month.count} certificate(s)`}
            >
              <span className="text-[10px] font-bold text-gray-500">
                {month.count > 0 ? month.count : ""}
              </span>
              <div
                className="w-full rounded-t-md bg-[#1a6b3c]/80 transition hover:bg-[#1a6b3c]"
                style={{ height: `${Math.max(month.heightPercentage, 2)}%` }}
              />
              <span className="text-[10px] text-gray-400">{month.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
