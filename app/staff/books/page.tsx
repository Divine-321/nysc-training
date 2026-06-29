"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  Search,
} from "lucide-react";
import {
  extractErrorMessage,
  readApiList,
} from "@/app/lib/portal-api";
import { formatDate } from "@/app/lib/format";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBooks = useCallback(async () => {
    try {
      const response = await fetch("/api/learning/books", {
        cache: "no-store",
      });
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

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="mb-1 text-2xl font-bold text-gray-800">
            Library & Resources
          </h2>
          <p className="text-sm text-gray-500">
            Access official NYSC handbooks, rules, and policy documents.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search library..."
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading books...
        </p>
      ) : filteredBooks.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          No NYSC books are available yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredBooks.map((book) => (
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
    </div>
  );
}
