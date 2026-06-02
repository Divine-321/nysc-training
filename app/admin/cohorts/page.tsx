"use client";

import { useState } from "react";
import { cohorts, departments } from "@/app/data/adminData";

export default function CohortsPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cohorts</h2>
          <p className="text-sm text-gray-500">Create batches or staff groups.</p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#1a6b3c] text-white px-5 py-2 rounded-lg"
        >
          + Create Cohort
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm max-w-2xl space-y-4">
          <input className="w-full border rounded-lg px-4 py-3" placeholder="Cohort name" />

          <select className="w-full border rounded-lg px-4 py-3">
            {departments.map((dept) => (
              <option key={dept.id}>{dept.name}</option>
            ))}
          </select>

          <button className="bg-[#1a6b3c] text-white px-5 py-2 rounded-lg">
            Save Cohort
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-[#f0f7f3]">
            <tr>
              <th className="text-left px-4 py-3">Cohort</th>
              <th className="text-left px-4 py-3">Department</th>
              <th className="text-left px-4 py-3">Members</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map((cohort) => (
              <tr key={cohort.id} className="border-b">
                <td className="px-4 py-4 font-medium">{cohort.name}</td>
                <td className="px-4 py-4">{cohort.department}</td>
                <td className="px-4 py-4">{cohort.members}</td>
                <td className="px-4 py-4">
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
                    {cohort.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}