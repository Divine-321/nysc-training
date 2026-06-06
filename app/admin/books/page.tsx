"use client";

import { useState } from "react";
import { Search, Filter, Plus, MoreHorizontal, BookOpen, UploadCloud, FileText } from "lucide-react";

const mockBooks = [
  { id: "BOOK-001", title: "NYSC Handbook", lastUpdated: "Jan 20, 2026", size: "5.2 MB" },
  { id: "BOOK-002", title: "NYSC Yearbook", lastUpdated: "Dec 15, 2025", size: "25.8 MB" },
  { id: "BOOK-003", title: "Conditions of Service", lastUpdated: "Feb 01, 2026", size: "2.1 MB" },
  { id: "BOOK-004", title: "Composite Policy", lastUpdated: "Mar 10, 2026", size: "1.8 MB" },
  { id: "BOOK-005", title: "NYSC Act", lastUpdated: "Jan 05, 2026", size: "0.9 MB" },
  { id: "BOOK-006", title: "Public Service Rules (PSR)", lastUpdated: "Apr 02, 2026", size: "8.3 MB" },
];

export default function AdminBooksPage() {
  const [showForm, setShowForm] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Manage NYSC Books</h2>
          <p className="text-sm text-gray-500 mt-1">Upload and manage official handbooks, acts, and rules.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-sm"
        >
          <Plus size={18} className={showForm ? "rotate-45 transition-transform" : "transition-transform"} />
          {showForm ? "Close Form" : "Upload Book"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-bold text-gray-800 mb-2">Upload New Book/Document</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Book Title</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                placeholder="e.g. NYSC Handbook"
              />
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer h-full flex flex-col justify-center">
              <input type="file" className="hidden" id="book-upload" accept="application/pdf" />
              <label htmlFor="book-upload" className="cursor-pointer flex flex-col items-center">
                <UploadCloud size={24} className="text-gray-400 mb-2" />
                <span className="text-sm font-medium text-[#1a6b3c]">Click to upload PDF</span>
                <span className="text-xs text-gray-500 mt-1">Max file size: 20MB</span>
              </label>
            </div>
          </div>
          <div className="pt-2">
            <button className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition">
              Save Document
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="relative max-w-md w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search books by title..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Title</th>
                <th className="px-6 py-4 font-medium">Last Updated</th>
                <th className="px-6 py-4 font-medium">File Size</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
            {mockBooks.map((book) => (
                <tr key={book.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-semibold text-gray-800 flex items-center gap-2">
                    <FileText size={16} className="text-red-500 shrink-0" />
                    {book.title}
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{book.lastUpdated}</td>
                  <td className="px-6 py-4 text-gray-600">{book.size}</td>
                  <td className="px-6 py-4 text-right relative">
                    <button onClick={() => setOpenDropdownId(openDropdownId === book.id ? null : book.id)} className="text-gray-400 hover:text-[#1a6b3c] transition p-1 rounded-full hover:bg-gray-100">
                      <MoreHorizontal size={18} />
                    </button>
                    {openDropdownId === book.id && (
                      <div className="absolute right-8 mt-2 w-32 bg-white rounded-lg shadow-lg z-10 border border-gray-100 py-1">
                        <button className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#1a6b3c] transition">Replace</button>
                        <button className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}