import type { ProctoringSessionStatus } from "@/app/lib/training-types";

const STATUS_STYLES: Record<ProctoringSessionStatus, string> = {
  ACTIVE: "bg-blue-100 text-blue-700",
  CLEAN: "bg-green-100 text-green-700",
  FLAGGED: "bg-amber-100 text-amber-700",
  INVALIDATED: "bg-red-100 text-red-700",
};

export default function ProctoringStatusBadge({
  status,
  label,
}: {
  status: ProctoringSessionStatus;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
        STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {label ?? status}
    </span>
  );
}
