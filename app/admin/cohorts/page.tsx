"use client";

import { useState } from "react";
import { Search, Filter, Plus, MoreHorizontal, Layers } from "lucide-react";

export const mockCohorts = [
  { id: "COH-002", name: "Junior staff", batch: "April/2026", staffCount: 320, status: "Upcoming", startDate: "Jun 2026", endDate: "Aug 2026" },
  { id: "COH-003", name: "Middle level staff", batch: "March/2027", staffCount: 510, status: "Completed", startDate: "Sep 2025", endDate: "Nov 2025" },
  { id: "COH-004", name: "Senior staff", batch: "May/2024", staffCount: 150, status: "Active", startDate: "Mar 2026", endDate: "May 2026" },
];

export default function DepartmentsPage() {
  const [showForm, setShowForm] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const dataList = mockCohorts;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Cohorts</h2>
          <p className="text-sm text-gray-500 mt-1">Manage staff training cohorts.</p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-sm"
        >
          <Plus size={18} className={showForm ? "rotate-45 transition-transform" : "transition-transform"} />
          {showForm ? "Close Form" : "Create Cohort"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-bold text-gray-800 mb-2">Create Cohort</h3>
          <div className="max-w-md space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cohort Name</label>
              <select className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]">
                <option value="">Select Cohort...</option>
                <option value="Junior staff">Junior staff</option>
                <option value="Middle level staff">Middle level staff</option>
                <option value="Senior staff">Senior staff</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                placeholder="e.g. April/2026"
              />
            </div>
          </div>
          <div className="pt-2">
            <button className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition">
              Save Cohort
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="relative max-w-md w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search cohorts..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c] shadow-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition shadow-sm">
              <Filter size={16} />
              Filter
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Cohort Name</th>
                <th className="px-6 py-4 font-medium">Batch</th>
                <th className="px-6 py-4 font-medium">Start Date</th>
                <th className="px-6 py-4 font-medium">End Date</th>
                <th className="px-6 py-4 font-medium">Staff Count</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
            {dataList.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-semibold text-gray-800">{item.name}</td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{item.batch}</td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{item.startDate}</td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{item.endDate}</td>
                  <td className="px-6 py-4 text-gray-600">{item.staffCount} members</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                      item.status === 'Active'
                        ? 'bg-green-100 text-green-700'
                        : item.status === 'Completed'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button onClick={() => setOpenDropdownId(openDropdownId === item.id ? null : item.id)} className="text-gray-400 hover:text-[#1a6b3c] transition p-1 rounded-full hover:bg-gray-100">
                      <MoreHorizontal size={18} />
                    </button>
                    {openDropdownId === item.id && (
                      <div className="absolute right-8 mt-2 w-32 bg-white rounded-lg shadow-lg z-10 border border-gray-100 py-1">
                        <button className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#1a6b3c] transition">Edit</button>
                        <button className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
            ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Placeholder */}
        <div className="p-5 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <p>Showing 1 to {dataList.length} of {dataList.length} entries</p>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition">Prev</button>
            <button className="px-3 py-1 bg-[#1a6b3c] text-white rounded-lg shadow-sm">1</button>
            <button className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}