"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  HelpCircle,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";
import {
  loadAssessments,
  loadStaffCourse,
  submitAssessment,
  type Assessment,
  type AssessmentResult,
  type StaffCourse,
} from "@/app/lib/staff-learning";
import IdentityVerificationModal from "@/app/components/IdentityVerificationModal";
import ProctoringMonitor from "@/app/components/ProctoringMonitor";
import { closeProctoringSession } from "@/app/lib/proctoring";
import type { ProctoringStartResult } from "@/app/lib/training-types";

// The exam runs in three phases (PDF sections 14-15): an intro screen, a
// blocking identity-verification step, and the proctored questions view.
type ExamPhase = "intro" | "verifying" | "in_progress";

export default function AssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = Number(params.id);
  const assessmentType =
    params.type === "post-test" ? "POST_TEST" : "PRE_TEST";
  const assessmentLabel =
    assessmentType === "POST_TEST" ? "Post-Course Test" : "Pre-Course Test";

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [staffCourse, setStaffCourse] = useState<StaffCourse | null>(null);
  const [examPhase, setExamPhase] = useState<ExamPhase>("intro");
  const [proctoring, setProctoring] = useState<ProctoringStartResult | null>(
    null,
  );
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assessments, course] = await Promise.all([
          loadAssessments(courseId),
          loadStaffCourse(courseId),
        ]);
        const selectedAssessment =
          assessments.find((item) => item.type === assessmentType) ?? null;
        setAssessment(selectedAssessment);
        setStaffCourse(course);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load this assessment.",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [assessmentType, courseId]);

  const sortedQuestions = useMemo(
    () =>
      (assessment?.questions ?? [])
        .slice()
        .sort((first, second) => first.order - second.order),
    [assessment?.questions],
  );
  const question = sortedQuestions[currentQuestion];
  const allAnswered =
    sortedQuestions.length > 0 &&
    sortedQuestions.every((item) => answers[item.id] !== undefined);

  const handleSubmit = async () => {
    if (!assessment) return;

    if (!allAnswered) {
      setError("Please answer all questions before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const submission = sortedQuestions.map((item) => ({
        question: item.id,
        selected_option: answers[item.id],
      }));
      setResult(await submitAssessment(assessment.id, submission));

      // End the proctoring session so the backend can mark it CLEAN (or keep
      // it flagged for review) now that the attempt is submitted.
      if (proctoring?.sessionId) {
        void closeProctoringSession(proctoring.sessionId);
      }
      setExamPhase("intro");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not submit this assessment.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const enrollmentId = staffCourse?.enrollment.id ?? null;

  const handleStartExam = () => {
    setError("");

    if (!enrollmentId) {
      setError(
        "We could not find your enrollment for this course, so the assessment cannot start.",
      );
      return;
    }

    setExamPhase("verifying");
  };

  const handleVerified = (verification: ProctoringStartResult) => {
    setProctoring(verification);
    setExamPhase("in_progress");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-10 text-sm text-gray-500">
        Loading assessment...
      </div>
    );
  }

  if (!assessment || sortedQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-10">
        <button
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#1a6b3c]"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800">
            {assessmentLabel} not available
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Admin has not published questions for this assessment yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <main className="flex-1 overflow-y-auto px-6 py-10 lg:px-12 lg:py-14">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#1a6b3c]"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <h2 className="text-2xl font-bold text-gray-800">
                {assessment.title || assessmentLabel}
              </h2>
            </div>

            {error && (
              <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="min-h-[520px] rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:p-10">
              {!result && examPhase === "in_progress" ? (
                <div className="flex flex-col gap-8 md:flex-row lg:gap-12">
                  <aside className="w-full shrink-0 md:w-48">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                        Question
                      </p>
                      <h3 className="mb-4 text-3xl font-bold text-[#1a6b3c]">
                        {currentQuestion + 1}{" "}
                        <span className="text-lg text-gray-400">
                          / {sortedQuestions.length}
                        </span>
                      </h3>

                      <div
                        className={`flex items-center gap-2 text-sm font-medium ${
                          answers[question.id] !== undefined
                            ? "text-green-600"
                            : "text-amber-500"
                        }`}
                      >
                        {answers[question.id] !== undefined ? (
                          <>
                            <CheckCircle2 size={16} /> Answered
                          </>
                        ) : (
                          <>
                            <HelpCircle size={16} /> Pending
                          </>
                        )}
                      </div>

                      <div className="mt-4 border-t border-gray-200 pt-4">
                        <p className="text-xs font-medium text-gray-500">
                          Points: {question.points}
                        </p>
                      </div>
                    </div>
                  </aside>

                  <section className="max-w-2xl flex-1">
                    <h4 className="mb-8 text-lg font-medium leading-relaxed text-gray-800">
                      {question.text}
                    </h4>

                    <div className="mb-10 space-y-3">
                      {question.options.map((option, index) => {
                        const isSelected = answers[question.id] === option.id;

                        return (
                          <label
                            key={option.id}
                            className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition ${
                              isSelected
                                ? "border-[#1a6b3c] bg-green-50"
                                : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <div
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                isSelected
                                  ? "border-[#1a6b3c]"
                                  : "border-gray-300"
                              }`}
                            >
                              {isSelected && (
                                <div className="h-2.5 w-2.5 rounded-full bg-[#1a6b3c]" />
                              )}
                            </div>
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              checked={isSelected}
                              onChange={() =>
                                setAnswers((current) => ({
                                  ...current,
                                  [question.id]: option.id,
                                }))
                              }
                              className="hidden"
                            />
                            <span
                              className={`text-sm ${
                                isSelected
                                  ? "font-medium text-[#1a6b3c]"
                                  : "text-gray-700"
                              }`}
                            >
                              <span className="mr-3 font-semibold text-gray-400">
                                {String.fromCharCode(65 + index)}.
                              </span>
                              {option.text}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 pt-6">
                      <button
                        disabled={currentQuestion === 0}
                        onClick={() =>
                          setCurrentQuestion((current) => current - 1)
                        }
                        className="flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                      >
                        <ChevronLeft size={18} /> Previous
                      </button>

                      {currentQuestion < sortedQuestions.length - 1 ? (
                        <button
                          onClick={() =>
                            setCurrentQuestion((current) => current + 1)
                          }
                          className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-6 py-2.5 font-medium text-white transition hover:bg-[#145530]"
                        >
                          Next <ChevronRight size={18} />
                        </button>
                      ) : (
                        <button
                          disabled={submitting}
                          onClick={handleSubmit}
                          className={`flex items-center gap-2 rounded-lg px-6 py-2.5 font-medium text-white transition disabled:opacity-60 ${
                            allAnswered
                              ? "bg-[#1a6b3c] hover:bg-[#145530]"
                              : "bg-amber-500 hover:bg-amber-600"
                          }`}
                        >
                          {allAnswered ? (
                            <CheckCircle2 size={18} />
                          ) : (
                            <AlertCircle size={18} />
                          )}
                          {submitting ? "Submitting..." : "Submit Attempt"}
                        </button>
                      )}
                    </div>
                  </section>
                </div>
              ) : result ? (
                <div className="mx-auto max-w-xl py-8">
                  <div className="rounded-2xl border border-green-100 bg-[#f0f7f3] p-8 text-center">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-[#1a6b3c]">
                      <CheckCircle2 size={32} />
                    </div>
                    <h3 className="mb-2 text-2xl font-bold text-[#1a6b3c]">
                      Assessment Submitted
                    </h3>
                    <p className="mb-8 text-gray-600">
                      Your answers have been graded by the backend.
                    </p>

                    <div className="mb-8 grid grid-cols-2 gap-4">
                      <div className="rounded-xl border border-green-50 bg-white p-4 shadow-sm">
                        <p className="mb-1 text-sm font-medium text-gray-500">
                          Score
                        </p>
                        <p className="text-2xl font-bold text-gray-800">
                          {result.score}
                        </p>
                      </div>
                      <div className="rounded-xl border border-green-50 bg-white p-4 shadow-sm">
                        <p className="mb-1 text-sm font-medium text-gray-500">
                          Percentage
                        </p>
                        <p
                          className={`text-2xl font-bold ${
                            result.passed ? "text-[#1a6b3c]" : "text-red-500"
                          }`}
                        >
                          {result.percentage}%
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => router.push("/staff/result")}
                      className="w-full rounded-xl bg-[#1a6b3c] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#145530]"
                    >
                      View Detailed Result
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-xl py-8 text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-[#1a6b3c]">
                    <ShieldCheck size={32} />
                  </div>
                  <h3 className="mb-2 text-2xl font-bold text-gray-800">
                    {assessment.title || assessmentLabel}
                  </h3>
                  <p className="mb-8 text-sm text-gray-500">
                    {assessment.description ||
                      "Read the details below, then start when you are ready."}
                  </p>

                  <div className="mb-8 grid grid-cols-3 gap-4 text-left">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <FileText size={18} className="mb-2 text-[#1a6b3c]" />
                      <p className="text-xs font-medium text-gray-500">
                        Questions
                      </p>
                      <p className="text-lg font-bold text-gray-800">
                        {sortedQuestions.length}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <Award size={18} className="mb-2 text-[#1a6b3c]" />
                      <p className="text-xs font-medium text-gray-500">
                        Pass mark
                      </p>
                      <p className="text-lg font-bold text-gray-800">
                        {assessment.pass_mark}%
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <AlertCircle size={18} className="mb-2 text-[#1a6b3c]" />
                      <p className="text-xs font-medium text-gray-500">
                        Max attempts
                      </p>
                      <p className="text-lg font-bold text-gray-800">
                        {assessment.max_attempts || "Unlimited"}
                      </p>
                    </div>
                  </div>

                  <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 text-left text-sm text-amber-800">
                    <Camera size={18} className="mt-0.5 shrink-0" />
                    <p>
                      This assessment is proctored. Your camera must stay on:
                      we will verify your identity before you start, and
                      periodic snapshots are taken while you work. Switching
                      tabs or windows is recorded.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartExam}
                    disabled={!enrollmentId}
                    className="mx-auto flex items-center justify-center gap-2 rounded-xl bg-[#1a6b3c] px-8 py-3 font-semibold text-white shadow-sm transition hover:bg-[#145530] disabled:opacity-50"
                  >
                    <PlayCircle size={18} /> Start Assessment
                  </button>
                  {!enrollmentId && (
                    <p className="mt-3 text-xs text-red-600">
                      You are not enrolled in this course, so the assessment
                      cannot start.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        {!result && examPhase === "in_progress" && (
          <aside className="flex h-auto w-full shrink-0 flex-col border-t border-gray-200 bg-white p-6 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-l lg:border-t-0 lg:py-14">
            <h3 className="mb-6 text-lg font-bold text-gray-800">
              Quiz Navigation
            </h3>

            <div className="mb-8 grid grid-cols-5 gap-2 lg:grid-cols-4">
              {sortedQuestions.map((item, index) => {
                const isAnswered = answers[item.id] !== undefined;
                const isCurrent = currentQuestion === index;

                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentQuestion(index)}
                    className={`flex aspect-square items-center justify-center rounded-lg text-sm font-semibold transition-all ${
                      isCurrent
                        ? "bg-[#1a6b3c] text-white ring-2 ring-[#1a6b3c] ring-offset-2"
                        : isAnswered
                          ? "border border-green-200 bg-green-100 text-[#1a6b3c] hover:bg-green-200"
                          : "border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-auto w-full rounded-xl border-2 border-[#1a6b3c] px-6 py-3 font-bold text-[#1a6b3c] transition hover:bg-[#1a6b3c] hover:text-white disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit Attempt"}
            </button>
          </aside>
        )}
      </div>

      {examPhase === "verifying" && enrollmentId && (
        <IdentityVerificationModal
          assessmentId={assessment.id}
          enrollmentId={enrollmentId}
          onVerified={handleVerified}
          onCancel={() => setExamPhase("intro")}
        />
      )}

      {examPhase === "in_progress" && !result && proctoring?.sessionId ? (
        <ProctoringMonitor sessionId={proctoring.sessionId} />
      ) : null}
    </div>
  );
}
