"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, BarChart3, Printer } from "lucide-react";
import { extractErrorMessage, readApiList } from "@/app/lib/portal-api";
import CertificateDocument from "@/app/components/CertificateDocument";

type IssuedCertificate = {
  id: number;
  certificate_id: string;
  staff_name: string;
  file_number: string;
  course_title: string;
  issued_at: string;
  pdf_url: string | null;
};

type CohortCourseAssignment = {
  id: number;
  cohort: number;
  cohort_name: string;
  course: number;
  course_details?: { title?: string } | null;
};

type CohortReportRow = {
  cohortName: string;
  certificateCount: number;
  courseCount: number;
  /** True when one of this cohort's courses also runs in another cohort, so
   * the certificate count is an approximation. */
  isApproximate: boolean;
};

function formatCertificateDate(value: string) {
  if (!value) return "Select date";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "long",
  }).format(new Date(value));
}

// The certificate payload has no cohort field yet, so cohort attribution goes
// through cohort-course assignments: certificate -> course title -> cohort(s).
// When a course is delivered to several cohorts the count is marked
// approximate; exact numbers need the backend to add the cohort to each
// certificate.
function buildCohortReport(
  certificates: IssuedCertificate[],
  assignments: CohortCourseAssignment[],
): CohortReportRow[] {
  const courseTitleToCohorts = new Map<string, Set<string>>();
  const cohortToCourses = new Map<string, Set<string>>();

  for (const assignment of assignments) {
    const courseTitle = assignment.course_details?.title?.trim();

    if (!courseTitle || !assignment.cohort_name) continue;

    const key = courseTitle.toLowerCase();

    if (!courseTitleToCohorts.has(key)) {
      courseTitleToCohorts.set(key, new Set());
    }
    courseTitleToCohorts.get(key)?.add(assignment.cohort_name);

    if (!cohortToCourses.has(assignment.cohort_name)) {
      cohortToCourses.set(assignment.cohort_name, new Set());
    }
    cohortToCourses.get(assignment.cohort_name)?.add(key);
  }

  const rows = new Map<string, CohortReportRow>();

  for (const [cohortName, courses] of cohortToCourses) {
    rows.set(cohortName, {
      cohortName,
      certificateCount: 0,
      courseCount: courses.size,
      isApproximate: [...courses].some(
        (course) => (courseTitleToCohorts.get(course)?.size ?? 0) > 1,
      ),
    });
  }

  for (const certificate of certificates) {
    const cohorts =
      courseTitleToCohorts.get(certificate.course_title.trim().toLowerCase()) ??
      new Set<string>();

    for (const cohortName of cohorts) {
      const row = rows.get(cohortName);
      if (row) row.certificateCount += 1;
    }
  }

  return [...rows.values()].sort(
    (first, second) => second.certificateCount - first.certificateCount,
  );
}

export default function AdminCertificatesPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [staffName, setStaffName] = useState("Adeyemi Charles");
  const [courseName, setCourseName] = useState("Leadership Development");
  const [cohortName, setCohortName] = useState("Induction");
  const [fileNumber, setFileNumber] = useState("NYSC/STAFF/001");
  const [certificateId, setCertificateId] = useState("NYSC-CERT-2026-0001");
  const [issuedAt, setIssuedAt] = useState(today);

  const [issuedCertificates, setIssuedCertificates] = useState<
    IssuedCertificate[]
  >([]);
  const [cohortAssignments, setCohortAssignments] = useState<
    CohortCourseAssignment[]
  >([]);
  const [loadingReport, setLoadingReport] = useState(true);
  const [reportError, setReportError] = useState("");

  useEffect(() => {
    const loadReport = async () => {
      try {
        const [certificateResponse, assignmentResponse] = await Promise.all([
          fetch("/api/training/certificates", { cache: "no-store" }),
          fetch("/api/training/cohort-courses", { cache: "no-store" }),
        ]);

        const certificatePayload = await certificateResponse
          .json()
          .catch(() => null);
        const assignmentPayload = await assignmentResponse
          .json()
          .catch(() => null);

        if (!certificateResponse.ok) {
          throw new Error(
            extractErrorMessage(
              certificatePayload,
              "Could not load issued certificates.",
            ),
          );
        }

        setIssuedCertificates(
          readApiList<IssuedCertificate>(certificatePayload),
        );
        setCohortAssignments(
          assignmentResponse.ok
            ? readApiList<CohortCourseAssignment>(assignmentPayload)
            : [],
        );
        setReportError("");
      } catch (loadError) {
        setReportError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load the certificate report.",
        );
      } finally {
        setLoadingReport(false);
      }
    };

    void loadReport();
  }, []);

  const cohortReport = useMemo(
    () => buildCohortReport(issuedCertificates, cohortAssignments),
    [issuedCertificates, cohortAssignments],
  );

  const formattedDate = useMemo(
    () => formatCertificateDate(issuedAt),
    [issuedAt],
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Certificate Design
          </h2>
          <p className="text-sm text-gray-500">
            Preview what staff certificates will look like after completion.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a6b3c] px-5 py-3 text-sm font-semibold text-white shadow-sm"
        >
          <Printer size={18} />
          Print preview
        </button>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm print:hidden">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-50 p-3 text-[#1a6b3c]">
              <BarChart3 size={22} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">
                Issued certificates by cohort
              </h3>
              <p className="text-xs text-gray-500">
                How many training certificates have been issued for each
                cohort.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-[#f0f7f3] px-4 py-2 text-sm font-bold text-[#1a6b3c]">
            {issuedCertificates.length} issued in total
          </span>
        </div>

        {reportError && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {reportError}
          </div>
        )}

        {loadingReport ? (
          <p className="py-6 text-center text-sm text-gray-500">
            Loading certificate report...
          </p>
        ) : cohortReport.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            No cohort data to report yet. Counts appear once cohorts have
            courses assigned and certificates have been issued.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 font-medium text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Cohort</th>
                    <th className="px-4 py-3">Courses assigned</th>
                    <th className="px-4 py-3">Certificates issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cohortReport.map((row) => (
                    <tr key={row.cohortName}>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        {row.cohortName}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {row.courseCount}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-[#1a6b3c]">
                          {row.certificateCount}
                        </span>
                        {row.isApproximate && (
                          <span
                            className="ml-1 text-amber-600"
                            title="A course in this cohort also runs in another cohort, so this count is approximate."
                          >
                            *
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {cohortReport.some((row) => row.isApproximate) && (
              <p className="mt-3 text-xs text-gray-500">
                * Approximate: this cohort shares a course with another cohort,
                and certificates do not carry cohort information yet. Exact
                per-cohort counts need the backend to include the cohort on
                each certificate.
              </p>
            )}
          </>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr] print:grid-cols-1 print:gap-0">
        <section className="rounded-2xl bg-white p-6 shadow-sm print:hidden">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-green-50 p-3 text-[#1a6b3c]">
              <Award size={22} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Preview details</h3>
              <p className="text-xs text-gray-500">
                Change these fields to test the certificate.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">
                Staff name
              </span>
              <input
                value={staffName}
                onChange={(event) => setStaffName(event.target.value)}
                className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-[#1a6b3c]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">
                Course name
              </span>
              <input
                value={courseName}
                onChange={(event) => setCourseName(event.target.value)}
                className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-[#1a6b3c]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">
                Cohort name
              </span>
              <input
                value={cohortName}
                onChange={(event) => setCohortName(event.target.value)}
                className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-[#1a6b3c]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">
                File number
              </span>
              <input
                value={fileNumber}
                onChange={(event) => setFileNumber(event.target.value)}
                className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-[#1a6b3c]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">
                Certificate ID
              </span>
              <input
                value={certificateId}
                onChange={(event) => setCertificateId(event.target.value)}
                className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-[#1a6b3c]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">
                Date of Issue
              </span>
              <input
                type="date"
                value={issuedAt}
                onChange={(event) => setIssuedAt(event.target.value)}
                className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-[#1a6b3c]"
              />
            </label>
          </div>
        </section>

        <section className="overflow-x-auto rounded-2xl border border-gray-200 bg-gray-100 p-6 shadow-sm print:flex print:min-h-screen print:items-center print:justify-center print:border-none print:bg-white print:p-0 print:shadow-none">
          <div className="relative h-[565px] w-[800px] shrink-0 bg-white shadow-2xl print:shadow-none">
            <CertificateDocument
              recipientName={staffName}
              fileNumber={fileNumber}
              courseName={courseName}
              cohortName={cohortName}
              certificateId={certificateId}
              issuedDate={formattedDate}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
