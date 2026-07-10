"use client";

import { BATCH_OPTIONS, type Batch } from "@/app/lib/training-types";

type BatchSelectProps = {
  value: Batch | "";
  onChange: (value: Batch) => void;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

// Cohorts are no longer created by admins — a cohort is one of three fixed
// batches. This dropdown replaces every cohort picker in the new model.
export default function BatchSelect({
  value,
  onChange,
  id,
  required,
  disabled,
  className = "",
}: BatchSelectProps) {
  return (
    <select
      id={id}
      value={value}
      required={required}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as Batch)}
      className={`rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] disabled:bg-gray-50 ${className}`}
    >
      <option value="" disabled>
        Select a cohort batch
      </option>
      {BATCH_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
