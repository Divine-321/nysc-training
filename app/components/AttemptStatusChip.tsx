import type { AssessmentAttemptStatus } from "@/app/lib/training-types";

const STATUS_STYLES: Record<AssessmentAttemptStatus, string> = {
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  SUBMITTED: "bg-green-100 text-green-700",
  FLAGGED: "bg-amber-100 text-amber-700",
  INVALIDATED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<AssessmentAttemptStatus, string> = {
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  FLAGGED: "Flagged",
  INVALIDATED: "Invalidated",
};

// Status chip for an AssessmentAttempt (PDF spec section 11). Ready for the
// attempts API; until it ships, screens keep using pass/fail styling.
export default function AttemptStatusChip({
  status,
}: {
  status: AssessmentAttemptStatus;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
        STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
