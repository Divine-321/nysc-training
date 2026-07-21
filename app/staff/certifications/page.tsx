"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  Download,
  ExternalLink,
  PlayCircle,
  Printer,
  Target,
} from "lucide-react";
import {
  extractErrorMessage,
  readApiList,
} from "@/app/lib/portal-api";
import {
  documentIsComplete,
  flagIsTrue,
  loadAssessmentAttempts,
  loadStaffCourses,
  type Assessment,
  type AssessmentAttempt,
  type StaffCourse,
} from "@/app/lib/staff-learning";
import RequirementChecklist, {
  type RequirementItem,
} from "@/app/components/RequirementChecklist";
import { formatDate as formatDateMedium } from "@/app/lib/format";

type Certificate = {
  id: number;
  certificate_id: string;
  staff_name: string;
  file_number: string;
  course_title: string;
  /** The training's cohort (e.g. "July 2026") — deployed 2026-07-14. */
  cohort?: string;
  issued_at: string;
  pdf_url: string | null;
};

function formatDate(value: string) {
  return formatDateMedium(value, "long");
}

function staffCourseId(staffCourse: StaffCourse) {
  return staffCourse.cohortCourse?.course ?? staffCourse.course?.id ?? null;
}

// Spec section 21: show staff exactly which certificate requirements are
// still open — every module at 100%, all materials done, post-test passed,
// evaluation submitted. Post-test pass state comes from attempts (empty
// until the results API ships, so it is labelled honestly).
function buildRequirements(
  staffCourse: StaffCourse,
  assessments: Assessment[],
  attempts: AssessmentAttempt[],
): RequirementItem[] {
  const { enrollment, modules } = staffCourse;

  const allDocs = modules.flatMap((courseModule) => courseModule.documents);
  const completedDocs = allDocs.filter((doc) =>
    documentIsComplete(enrollment, doc.id),
  ).length;

  const modulesWithContent = modules.filter(
    (courseModule) => courseModule.documents.length > 0,
  );
  const completedModules = modulesWithContent.filter((courseModule) =>
    courseModule.documents.every((doc) =>
      documentIsComplete(enrollment, doc.id),
    ),
  ).length;

  const courseId = staffCourseId(staffCourse);
  // Assessments belong to Modules now (reusable-modules backend) — match by
  // the course's module ids, keeping the old course match as a fallback.
  const moduleIds = new Set(modules.map((courseModule) => courseModule.id));
  const postTest = assessments.find(
    (assessment) =>
      assessment.type === "POST_TEST" &&
      (assessment.module != null
        ? moduleIds.has(assessment.module)
        : assessment.course === courseId),
  );
  // The enrollment now carries the authoritative flag; attempts are a
  // fallback for older payloads.
  const passedPostTest = postTest
    ? flagIsTrue(enrollment.post_test_passed) ||
      attempts.some(
        (attempt) =>
          attempt.assessment === postTest.id &&
          attempt.passed &&
          (attempt.attempt_status ?? "SUBMITTED") === "SUBMITTED",
      )
    : false;

  const items: RequirementItem[] = [
    {
      label: "Complete every activity",
      met:
        modulesWithContent.length > 0 &&
        completedModules === modulesWithContent.length,
      detail: `${completedModules} of ${modulesWithContent.length} activity(ies) at 100%`,
    },
    {
      label: "Complete all learning materials",
      met: allDocs.length > 0 && completedDocs === allDocs.length,
      detail: `${completedDocs} of ${allDocs.length} material(s) completed`,
    },
  ];

  if (postTest) {
    items.push({
      label: `Pass the post-assessment — ${postTest.title}`,
      met: passedPostTest,
      detail: passedPostTest
        ? "Passed"
        : "Not passed yet — take the post-assessment from the course player. Required before your certificate can be issued.",
    });
  } else {
    items.push({
      label: "No post-assessment is required for this course",
      met: true,
    });
  }

  const evaluationDone =
    flagIsTrue(enrollment.evaluation_submitted) ||
    Boolean(enrollment.evaluation);

  items.push({
    label: "Submit the course evaluation",
    met: evaluationDone,
    detail: evaluationDone
      ? "Submitted"
      : "Rate the course from the course page after finishing.",
  });

  return items;
}

export default function CertificationsPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [staffCourses, setStaffCourses] = useState<StaffCourse[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [loadingEligibility, setLoadingEligibility] = useState(true);

  const loadCertificates = useCallback(async () => {
    try {
      const response = await fetch("/api/training/certificates", {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(
            payload,
            response.status >= 500
              ? "The certificate service is currently returning a server error."
              : "Could not load certificates.",
          )
        );
      }

      const certificateList = readApiList<Certificate>(payload);
      setCertificates(certificateList);
      setSelectedCert((current) => current ?? certificateList[0] ?? null);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load certificates."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await loadCertificates();
    };

    void fetchData();
  }, [loadCertificates]);

  useEffect(() => {
    const loadEligibilityData = async () => {
      try {
        const [courses, attemptList, assessmentPayload] = await Promise.all([
          loadStaffCourses().catch(() => [] as StaffCourse[]),
          loadAssessmentAttempts(),
          fetch("/api/training/assessments", { cache: "no-store" })
            .then((response) => (response.ok ? response.json() : null))
            .catch(() => null),
        ]);

        setStaffCourses(courses);
        setAttempts(attemptList);
        setAssessments(readApiList<Assessment>(assessmentPayload));
      } finally {
        setLoadingEligibility(false);
      }
    };

    void loadEligibilityData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  // A certificate belongs to a specific course *and* cohort. Matching by
  // title alone wrongly hides the checklist for the same course in a different
  // cohort, so also compare the cohort (falling back to title-only when either
  // side has no cohort label).
  const certificateMatchesCourse = (
    certificate: Certificate,
    staffCourse: StaffCourse,
  ) => {
    const titleMatches =
      (certificate.course_title ?? "").trim().toLowerCase() ===
      (staffCourse.enrollment.course_title ?? "").trim().toLowerCase();
    if (!titleMatches) return false;

    const certCohort = (certificate.cohort ?? "").trim().toLowerCase();
    const enrollmentCohort = (staffCourse.enrollment.cohort_name ?? "")
      .trim()
      .toLowerCase();
    if (!certCohort || !enrollmentCohort) return true;

    return (
      certCohort.includes(enrollmentCohort) ||
      enrollmentCohort.includes(certCohort)
    );
  };

  // Enrolled courses that do not have a certificate yet — these get the
  // "what's left" checklist.
  const pendingCourses = staffCourses.filter(
    (staffCourse) =>
      !certificates.some((certificate) =>
        certificateMatchesCourse(certificate, staffCourse),
      ),
  );

  // A course that meets every requirement but has no certificate yet: the
  // backend issues certificates automatically, so this is the short window
  // between finishing and the certificate landing. We poll for it below.
  const awaitingIssue = useMemo(
    () =>
      !loadingEligibility &&
      pendingCourses.some((staffCourse) =>
        buildRequirements(staffCourse, assessments, attempts).every(
          (item) => item.met,
        ),
      ),
    [loadingEligibility, pendingCourses, assessments, attempts],
  );

  // Re-fetch certificates a few times while one is awaiting issue, so a learner
  // arriving straight from the final evaluation sees it appear without a manual
  // refresh. Self-terminating: stops as soon as the certificate shows up (the
  // course leaves `pendingCourses`) or after the retry cap.
  const [issueRetries, setIssueRetries] = useState(0);
  useEffect(() => {
    if (loading || !awaitingIssue || issueRetries >= 6) return;

    const timer = setTimeout(() => {
      void loadCertificates();
      setIssueRetries((count) => count + 1);
    }, 3000);

    return () => clearTimeout(timer);
  }, [awaitingIssue, loading, issueRetries, loadCertificates]);

  const handleDownload = () => {
    if (selectedCert?.pdf_url) {
      window.open(selectedCert.pdf_url, "_blank", "noopener,noreferrer");
      return;
    }

    window.print();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="print:hidden">
        <h2 className="mb-1 text-2xl font-bold text-gray-800">
          Certifications
        </h2>
        <p className="text-sm text-gray-500">
          View and download your official NYSC training certificates.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 print:hidden">
          {error}
        </div>
      )}

      {awaitingIssue && (
        <div className="flex items-center gap-3 rounded-lg border border-green-100 bg-[#f0f7f3] p-4 text-sm text-[#1a6b3c] print:hidden">
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#1a6b3c]/30 border-t-[#1a6b3c]" />
          <span>
            You&apos;ve completed everything — your certificate is being
            generated and will appear here in a moment.
          </span>
        </div>
      )}

      {loading ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading certificates...
        </p>
      ) : certificates.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          You do not have any certificates yet.
        </p>
      ) : selectedCert ? (
        <div className="flex flex-col gap-6 lg:flex-row print:block">
          <div className="space-y-4 lg:w-1/3 print:hidden">
            {certificates.map((cert) => (
              <button
                key={cert.id}
                onClick={() => setSelectedCert(cert)}
                className={`w-full rounded-2xl border p-5 text-left transition-all ${
                  selectedCert.id === cert.id
                    ? "border-[#1a6b3c] bg-[#1a6b3c] text-white shadow-md"
                    : "border-gray-200 bg-white text-gray-800 hover:border-[#1a6b3c]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`shrink-0 rounded-full p-2.5 ${
                      selectedCert.id === cert.id
                        ? "bg-white/20"
                        : "bg-[#f0f7f3] text-[#1a6b3c]"
                    }`}
                  >
                    <Award size={24} />
                  </div>
                  <div>
                    <h4
                      className={`mb-1.5 text-sm font-bold leading-snug ${
                        selectedCert.id === cert.id
                          ? "text-white"
                          : "text-gray-800"
                      }`}
                    >
                      {cert.course_title}
                      {cert.cohort ? (
                        <span
                          className={`ml-1.5 text-xs font-medium ${
                            selectedCert.id === cert.id
                              ? "text-green-100"
                              : "text-gray-400"
                          }`}
                        >
                          · {cert.cohort}
                        </span>
                      ) : null}
                    </h4>
                    <p
                      className={`text-xs font-medium ${
                        selectedCert.id === cert.id
                          ? "text-green-100"
                          : "text-gray-500"
                      }`}
                    >
                      Issued: {formatDate(cert.issued_at)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center lg:w-2/3 print:w-full">
            <div className="flex w-full items-center justify-between rounded-t-2xl border border-b-0 border-gray-200 bg-white p-5 print:hidden">
              <span className="text-sm font-bold text-gray-700">
                Certificate Preview
              </span>
              <div className="flex gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                >
                  <Printer size={16} />
                  Print
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#145530]"
                >
                  {selectedCert.pdf_url ? (
                    <ExternalLink size={16} />
                  ) : (
                    <Download size={16} />
                  )}
                  {selectedCert.pdf_url ? "Open PDF" : "Download PDF"}
                </button>
              </div>
            </div>

            <div className="flex w-full justify-center overflow-x-auto rounded-b-2xl border border-gray-200 bg-gray-100 p-8 print:flex print:min-h-screen print:items-center print:justify-center print:border-none print:bg-white print:p-0 [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
              <div
                className="relative h-[565px] w-[800px] shrink-0 bg-white shadow-2xl print:h-auto print:w-[90%] print:max-w-[1000px] print:aspect-[800/565] print:shadow-none"
                id="certificate-canvas"
              >
                <div className="absolute inset-5 border-[3px] border-[#1a6b3c] p-2">
                  <div className="absolute inset-0 m-1 border border-[#1a6b3c]/30" />
                </div>
                <div className="absolute left-5 top-5 h-10 w-10 border-l-4 border-t-4 border-[#1a6b3c]" />
                <div className="absolute right-5 top-5 h-10 w-10 border-r-4 border-t-4 border-[#1a6b3c]" />
                <div className="absolute bottom-5 left-5 h-10 w-10 border-b-4 border-l-4 border-[#1a6b3c]" />
                <div className="absolute bottom-5 right-5 h-10 w-10 border-b-4 border-r-4 border-[#1a6b3c]" />

                <div className="absolute right-12 top-10 z-20 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Certificate ID
                  </p>
                  <p className="font-serif text-sm font-semibold text-gray-700">
                    {selectedCert.certificate_id}
                  </p>
                </div>

                <div className="relative z-10 flex h-full flex-col items-center justify-center px-12 py-10 text-center">
                  <Image
                    src="/images/nysc-logo.png"
                    alt="NYSC Logo"
                    width={72}
                    height={72}
                    className="mb-4 opacity-90"
                  />
                  <h1 className="mb-2 font-serif text-3xl font-bold uppercase tracking-widest text-[#1a6b3c]">
                    Certificate of Completion
                  </h1>
                  <p className="mb-6 text-sm font-medium uppercase tracking-widest text-gray-500">
                    National Youth Service Corps E-Training
                  </p>
                  <p className="mb-3 text-lg italic text-gray-700">
                    This is to proudly certify that
                  </p>
                  <h2 className="mb-2 inline-block max-w-full break-words border-b-2 border-gray-300 px-12 pb-2 font-serif text-4xl font-bold text-gray-900">
                    {selectedCert.staff_name}
                  </h2>
                  <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-gray-600">
                    File Number: {selectedCert.file_number}
                  </p>
                  <p className="mb-2 text-lg italic text-gray-700">
                    has successfully completed the training course
                  </p>
                  <h3 className="mb-2 max-w-xl text-2xl font-bold text-[#1a6b3c]">
                    {selectedCert.course_title}
                  </h3>
                  {selectedCert.cohort ? (
                    <p className="mb-8 text-sm font-semibold text-gray-500">
                      {selectedCert.cohort} Cohort
                    </p>
                  ) : (
                    <div className="mb-8" />
                  )}

                  <div className="mt-auto flex w-full justify-between px-16">
                    <div className="flex w-48 flex-col items-center">
                      <div className="flex h-10 items-end">
                        <span className="font-serif text-xl italic text-gray-800">
                          {formatDate(selectedCert.issued_at)}
                        </span>
                      </div>
                      <div className="mt-2 w-full border-t border-gray-400 pt-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                          Date Issued
                        </p>
                      </div>
                    </div>

                    <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-yellow-200 bg-gradient-to-br from-yellow-300 to-yellow-600 shadow-lg">
                      <div className="flex h-24 w-24 items-center justify-center rounded-full border border-yellow-700">
                        <span className="text-center text-[11px] font-bold uppercase leading-tight tracking-widest text-yellow-900">
                          Official
                          <br />
                          NYSC
                          <br />
                          Seal
                        </span>
                      </div>
                    </div>

                    <div className="flex w-48 flex-col items-center">
                      <div className="h-10" />
                      <div className="mt-2 w-full border-t border-gray-400 pt-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                          Authorized Signature
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!loadingEligibility && pendingCourses.length > 0 && (
        <section className="print:hidden">
          <div className="mb-4">
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
              <Target size={20} className="text-[#1a6b3c]" />
              Certificate progress
            </h3>
            <p className="text-sm text-gray-500">
              What is left before your next certificate can be issued.
              Certificates are generated automatically once every requirement
              is met.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {pendingCourses.map((staffCourse) => {
              const items = buildRequirements(
                staffCourse,
                assessments,
                attempts,
              );
              const metCount = items.filter((item) => item.met).length;
              const courseId = staffCourseId(staffCourse);

              return (
                <div
                  key={staffCourse.enrollment.id}
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-gray-800">
                        {staffCourse.enrollment.course_title}
                      </h4>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {metCount} of {items.length} requirement(s) met
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        metCount === items.length
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {metCount === items.length
                        ? "Awaiting issue"
                        : "In progress"}
                    </span>
                  </div>

                  <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-[#1a6b3c] transition-all duration-500"
                      style={{
                        width: `${Math.round((metCount / items.length) * 100)}%`,
                      }}
                    />
                  </div>

                  <RequirementChecklist items={items} />

                  {courseId !== null && (
                    <Link
                      href={`/staff/course/${courseId}/learn`}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#1a6b3c] px-4 py-2 text-sm font-semibold text-[#1a6b3c] transition hover:bg-green-50"
                    >
                      <PlayCircle size={16} /> Continue course
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
