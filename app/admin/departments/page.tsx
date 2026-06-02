"use client";

import { useState } from "react";
import { Search, Filter, Plus, MoreHorizontal } from "lucide-react";
import { departments } from "@/app/data/adminData";

export default function DepartmentsPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Manage Departments</h2>
          <p className="text-sm text-gray-500 mt-1">Manage staff departments and organizational units.</p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition"
        >
          <Plus size={18} className={showForm ? "rotate-45 transition-transform" : "transition-transform"} />
          {showForm ? "Close Form" : "Add Department"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-bold text-gray-800 mb-2">Add New Department</h3>
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
              placeholder="e.g. ICT"
            />
          </div>
          <div className="pt-2">
            <button className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition">
              Save Department
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="relative max-w-md w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search departments..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition">
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
                <th className="px-6 py-4 font-medium">Department Name</th>
                <th className="px-6 py-4 font-medium">Staff Count</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
            {departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-semibold text-gray-800">{dept.name}</td>
                  <td className="px-6 py-4 text-gray-600">{dept.staffCount} members</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      dept.status === 'Active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {dept.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-[#1a6b3c] transition p-1">
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
            ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Placeholder */}
        <div className="p-5 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <p>Showing 1 to {departments.length} of {departments.length} entries</p>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">Prev</button>
            <button className="px-3 py-1 bg-[#1a6b3c] text-white rounded">1</button>
            <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}