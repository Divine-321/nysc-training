"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Search,
  X,
} from "lucide-react";

/**
 * Interactive design-system primitives (client-only): action menus, modals,
 * toasts, search inputs and pagination. Server-safe primitives live in
 * ./ui.tsx — keep both files as the single source of admin UI styling.
 */

type IconComponent = ComponentType<{ size?: number | string; className?: string }>;

/* ------------------------------- ActionMenu ------------------------------ */

export type ActionMenuItem = {
  label: string;
  icon?: IconComponent;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export function ActionMenu({
  items,
  ariaLabel = "Actions",
}: {
  items: ActionMenuItem[];
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
      >
        <MoreVertical size={17} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg"
        >
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                role="menuitem"
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  item.danger
                    ? "text-red-600 hover:bg-red-50"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {Icon ? (
                  <Icon
                    size={15}
                    className={item.danger ? "text-red-500" : "text-gray-400"}
                  />
                ) : null}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Modal --------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {subtitle ? (
              <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {children}

        {footer ? (
          <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

/* --------------------------------- Toasts -------------------------------- */

export type Toast = {
  id: number;
  message: string;
  tone: "success" | "error";
};

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback(
    (message: string, tone: Toast["tone"] = "success") => {
      const id = Date.now() + Math.random();

      setToasts((current) => [...current, { id, message, tone }]);
      setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 4200);
    },
    [],
  );

  return { toasts, push };
}

export function ToastViewport({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[70] flex w-full max-w-xs flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-white px-4 py-3 text-sm font-medium shadow-lg ${
            toast.tone === "success"
              ? "border-green-100 text-gray-800"
              : "border-red-100 text-red-700"
          }`}
        >
          {toast.tone === "success" ? (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#1a6b3c]" />
          ) : (
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
          )}
          {toast.message}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ SearchInput ------------------------------ */

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-800 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#1a6b3c] focus:ring-2 focus:ring-[#1a6b3c]/15"
      />
    </div>
  );
}

/* ------------------------------- Pagination ------------------------------ */

export function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <p className="text-xs font-medium text-gray-500">
        Page {page} of {pageCount}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
        </button>

        {Array.from({ length: pageCount }).map((_, index) => {
          const pageNumber = index + 1;
          // Keep the strip compact: first, last, and a window around the
          // current page; everything else collapses into an ellipsis.
          const isEdge = pageNumber === 1 || pageNumber === pageCount;
          const isNear = Math.abs(pageNumber - page) <= 1;

          if (!isEdge && !isNear) {
            const isEllipsisSlot =
              pageNumber === page - 2 || pageNumber === page + 2;

            return isEllipsisSlot ? (
              <span key={pageNumber} className="px-1 text-xs text-gray-400">
                …
              </span>
            ) : null;
          }

          return (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              aria-label={`Page ${pageNumber}`}
              aria-current={pageNumber === page ? "page" : undefined}
              className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold shadow-sm transition ${
                pageNumber === page
                  ? "bg-[#1a6b3c] text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {pageNumber}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
