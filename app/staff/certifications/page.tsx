"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  Download,
  ExternalLink,
  Info,
  PlayCircle,
  Printer,
  Target,
} from "lucide-react";
import {
  extractErrorMessage,
  readApiList,
} from "@/app/lib/portal-api";
import {
  attemptsForEnrollment,
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
import CertificateDocument from "@/app/components/CertificateDocument";
import { formatDate as formatDateMedium } from "@/app/lib/format";
import { cachedFetch } from "@/app/lib/data-cache";

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
  // fallback for older payloads — scoped to this enrollment so passes from a
  // previous delivery of the same course don't tick a refresher's checklist.
  const passedPostTest = postTest
    ? flagIsTrue(enrollment.post_test_passed) ||
      attemptsForEnrollment(attempts, enrollment).some(
        (attempt) =>
          attempt.assessment === postTest.id &&
          attempt.passed &&
          (attempt.attempt_status ?? "SUBMITTED") === "SUBMITTED",
      )
    : false;

  // A course with no content is trivially complete on both content rows — the
  // backend's progress engine treats it exactly that way (it stamps
  // completed_at immediately), so an empty course must not sit "In progress"
  // forever on 0-of-0 rows.
  const items: RequirementItem[] = [
    {
      label: "Complete every activity",
      met:
        modulesWithContent.length === 0 ||
        completedModules === modulesWithContent.length,
      detail:
        modulesWithContent.length === 0
          ? "This course has no activities"
          : `${completedModules} of ${modulesWithContent.length} activity(ies) at 100%`,
    },
    {
      label: "Complete all learning materials",
      met: allDocs.length === 0 || completedDocs === allDocs.length,
      detail:
        allDocs.length === 0
          ? "This course has no materials"
          : `${completedDocs} of ${allDocs.length} material(s) completed`,
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

  // The certificate is a fixed 800×565 design. We measure the available width
  // and scale the whole canvas to fit, so it always shows in full on any screen
  // (no clipping, no sideways scroll) while staying pixel-perfect. A measured
  // number is used instead of CSS container-query units, which some browsers
  // dropped here — leaving the certificate cut off.
  const [certWrap, setCertWrap] = useState<HTMLDivElement | null>(null);
  const [certScale, setCertScale] = useState(1);
  useEffect(() => {
    if (!certWrap) return;

    const update = () => setCertScale(Math.min(1, certWrap.clientWidth / 800));

    update();
    const observer = new ResizeObserver(update);
    observer.observe(certWrap);

    return () => observer.disconnect();
  }, [certWrap]);

  const loadCertificates = useCallback(async () => {
    try {
      const response = await cachedFetch("/api/training/certificates");
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
          cachedFetch("/api/training/assessments")
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
  // "what's left" checklist. Orphaned enrollments are skipped: when a training
  // is deleted the backend keeps the enrollment for history with its programme
  // SET_NULL, so there is no course to finish and no certificate will ever be
  // issued for it — showing it as forever "In progress" is just confusing.
  const pendingCourses = staffCourses.filter(
    (staffCourse) =>
      (staffCourse.cohortCourse != null || staffCourse.course != null) &&
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

  // The certificate payload carries no training dates, but the programme it
  // belongs to does. Match the selected certificate back to its course/cohort
  // and read the training window from there, so the certificate can show
  // "held from … to …".
  const selectedProgramme = selectedCert
    ? (staffCourses.find((staffCourse) =>
        certificateMatchesCourse(selectedCert, staffCourse),
      )?.cohortCourse ?? null)
    : null;
  const periodFrom = selectedProgramme?.start_date
    ? formatDate(selectedProgramme.start_date)
    : undefined;
  const periodTo = selectedProgramme?.end_date
    ? formatDate(selectedProgramme.end_date)
    : undefined;

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

      {awaitingIssue &&
        (issueRetries < 6 ? (
          <div className="flex items-center gap-3 rounded-lg border border-green-100 bg-[#f0f7f3] p-4 text-sm text-[#1a6b3c] print:hidden">
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#1a6b3c]/30 border-t-[#1a6b3c]" />
            <span>
              You&apos;ve completed everything — your certificate is being
              generated and will appear here in a moment.
            </span>
          </div>
        ) : (
          // The poll gave up: don't keep promising an imminent certificate.
          // The backend hasn't issued it — that needs admin/backend attention,
          // not more waiting on this page.
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 print:hidden">
            You&apos;ve completed every requirement, but your certificate is
            taking longer than expected. Please check back later — if it still
            doesn&apos;t appear, contact an administrator.
          </div>
        ))}

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
            <div className="w-full rounded-t-2xl border border-b-0 border-gray-200 bg-white p-5 print:hidden">
              <div className="flex items-center justify-between gap-3">
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

              {!selectedCert.pdf_url && (
                <p className="mt-2.5 flex items-center gap-1.5 text-[11px] leading-snug text-gray-400">
                  <Info size={13} className="shrink-0" />
                  <span>
                    Printing? Turn off &ldquo;Headers and footers&rdquo; in the
                    print dialog&rsquo;s &ldquo;More settings&rdquo; for a clean
                    certificate.
                  </span>
                </p>
              )}
            </div>

            <div className="w-full rounded-b-2xl border border-gray-200 bg-gray-100 p-3 sm:p-8 print:flex print:min-h-screen print:items-center print:justify-center print:border-none print:bg-white print:p-0 [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
              {/* The certificate is a fixed 800×565 design. We measure this
                  wrapper (certScale = width / 800) and scale the canvas with a
                  plain inline transform, so the whole certificate always fits —
                  no clipping, no sideways scroll — on any screen. Inline styles
                  are used (not Tailwind arbitrary classes) so scaling can't be
                  dropped by the browser. Print is reset via globals.css. */}
              <div ref={setCertWrap} className="mx-auto w-full max-w-[800px]">
                <div
                  className="cert-print-box relative mx-auto overflow-hidden"
                  style={{ width: "100%", height: 565 * certScale }}
                >
                  <div
                    className="absolute left-0 top-0 origin-top-left bg-white shadow-2xl"
                    id="certificate-canvas"
                    style={{
                      width: 800,
                      height: 565,
                      transform: `scale(${certScale})`,
                    }}
                  >
                    <CertificateDocument
                      recipientName={selectedCert.staff_name}
                      fileNumber={selectedCert.file_number}
                      courseName={selectedCert.course_title}
                      cohortName={selectedCert.cohort ?? ""}
                      certificateId={selectedCert.certificate_id}
                      issuedDate={formatDate(selectedCert.issued_at)}
                      periodFrom={periodFrom}
                      periodTo={periodTo}
                    />
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
