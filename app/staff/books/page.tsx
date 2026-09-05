"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  LayoutGrid,
  List,
  Search,
} from "lucide-react";
import {
  extractErrorMessage,
  readApiList,
} from "@/app/lib/portal-api";
import { formatDate } from "@/app/lib/format";
import { Pagination } from "@/app/components/ui-interactive";
import { cachedFetchAll } from "@/app/lib/data-cache";

type ViewMode = "grid" | "list";

type NYSCBook = {
  id: number;
  title: string;
  description: string | null;
  file_url: string;
  cover_image_url: string | null;
  uploaded_at: string;
};

export default function LibraryPage() {
  const [books, setBooks] = useState<NYSCBook[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBooks = useCallback(async () => {
    try {
      const response = await cachedFetchAll("/api/learning/books");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not load NYSC books.")
        );
      }

      setBooks(readApiList<NYSCBook>(payload));
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load NYSC books."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await loadBooks();
    };

    void fetchData();
  }, [loadBooks]);

  const filteredBooks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return books;

    return books.filter((book) =>
      `${book.title} ${book.description ?? ""}`
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [books, search]);

  // Bounds how many cards render at once — with many staff on the portal at
  // once, an unbounded list is exactly what makes a page like this feel slow.
  const pageSize = view === "grid" ? 9 : 10;
  const pageCount = Math.max(1, Math.ceil(filteredBooks.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleBooks = filteredBooks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-2xl font-bold text-gray-800">
              Library & Resources
            </h2>
            {!loading ? (
              <span className="rounded-full bg-[#f0f7f3] px-2.5 py-1 text-xs font-bold text-[#1a6b3c]">
                {books.length} resource{books.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Access official NYSC handbooks, rules, and policy documents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-80">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search library..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            />
          </div>

          <div className="hidden shrink-0 items-center rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm sm:flex">
            {(
              [
                { mode: "grid" as const, icon: LayoutGrid, label: "Grid view" },
                { mode: "list" as const, icon: List, label: "List view" },
              ]
            ).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                type="button"
                aria-label={label}
                aria-pressed={view === mode}
                onClick={() => {
                  setView(mode);
                  setPage(1);
                }}
                className={`flex h-9 w-9 items-center justify-center rounded-md transition ${
                  view === mode
                    ? "bg-[#1a6b3c] text-white"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && books.length > 0 ? (
        <p className="-mb-4 text-xs font-medium text-gray-400">
          Showing {visibleBooks.length} of {filteredBooks.length} resource
          {filteredBooks.length === 1 ? "" : "s"}
        </p>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="h-40 w-full animate-pulse bg-gray-100" />
              <div className="space-y-2 p-6">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
                <div className="h-5 w-3/4 animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredBooks.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          No NYSC books are available yet.
        </p>
      ) : view === "list" ? (
        <div className="space-y-3">
          {visibleBooks.map((book) => (
            <div
              key={book.id}
              className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-gray-200 hover:shadow-md"
            >
              <a
                href={book.file_url}
                target="_blank"
                rel="noreferrer"
                className="block h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-green-100 bg-[#f0f7f3]"
                title={`Open ${book.title}`}
              >
                {book.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.cover_image_url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[#1a6b3c]/40">
                    <FileText size={22} strokeWidth={1.5} />
                  </span>
                )}
              </a>

              <div className="min-w-0 flex-1">
                <a
                  href={book.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-semibold text-gray-900 transition hover:text-[#1a6b3c]"
                >
                  {book.title}
                </a>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                  <span className="line-clamp-1">
                    {book.description || "Official NYSC resource document."}
                  </span>
                  <span className="hidden shrink-0 sm:inline">
                    Updated {formatDate(book.uploaded_at)}
                  </span>
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={book.file_url}
                  download
                  className="rounded-lg p-2 text-gray-400 transition hover:bg-[#f0f7f3] hover:text-[#1a6b3c]"
                  title="Download PDF"
                >
                  <Download size={18} />
                </a>
                <a
                  href={book.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#145530]"
                >
                  <ExternalLink size={16} />
                  Read
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibleBooks.map((book) => (
            <div
              key={book.id}
              className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-5 flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border border-green-100 bg-[#f0f7f3] transition-transform group-hover:scale-[1.02]">
                {book.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.cover_image_url}
                    alt={`${book.title} cover`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FileText
                    size={48}
                    className="text-[#1a6b3c]"
                    strokeWidth={1.5}
                  />
                )}
              </div>

              <div className="flex-1">
                <span className="rounded-md bg-[#f0f7f3] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1a6b3c]">
                  NYSC Book
                </span>
                <h3 className="mb-2 mt-3 text-lg font-bold leading-tight text-gray-800">
                  {book.title}
                </h3>
                <p className="line-clamp-2 text-sm text-gray-500">
                  {book.description || "Official NYSC resource document."}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-800">
                    PDF Document
                  </span>
                  <span className="text-xs text-gray-400">
                    Updated {formatDate(book.uploaded_at)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={book.file_url}
                    download
                    className="rounded-lg p-2 text-gray-400 transition hover:bg-[#f0f7f3] hover:text-[#1a6b3c]"
                    title="Download PDF"
                  >
                    <Download size={18} />
                  </a>
                  <a
                    href={book.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#145530]"
                  >
                    <ExternalLink size={16} />
                    Read
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredBooks.length > 0 ? (
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
