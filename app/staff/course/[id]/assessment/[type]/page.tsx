"use client";


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
  History,
  HelpCircle,
  Lock,
  PlayCircle,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Timer,
  XCircle,
} from "lucide-react";
import {
  attemptsForEnrollment,
  loadAssessmentAttempts,
  loadAssessments,
  loadStaffCourse,
  markDocumentComplete,
  startAssessment,
  submitAssessment,
  type Assessment,
  type AssessmentAttempt,
  type AssessmentQuestion,
  type AssessmentResult,
  type ProctoringViolationOutcome,
  type StaffCourse,
} from "@/app/lib/staff-learning";
import IdentityVerificationModal from "@/app/components/IdentityVerificationModal";
import ProctoringMonitor from "@/app/components/ProctoringMonitor";
import { closeProctoringSession } from "@/app/lib/proctoring";
import { formatDateTime } from "@/app/lib/format";
import type { ProctoringStartResult } from "@/app/lib/training-types";

// The exam runs in three phases (PDF sections 14-15): an intro screen, a
// blocking identity-verification step, and the proctored questions view.
type ExamPhase = "intro" | "verifying" | "in_progress";

// Fisher–Yates. Used only as a client-side fallback when the backend's
// per-attempt shuffle endpoint is unavailable — grading is by question/option
// id, so reordering never affects correctness.
function shuffle<T>(input: T[]): T[] {
  const copy = input.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function shuffleAssessment(
  questions: AssessmentQuestion[],
): AssessmentQuestion[] {
  return shuffle(questions).map((question) => ({
    ...question,
    options: shuffle(question.options),
  }));
}

// "9:05" countdown label for the remaining time in a timed attempt.
function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// "12m 30s" style label for time between starting and submitting an attempt.
function timeTaken(attempt: AssessmentAttempt): string | null {
  if (!attempt.start_time || !attempt.submission_time) return null;
  const ms =
    new Date(attempt.submission_time).getTime() -
    new Date(attempt.start_time).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export default function AssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = Number(params.id);
  const assessmentType =
    params.type === "post-test" ? "POST_TEST" : "PRE_TEST";
  const assessmentLabel =
    assessmentType === "POST_TEST" ? "Post-Assessment" : "Pre-Assessment";

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [staffCourse, setStaffCourse] = useState<StaffCourse | null>(null);
  const [examPhase, setExamPhase] = useState<ExamPhase>("intro");
  const [proctoring, setProctoring] = useState<ProctoringStartResult | null>(
    null,
  );
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  // Per-attempt server-shuffled questions (from the start endpoint). When
  // set, they are rendered EXACTLY as received — no client-side sorting.
  const [liveQuestions, setLiveQuestions] = useState<
    AssessmentQuestion[] | null
  >(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [violation, setViolation] =
    useState<ProctoringViolationOutcome | null>(null);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // Absolute epoch (ms) when a timed attempt must end. Stored as a wall-clock
  // deadline (not a countdown), so refreshing the page never resets the timer.
  // null = the assessment has no time limit.
  const [deadline, setDeadline] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const submittingRef = useRef(false);
  const autoSubmittedRef = useRef(false);
  const restoredRef = useRef(false);
  const submitRef = useRef<((auto?: boolean) => void) | null>(null);

  // Where an in-progress attempt is cached so a refresh can resume it.
  const progressKey = assessment
    ? `assessment-progress-${courseId}-${assessment.id}`
    : null;

  // The enrollment this attempt belongs to — sent to start/submit so the
  // backend scopes attempts to the right (per-cohort) run.
  const enrollmentId = staffCourse?.enrollment.id ?? null;

  const clearPersistedProgress = useCallback(() => {
    if (!progressKey) return;
    try {
      window.localStorage.removeItem(progressKey);
    } catch {
      // Non-fatal.
    }
  }, [progressKey]);

  // This assessment's submitted attempts, newest first. The list serializer
  // omits attempt_number, so number them chronologically ourselves. Scoped to
  // the given enrollment: each delivery of a course has its own attempt
  // allowance, so tries spent under a previous enrollment of the same course
  // must not count against (or be listed for) this one.
  const refreshAttempts = useCallback(
    async (
      assessmentId: number,
      enrollment: { id: number; enrolled_at: string } | null | undefined,
    ) => {
    // Scope to this enrolment: the same course delivered in several programmes
    // shares one assessment, so an unscoped fetch counts attempts from other
    // runs against this one. attemptsForEnrollment still filters client-side.
    const all = attemptsForEnrollment(
      await loadAssessmentAttempts(enrollment?.id).catch(() => []),
      enrollment,
    );
    const chronological = all
      .filter(
        (attempt) =>
          attempt.assessment === assessmentId &&
          (attempt.attempt_status ?? "SUBMITTED") === "SUBMITTED",
      )
      .sort((first, second) => {
        const firstTime = first.submitted_at ?? first.submission_time ?? "";
        const secondTime = second.submitted_at ?? second.submission_time ?? "";
        return firstTime.localeCompare(secondTime);
      })
      .map((attempt, index) => ({ ...attempt, attempt_number: index + 1 }));

    setAttempts(chronological.reverse());
    },
    [],
  );

  /**
   * Resumes a cached attempt, if one is stored under this key.
   *
   * The saved deadline is an absolute timestamp, so a refresh carries on
   * counting down from where the clock really is rather than restarting it —
   * and if it has already passed, the countdown effect submits immediately.
   *
   * Called from the loader rather than its own effect: the key depends on the
   * assessment id, so this is the earliest it can run, and doing it there
   * keeps the intro screen from flashing before the restore takes hold.
   */
  const restoreAttempt = (key: string) => {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;

      const saved = JSON.parse(raw) as {
        questions?: AssessmentQuestion[];
        answers?: Record<number, number>;
        currentQuestion?: number;
        deadline?: number | null;
        proctoring?: ProctoringStartResult | null;
      };
      if (!saved.questions?.length) return;

      setLiveQuestions(saved.questions);
      setAnswers(saved.answers ?? {});
      setCurrentQuestion(saved.currentQuestion ?? 0);
      setDeadline(saved.deadline ?? null);
      if (saved.proctoring) setProctoring(saved.proctoring);
      setExamPhase("in_progress");
    } catch {
      // Corrupt cache — start fresh.
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assessments, course] = await Promise.all([
          loadAssessments(courseId),
          loadStaffCourse(courseId),
        ]);
        // Prefer a specific assessment id (per-module tests share the same
        // pre-test/post-test route). Legacy links without an id fall back to
        // the course-level (orphan) test of that type, and only then to the
        // first module test of that type.
        const requestedId = Number(
          new URLSearchParams(window.location.search).get("assessment"),
        );
        const selectedAssessment =
          (requestedId
            ? assessments.find((item) => item.id === requestedId)
            : null) ??
          assessments.find(
            (item) => item.type === assessmentType && item.module == null,
          ) ??
          assessments.find((item) => item.type === assessmentType) ??
          null;
        setAssessment(selectedAssessment);
        setStaffCourse(course);

        // Resume a cached attempt here rather than in an effect watching the
        // assessment: the cache key is built from the assessment id, so this
        // is the first moment it can be read, and doing it in the same pass
        // avoids a render showing the intro screen before the restore lands.
        if (selectedAssessment && !restoredRef.current) {
          restoredRef.current = true;
          restoreAttempt(`assessment-progress-${courseId}-${selectedAssessment.id}`);
        }

        if (selectedAssessment) {
          await refreshAttempts(selectedAssessment.id, course?.enrollment);
        }
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
  }, [assessmentType, courseId, refreshAttempts]);

  // Attempt accounting. Every assessment carries a real limit; null or 0 only
  // turn up on records saved before that was true, and the backend refuses to
  // start a 0 anyway, so there is no limit worth showing for either.
  const maxAttempts =
    assessment?.max_attempts && assessment.max_attempts > 0
      ? assessment.max_attempts
      : null;
  const attemptsUsed = attempts.length;
  const attemptsRemaining =
    maxAttempts === null ? Infinity : Math.max(0, maxAttempts - attemptsUsed);
  const canAttempt = attemptsRemaining > 0;
  const bestPercentage = attempts.reduce(
    (best, attempt) => Math.max(best, Number(attempt.percentage ?? 0)),
    0,
  );

  /**
   * Where the learner goes after seeing their result.
   *
   * The results screen used to offer only "Back to Module", which sent people
   * backwards and left them to work out for themselves that an evaluation was
   * still outstanding. Point at whatever is genuinely next instead: learning
   * after the pre-test, the evaluation after the post-test, and the
   * certificate once the evaluation is in.
   */
  const nextStep = useMemo(() => {
    if (assessmentType === "PRE_TEST") {
      return {
        href: `/staff/course/${courseId}/learn`,
        label: "Start learning",
        hint: "The pre-test is done — the course content is next.",
      };
    }

    // A post-test belongs to a module, and finishing it finishes that module.
    // If another one follows, that is the next thing to do — the evaluation
    // only comes after the last module, so offering it here would skip
    // whatever is left.
    const orderedModules = (staffCourse?.modules ?? [])
      .slice()
      .sort((first, second) => first.order - second.order);
    const currentIndex = orderedModules.findIndex(
      (module) => module.id === assessment?.module,
    );
    const nextModule =
      currentIndex >= 0 ? orderedModules[currentIndex + 1] : undefined;

    if (nextModule) {
      return {
        href: `/staff/course/${courseId}/module/${nextModule.id}`,
        label: "Next module",
        hint: `Up next: ${nextModule.title}`,
      };
    }

    if (!staffCourse?.enrollment.evaluation) {
      return {
        href: `/staff/course/${courseId}/evaluation`,
        label: "Continue to course evaluation",
        hint: "The evaluation is the last requirement before your certificate is issued.",
      };
    }

    return {
      href: "/staff/certifications",
      label: "View my certificate",
      hint: "Every requirement is complete. Certificates are issued automatically.",
    };
  }, [assessmentType, courseId, staffCourse, assessment?.module]);

  const sortedQuestions = useMemo(() => {
    // Server-shuffled attempt order wins; the legacy sort only applies when
    // the start endpoint returned nothing to fall back on.
    if (liveQuestions) return liveQuestions;

    return (assessment?.questions ?? [])
      .slice()
      .sort((first, second) => first.order - second.order);
  }, [assessment?.questions, liveQuestions]);
  const question = sortedQuestions[currentQuestion];
  const allAnswered =
    sortedQuestions.length > 0 &&
    sortedQuestions.every((item) => answers[item.id] !== undefined);
  const unansweredCount = sortedQuestions.filter(
    (item) => answers[item.id] === undefined,
  ).length;
  const remainingMs = deadline !== null ? Math.max(0, deadline - nowTick) : null;

  const submitAttempt = useCallback(
    async (auto = false) => {
      if (!assessment || submittingRef.current) return;

      // Once the clock runs out, submission is forced through regardless of how
      // many answers are missing — that is the only path that lets an
      // incomplete attempt submit.
      const timeIsUp = deadline !== null && Date.now() >= deadline;
      const force = auto || timeIsUp;

      if (!force && !allAnswered) {
        setError(
          `Please answer all questions before submitting — ${unansweredCount} still ${
            unansweredCount === 1 ? "needs" : "need"
          } an answer.`,
        );
        return;
      }

      submittingRef.current = true;
      setSubmitting(true);
      setError("");

      try {
        // Only answered questions are sent; anything left blank when time runs
        // out is graded as unanswered by the backend.
        const submission = sortedQuestions
          .filter((item) => answers[item.id] !== undefined)
          .map((item) => ({
            question: item.id,
            selected_option: answers[item.id],
          }));
        const { result: submissionResult, violation: submissionViolation } =
          await submitAssessment(assessment.id, submission, enrollmentId);
        clearPersistedProgress();

        // A voided attempt has no score to show. Leave `result` null so the
        // results screen does not render an empty scorecard, and hand the
        // learner the explanation instead of leaving them on the question
        // paper until the clock runs out.
        if (submissionViolation) {
          setViolation(submissionViolation);
          setExamPhase("intro");
          void refreshAttempts(assessment.id, staffCourse?.enrollment);
          return;
        }

        setResult(submissionResult);

      // Passing the assessment completes its linked ASSESSMENT activity in
      // the module flow. The backend does not do this automatically yet, so
      // without it course progress gets stuck below 100% forever. Best-effort
      // stop-gap — harmless once the backend auto-completes server-side.
      if (submissionResult?.passed && staffCourse) {
        const linkedActivities = staffCourse.modules
          .flatMap((courseModule) => courseModule.activities)
          .filter(
            (doc) =>
              (doc.assessment_id ?? doc.assessment) === assessment.id,
          );

        for (const linkedActivity of linkedActivities) {
          await markDocumentComplete(
            staffCourse.enrollment.id,
            linkedActivity.id,
          ).catch(() => {
            // Progress sync is best-effort; the learn player will simply
            // still show the assessment activity as pending if this fails.
          });
        }
      }

      // End the proctoring session so the backend can mark it CLEAN (or keep
      // it flagged for review) now that the attempt is submitted.
      if (proctoring?.sessionId) {
        void closeProctoringSession(proctoring.sessionId);
      }

      // Refresh the attempt history so the new result appears immediately,
      // without the learner needing to reload the page.
      await refreshAttempts(assessment.id, staffCourse?.enrollment);
      setExamPhase("intro");
      setDeadline(null);
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Could not submit this assessment.",
        );
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [
      assessment,
      deadline,
      allAnswered,
      unansweredCount,
      sortedQuestions,
      answers,
      staffCourse,
      enrollmentId,
      proctoring,
      refreshAttempts,
      clearPersistedProgress,
    ],
  );

  const handleSubmit = () => void submitAttempt(false);

  // Keep a stable ref to the latest submit function so the countdown timer can
  // fire it on expiry without restarting the interval every render.
  useEffect(() => {
    submitRef.current = submitAttempt;
  }, [submitAttempt]);

  // Countdown tick: refresh the displayed clock every second and, the moment
  // the deadline passes, force-submit exactly once.
  useEffect(() => {
    if (examPhase !== "in_progress" || deadline === null) return;

    const check = () => {
      setNowTick(Date.now());
      if (Date.now() >= deadline && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        submitRef.current?.(true);
      }
    };

    check();
    const timer = window.setInterval(check, 1000);
    return () => window.clearInterval(timer);
  }, [examPhase, deadline]);

  // Cache the live attempt so a refresh (or accidental navigation) resumes it
  // with the same questions, answers and — crucially — the same wall-clock
  // deadline, instead of restarting the timer or losing progress.
  useEffect(() => {
    if (!progressKey || examPhase !== "in_progress" || !liveQuestions) return;
    try {
      window.localStorage.setItem(
        progressKey,
        JSON.stringify({
          questions: liveQuestions,
          answers,
          currentQuestion,
          deadline,
          proctoring,
        }),
      );
    } catch {
      // Storage unavailable — resume-on-refresh just won't be possible.
    }
  }, [
    progressKey,
    examPhase,
    liveQuestions,
    answers,
    currentQuestion,
    deadline,
    proctoring,
  ]);



  const handleStartExam = () => {
    setError("");

    if (!enrollmentId) {
      setError(
        "We could not find your enrollment for this course, so the assessment cannot start.",
      );
      return;
    }

    if (!canAttempt) {
      setError("You have used all of your attempts for this assessment.");
      return;
    }

    // The pre-test is not proctored: skip identity verification and start the
    // attempt directly with no proctoring session. Only the post-test requires
    // the camera/identity step.
    if (assessmentType === "PRE_TEST") {
      void beginAttempt(null);
      return;
    }

    setExamPhase("verifying");
  };

  // Resets back to a fresh attempt (used by "Try Again" when attempts remain).
  const handleRetake = () => {
    clearPersistedProgress();
    autoSubmittedRef.current = false;
    setDeadline(null);
    setResult(null);
    setViolation(null);
    setAnswers({});
    setLiveQuestions(null);
    setCurrentQuestion(0);
    setProctoring(null);
    setError("");
    setExamPhase("intro");
  };

  const handleVerified = (verification: ProctoringStartResult) =>
    beginAttempt(verification);

  // Starts the attempt. `verification` is the proctoring session for proctored
  // assessments, or null for the (unproctored) pre-test.
  const beginAttempt = async (
    verification: ProctoringStartResult | null,
  ) => {
    setProctoring(verification);

    // Ask the backend to start the attempt and return its randomized
    // question/option order (stable across refreshes). If that endpoint is
    // unavailable, shuffle client-side so every attempt is still randomized.
    // If the backend REFUSES the attempt (e.g. "Maximum attempts reached"),
    // do not open the exam — a submit without a server-side attempt is
    // guaranteed to fail after the staff has answered everything.
    let ordered: AssessmentQuestion[] | null = null;

    if (assessment) {
      let started: Awaited<ReturnType<typeof startAssessment>> = null;

      try {
        started = await startAssessment(assessment.id, enrollmentId);
      } catch (startError) {
        if (verification?.sessionId) {
          void closeProctoringSession(verification.sessionId);
        }
        setProctoring(null);
        setExamPhase("intro");

        const raw =
          startError instanceof Error
            ? startError.message
            : "Could not start this assessment.";

        // "Maximum attempts (0) reached" means the assessment was saved with
        // a limit of zero — the old admin convention for "unlimited", which
        // the backend enforces literally. Nobody can ever sit it, so telling
        // the learner they are out of attempts is both wrong and unhelpful.
        setError(
          /maximum attempts \(0\)/i.test(raw)
            ? "This assessment is set to zero attempts, so it cannot be started. Please ask your administrator to set an attempt limit for it."
            : raw,
        );
        return;
      }

      ordered = started?.questions?.length
        ? started.questions
        : shuffleAssessment(assessment.questions);
    }

    const durationMinutes =
      assessment?.duration && assessment.duration > 0
        ? assessment.duration
        : null;
    autoSubmittedRef.current = false;
    setDeadline(
      durationMinutes ? Date.now() + durationMinutes * 60_000 : null,
    );
    setLiveQuestions(ordered);
    setCurrentQuestion(0);
    setAnswers({});
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
                    {remainingMs !== null && (
                      <div
                        className={`mb-4 rounded-xl border p-4 text-center ${
                          remainingMs <= 60000
                            ? "border-red-200 bg-red-50"
                            : "border-gray-100 bg-white"
                        }`}
                      >
                        <p className="mb-1 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                          <Timer size={13} /> Time left
                        </p>
                        <p
                          className={`text-2xl font-bold tabular-nums ${
                            remainingMs <= 60000
                              ? "text-red-600"
                              : "text-[#1a6b3c]"
                          }`}
                        >
                          {formatClock(remainingMs)}
                        </p>
                      </div>
                    )}
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
                      {/* Blank option rows (e.g. an empty option_e column in
                          an imported CSV) are hidden so lettering stays
                          clean: A–D for 4 real options, A–E only when a 5th
                          option actually has text. */}
                      {question.options
                        .filter((option) => (option.text ?? "").trim() !== "")
                        .map((option, index) => {
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
              ) : violation ? (
                <div className="mx-auto max-w-xl py-8">
                  <div className="rounded-2xl border border-red-100 bg-red-50/60 p-8 text-center">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                      <ShieldAlert size={32} />
                    </div>
                    <h3 className="mb-2 text-2xl font-bold text-red-600">
                      Attempt not accepted
                    </h3>
                    <p className="mb-6 text-gray-600">
                      {violation.message ||
                        "This attempt was stopped because the proctoring session was invalidated."}
                    </p>

                    <div className="mb-8 flex items-start gap-2 rounded-lg border border-red-100 bg-white p-3 text-left text-sm text-gray-700">
                      <AlertCircle
                        size={16}
                        className="mt-0.5 shrink-0 text-red-500"
                      />
                      <span>
                        This attempt was not marked, so it has no score.
                        {violation.attempt?.attempt_number
                          ? ` It is recorded as attempt ${violation.attempt.attempt_number}.`
                          : ""}
                      </span>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      {canAttempt ? (
                        <button
                          onClick={handleRetake}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1a6b3c] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#145530]"
                        >
                          <RotateCcw size={18} /> Try Again
                        </button>
                      ) : null}
                      <button
                        onClick={() => router.back()}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#1a6b3c] px-6 py-3 font-semibold text-[#1a6b3c] transition hover:bg-green-50"
                      >
                        Back to Module
                      </button>
                    </div>

                    <p className="mt-4 text-xs text-gray-500">
                      {canAttempt
                        ? "Keep your camera on and stay on this tab for the whole assessment."
                        : "You have no attempts left. Contact an administrator if you believe this is a mistake."}
                    </p>
                  </div>
                </div>
              ) : result ? (
                <div className="mx-auto max-w-xl py-8">
                  <div
                    className={`rounded-2xl border p-8 text-center ${
                      result.passed
                        ? "border-green-100 bg-[#f0f7f3]"
                        : "border-red-100 bg-red-50/60"
                    }`}
                  >
                    <div
                      className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${
                        result.passed
                          ? "bg-green-100 text-[#1a6b3c]"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {result.passed ? (
                        <CheckCircle2 size={32} />
                      ) : (
                        <XCircle size={32} />
                      )}
                    </div>
                    <h3
                      className={`mb-2 text-2xl font-bold ${
                        result.passed ? "text-[#1a6b3c]" : "text-red-600"
                      }`}
                    >
                      {result.passed ? "Assessment Passed" : "Not Passed Yet"}
                    </h3>
                    <p className="mb-8 text-gray-600">
                      {result.passed
                        ? "Well done — your answers have been graded."
                        : `You needed ${assessment.pass_mark}% to pass. ${
                            canAttempt
                              ? "You can try again."
                              : "You have used all of your attempts."
                          }`}
                    </p>

                    <div className="mb-8 grid grid-cols-2 gap-4">
                      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <p className="mb-1 text-sm font-medium text-gray-500">
                          Score
                        </p>
                        <p className="text-2xl font-bold text-gray-800">
                          {result.score}
                        </p>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
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

                    <div className="flex flex-col gap-3 sm:flex-row">
                      {!result.passed && canAttempt ? (
                        <button
                          onClick={handleRetake}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1a6b3c] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#145530]"
                        >
                          <RotateCcw size={18} /> Try Again
                        </button>
                      ) : result.passed ? (
                        <Link
                          href={nextStep.href}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1a6b3c] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#145530]"
                        >
                          {nextStep.label} <ChevronRight size={18} />
                        </Link>
                      ) : null}
                      <button
                        onClick={() => router.back()}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#1a6b3c] px-6 py-3 font-semibold text-[#1a6b3c] transition hover:bg-green-50"
                      >
                        Back to Module
                      </button>
                    </div>
                    {result.passed && (
                      <p className="mt-4 text-xs text-gray-500">
                        {nextStep.hint}
                      </p>
                    )}
                    {!canAttempt && (
                      <p className="mt-4 text-xs text-gray-500">
                        Attempt {attemptsUsed} of {maxAttempts} — no attempts
                        remaining.
                      </p>
                    )}
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
                      <History size={18} className="mb-2 text-[#1a6b3c]" />
                      <p className="text-xs font-medium text-gray-500">
                        Attempts
                      </p>
                      <p className="text-lg font-bold text-gray-800">
                        {maxAttempts
                          ? `${attemptsUsed} / ${maxAttempts}`
                          : `${attemptsUsed} used`}
                      </p>
                    </div>
                  </div>

                  {/* Attempt history */}
                  {attempts.length > 0 && (
                    <div className="mb-8 overflow-hidden rounded-xl border border-gray-100 text-left">
                      <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                        <p className="flex items-center gap-2 text-sm font-bold text-gray-700">
                          <History size={15} className="text-[#1a6b3c]" />
                          Your attempts
                        </p>
                        {bestPercentage > 0 && (
                          <p className="text-xs font-semibold text-gray-500">
                            Best: {Math.round(bestPercentage)}%
                          </p>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-xs text-gray-400">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium">
                                #
                              </th>
                              <th className="px-4 py-2 text-left font-medium">
                                Date
                              </th>
                              <th className="px-4 py-2 text-left font-medium">
                                Score
                              </th>
                              <th className="px-4 py-2 text-left font-medium">
                                Time
                              </th>
                              <th className="px-4 py-2 text-left font-medium">
                                Result
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {attempts.map((attempt) => {
                              const taken = timeTaken(attempt);
                              const when =
                                attempt.submitted_at ??
                                attempt.submission_time ??
                                null;

                              return (
                                <tr key={attempt.id} className="text-gray-700">
                                  <td className="px-4 py-2.5 font-semibold">
                                    {attempt.attempt_number}
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-500">
                                    {when ? formatDateTime(when) : "—"}
                                  </td>
                                  <td className="px-4 py-2.5 font-medium">
                                    {attempt.percentage !== null
                                      ? `${attempt.percentage}%`
                                      : "—"}
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-500">
                                    <span className="inline-flex items-center gap-1">
                                      {taken ? (
                                        <>
                                          <Timer size={13} /> {taken}
                                        </>
                                      ) : (
                                        "—"
                                      )}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span
                                      className={`inline-flex items-center gap-1 text-xs font-bold ${
                                        attempt.passed
                                          ? "text-green-700"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {attempt.passed ? (
                                        <CheckCircle2 size={14} />
                                      ) : (
                                        <XCircle size={14} />
                                      )}
                                      {attempt.passed ? "Passed" : "Failed"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {assessmentType === "POST_TEST" && (
                    <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 text-left text-sm text-amber-800">
                      <Camera size={18} className="mt-0.5 shrink-0" />
                      <p>
                        This assessment is proctored. Your camera must stay on:
                        we will verify your identity before you start, and
                        periodic snapshots are taken while you work. Switching
                        tabs or windows is recorded.
                      </p>
                    </div>
                  )}

                  {assessment.duration && assessment.duration > 0 ? (
                    <p className="mb-3 flex items-center justify-center gap-1.5 text-sm font-medium text-gray-600">
                      <Timer size={15} className="text-[#1a6b3c]" />
                      Time limit: {assessment.duration} minute
                      {assessment.duration === 1 ? "" : "s"} — the test submits
                      automatically when the time is up.
                    </p>
                  ) : null}

                  {maxAttempts && canAttempt ? (
                    <p className="mb-3 text-sm font-medium text-gray-500">
                      Attempt {attemptsUsed + 1} of {maxAttempts} ·{" "}
                      {attemptsRemaining} remaining
                    </p>
                  ) : null}

                  {canAttempt ? (
                    <>
                      <button
                        type="button"
                        onClick={handleStartExam}
                        disabled={!enrollmentId}
                        className="mx-auto flex items-center justify-center gap-2 rounded-xl bg-[#1a6b3c] px-8 py-3 font-semibold text-white shadow-sm transition hover:bg-[#145530] disabled:opacity-50"
                      >
                        <PlayCircle size={18} />
                        {attemptsUsed > 0 ? "Retake Assessment" : "Start Assessment"}
                      </button>
                      {!enrollmentId && (
                        <p className="mt-3 text-xs text-red-600">
                          You are not enrolled in this course, so the assessment
                          cannot start.
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
                      <Lock size={20} className="mx-auto mb-2 text-gray-400" />
                      <p className="text-sm font-semibold text-gray-700">
                        No attempts remaining
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        You have used all {maxAttempts} attempt
                        {maxAttempts === 1 ? "" : "s"} for this assessment. Your
                        best score was {Math.round(bestPercentage)}%.
                      </p>
                    </div>
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

            <div className="mt-auto">
              {!allAnswered && (
                <p className="mb-2 text-center text-xs font-medium text-amber-600">
                  {unansweredCount} question{unansweredCount === 1 ? "" : "s"}{" "}
                  unanswered
                  {deadline !== null
                    ? " — the test auto-submits when time runs out"
                    : " — answer all to submit"}
                </p>
              )}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full rounded-xl border-2 border-[#1a6b3c] px-6 py-3 font-bold text-[#1a6b3c] transition hover:bg-[#1a6b3c] hover:text-white disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Attempt"}
              </button>
            </div>
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
