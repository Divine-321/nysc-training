import Link from "next/link";
import type { ComponentType, ReactNode } from "react";

/**
 * Shared admin design-system primitives — one visual language across every
 * screen. Brand green is #1a6b3c (hover #145530). Keep new admin UI built
 * from these instead of re-inventing card / button / badge styles per page.
 */

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a6b3c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#145530] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a6b3c] disabled:cursor-not-allowed disabled:opacity-60",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900",
} as const;

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm text-gray-500">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

const badgeVariants = {
  green: "bg-green-50 text-green-700 ring-green-600/20",
  gray: "bg-gray-100 text-gray-600 ring-gray-500/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
} as const;

export type BadgeVariant = keyof typeof badgeVariants;

export function Badge({
  children,
  variant = "gray",
}: {
  children: ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeVariants[variant]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: ComponentType<{ size?: number | string; className?: string }>;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-16 text-center">
      {Icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm ring-1 ring-gray-100">
          <Icon size={22} />
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-gray-100 ${className}`} />;
}

/** Shared form control styling — inputs, selects, textareas. */
export const field =
  "w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#1a6b3c] focus:ring-2 focus:ring-[#1a6b3c]/15 disabled:cursor-not-allowed disabled:bg-gray-50";

export const fieldLabel = "mb-1.5 block text-sm font-medium text-gray-700";

export function Breadcrumbs({
  items,
}: {
  items: { label: ReactNode; href?: string }[];
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-sm text-gray-400"
    >
      {items.map((item, index) => (
        <span key={index} className="flex min-w-0 items-center gap-1.5">
          {index > 0 && <span className="text-gray-300">/</span>}
          {item.href ? (
            <Link
              href={item.href}
              className="font-medium text-gray-500 transition hover:text-[#1a6b3c]"
            >
              {item.label}
            </Link>
          ) : (
            <span className="truncate font-semibold text-gray-800">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: ComponentType<{ size?: number | string; className?: string }>;
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-500">{label}</p>
        {Icon ? (
          <div className="rounded-lg bg-[#f0f7f3] p-2 text-[#1a6b3c]">
            <Icon size={16} />
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}
