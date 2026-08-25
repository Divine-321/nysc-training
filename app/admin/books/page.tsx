"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Edit3,
  ExternalLink,
  FileText,
  ImageUp,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  extractErrorMessage,
  readApiList,
} from "@/app/lib/portal-api";
import { formatDate } from "@/app/lib/format";
import { uploadFileToCloudinary } from "@/app/lib/cloudinary-upload";
import { useConfirm } from "@/app/components/useConfirm";
import { cachedFetchAll } from "@/app/lib/data-cache";

type NYSCBook = {
  id: number;
  title: string;
  description: string | null;
  file_url: string;
  cloudinary_public_id: string | null;
  cover_image_url: string | null;
  cover_cloudinary_public_id: string | null;
  uploaded_at: string;
};

const emptyForm = {
  title: "",
  description: "",
  file_url: "",
  cover_image_url: "",
  cover_cloudinary_public_id: "",
};

export default function AdminBooksPage() {
  const { confirm, dialog } = useConfirm();
  const [books, setBooks] = useState<NYSCBook[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingBookId, setEditingBookId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [selectedCover, setSelectedCover] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [coverUploadProgress, setCoverUploadProgress] =
    useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const resetForm = () => {
    setForm(emptyForm);
    setSelectedPdf(null);
    setSelectedCover(null);
    setUploadProgress(null);
    setCoverUploadProgress(null);
    setEditingBookId(null);
    setShowForm(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      let fileUrl = form.file_url.trim();
      let coverImageUrl = form.cover_image_url.trim();
      let coverPublicId = form.cover_cloudinary_public_id.trim();

      if (selectedPdf) {
        setUploadProgress(0);
        const uploadResult = await uploadFileToCloudinary(
          selectedPdf,
          setUploadProgress,
          "book_pdf"
        );
        fileUrl = uploadResult.secure_url;
      }

      if (selectedCover) {
        setCoverUploadProgress(0);
        const coverUploadResult = await uploadFileToCloudinary(
          selectedCover,
          setCoverUploadProgress,
          "book_cover",
        );
        coverImageUrl = coverUploadResult.secure_url;
        coverPublicId = coverUploadResult.public_id;
      }

      if (!fileUrl) {
        throw new Error("Please upload a PDF file or paste a PDF URL.");
      }

      const response = await fetch(
        editingBookId
          ? `/api/learning/books/${editingBookId}`
          : "/api/learning/books",
        {
          method: editingBookId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...form,
            file_url: fileUrl,
            cover_image_url: coverImageUrl || null,
            cover_cloudinary_public_id: coverPublicId || null,
          }),
        }
      );
      const payload = response.status === 204 ? null : await response.json();

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not save NYSC book.")
        );
      }

      setSuccess(
        editingBookId
          ? "Book updated successfully."
          : "Book added successfully."
      );
      resetForm();
      await loadBooks();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save NYSC book."
      );
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (book: NYSCBook) => {
    setForm({
      title: book.title,
      description: book.description ?? "",
      file_url: book.file_url,
      cover_image_url: book.cover_image_url ?? "",
      cover_cloudinary_public_id: book.cover_cloudinary_public_id ?? "",
    });
    setSelectedPdf(null);
    setSelectedCover(null);
    setUploadProgress(null);
    setCoverUploadProgress(null);
    setEditingBookId(book.id);
    setShowForm(true);
    setOpenDropdownId(null);
    setSuccess("");
    setError("");
  };

  const handleDelete = async (book: NYSCBook) => {
    const shouldDelete = await confirm(`Delete "${book.title}"?`, {
      danger: true,
    });

    if (!shouldDelete) return;

    setError("");
    setSuccess("");
    setOpenDropdownId(null);

    try {
      const response = await fetch(`/api/learning/books/${book.id}`, {
        method: "DELETE",
      });
      const payload = response.status === 204 ? null : await response.json();

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload, "Could not delete NYSC book.")
        );
      }

      setSuccess("Book deleted successfully.");
      await loadBooks();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete NYSC book."
      );
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Manage NYSC Books
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Add and manage official handbooks, acts, and rules.
          </p>
        </div>

        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
              setSuccess("");
              setError("");
            }
          }}
          className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#145530]"
        >
          <Plus
            size={18}
            className={showForm ? "rotate-45 transition-transform" : ""}
          />
          {showForm ? "Close Form" : "Add Book"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <h3 className="font-bold text-gray-800">
            {editingBookId ? "Edit Book" : "Add New Book"}
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              required
              placeholder="Book title"
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            />

            <input
              type="url"
              placeholder="PDF file URL, optional if you upload below"
              value={form.file_url}
              onChange={(event) =>
                setForm({ ...form, file_url: event.target.value })
              }
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            />

            <input
              type="url"
              placeholder="Cover image URL, optional if you upload below"
              value={form.cover_image_url}
              onChange={(event) =>
                setForm({
                  ...form,
                  cover_image_url: event.target.value,
                  cover_cloudinary_public_id: "",
                })
              }
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] md:col-span-2"
            />

            <label className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600 md:col-span-2">
              <span className="block font-semibold text-gray-800">
                Upload PDF book
              </span>
              <span className="mb-3 block text-xs text-gray-500">
                Choose a PDF from your computer. It uploads first, then the
                book record saves automatically.
              </span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setSelectedPdf(file);
                  setUploadProgress(null);
                }}
                className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#1a6b3c] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#145530]"
              />
              {selectedPdf && (
                <span className="mt-2 block text-xs text-gray-500">
                  Selected: {selectedPdf.name}
                </span>
              )}
            </label>

            <label className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600 md:col-span-2">
              <span className="flex items-center gap-2 font-semibold text-gray-800">
                <ImageUp size={18} />
                Upload cover image optional
              </span>
              <span className="mb-3 block text-xs text-gray-500">
                Choose a cover image for the book card. If you skip this, a PDF
                icon will be shown instead.
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setSelectedCover(file);
                  setCoverUploadProgress(null);
                }}
                className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#1a6b3c] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#145530]"
              />
              {selectedCover && (
                <span className="mt-2 block text-xs text-gray-500">
                  Selected: {selectedCover.name}
                </span>
              )}
            </label>

            {form.cover_image_url && !selectedCover && (
              <div className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50 md:col-span-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.cover_image_url}
                  alt="Book cover preview"
                  className="h-44 w-full object-cover"
                />
              </div>
            )}

            <textarea
              placeholder="Short description"
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] md:col-span-2"
            />
          </div>

          {uploadProgress !== null && (
            <div className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[#1a6b3c] transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                Uploading PDF: {uploadProgress}%
              </p>
            </div>
          )}

          {coverUploadProgress !== null && (
            <div className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[#1a6b3c] transition-all"
                  style={{ width: `${coverUploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                Uploading cover: {coverUploadProgress}%
              </p>
            </div>
          )}

          <p className="text-xs text-gray-500">
            Direct PDF upload is now supported. The URL field is still available
            as a fallback if the file already lives somewhere safe.
          </p>

          <button
            disabled={saving}
            className="rounded-lg bg-[#1a6b3c] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#145530] disabled:opacity-60"
          >
            {saving ? "Saving..." : editingBookId ? "Update Book" : "Save Book"}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search books by title..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-gray-500">Loading books...</p>
          ) : filteredBooks.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">
              No NYSC books found.
            </p>
          ) : (
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Cover</th>
                  <th className="px-6 py-4 font-medium">Title</th>
                  <th className="px-6 py-4 font-medium">Description</th>
                  <th className="px-6 py-4 font-medium">Uploaded</th>
                  <th className="px-6 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBooks.map((book) => (
                  <tr key={book.id} className="transition hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <a
                        href={book.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-16 w-12 items-center justify-center overflow-hidden rounded-lg border border-green-100 bg-[#f0f7f3]"
                        title={`Open ${book.title}`}
                      >
                        {book.cover_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={book.cover_image_url}
                            alt={`${book.title} cover`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <FileText
                            size={22}
                            className="text-[#1a6b3c]"
                            strokeWidth={1.5}
                          />
                        )}
                      </a>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-800">
                      <a
                        href={book.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 transition hover:text-[#1a6b3c] hover:underline"
                        title={`Open ${book.title}`}
                      >
                        <FileText size={16} className="shrink-0 text-red-500" />
                        {book.title}
                      </a>
                    </td>
                    <td className="max-w-md truncate px-6 py-4 text-gray-600">
                      {book.description || "No description"}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-600">
                      {formatDate(book.uploaded_at)}
                    </td>
                    <td className="relative px-6 py-4 text-right">
                      <a
                        href={book.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mr-2 inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-[#1a6b3c] hover:text-[#1a6b3c]"
                      >
                        <ExternalLink size={14} />
                        Read
                      </a>

                      <button
                        onClick={() =>
                          setOpenDropdownId(
                            openDropdownId === book.id ? null : book.id
                          )
                        }
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-[#1a6b3c]"
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {openDropdownId === book.id && (
                        <div className="absolute right-8 z-10 mt-2 w-40 rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
                          <a
                            href={book.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50 hover:text-[#1a6b3c]"
                          >
                            <ExternalLink size={14} />
                            Open
                          </a>
                          <button
                            onClick={() => startEdit(book)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50 hover:text-[#1a6b3c]"
                          >
                            <Edit3 size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => void handleDelete(book)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {dialog}
    </div>
  );
}
