"use client";

import { useState } from "react";
import { Search, Filter, Plus, MoreHorizontal } from "lucide-react";
import { cohorts, departments } from "@/app/data/adminData";

export default function CohortsPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Manage Cohorts</h2>
          <p className="text-sm text-gray-500 mt-1">Create and manage training batches or staff groups.</p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition"
        >
          <Plus size={18} className={showForm ? "rotate-45 transition-transform" : "transition-transform"} />
          {showForm ? "Close Form" : "Create Cohort"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-bold text-gray-800 mb-2">Add New Cohort</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cohort Name</label>
              <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]" placeholder="e.g. Batch 2026-C" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]">
                <option value="">Select Department...</option>
                {departments.map((dept) => (
                  <option key={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button className="bg-[#1a6b3c] hover:bg-[#145530] text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition">
              Save Cohort
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
              placeholder="Search cohorts..."
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
                <th className="px-6 py-4 font-medium">Cohort Name</th>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Members</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cohorts.map((cohort) => (
                <tr key={cohort.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-semibold text-gray-800">{cohort.name}</td>
                  <td className="px-6 py-4 text-gray-600">{cohort.department}</td>
                  <td className="px-6 py-4 text-gray-600">{cohort.members} staff</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      cohort.status === 'Active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {cohort.status}
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
          <p>Showing 1 to {cohorts.length} of {cohorts.length} entries</p>
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