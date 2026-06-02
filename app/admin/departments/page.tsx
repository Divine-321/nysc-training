"use client";

import { useState } from "react";
import { departments } from "@/app/data/adminData";

export default function DepartmentsPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h2 className="text-2xl font-bold">Departments</h2>
          <p className="text-sm text-gray-500">Manage staff departments.</p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#1a6b3c] text-white px-5 py-2 rounded-lg"
        >
          + Add Department
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm max-w-xl">
          <label className="text-sm font-medium">Department Name</label>
          <input
            className="w-full border rounded-lg px-4 py-3 mt-2 mb-4"
            placeholder="e.g. ICT"
          />
          <button className="bg-[#1a6b3c] text-white px-5 py-2 rounded-lg">
            Save Department
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-[#f0f7f3]">
            <tr>
              <th className="text-left px-4 py-3">Department</th>
              <th className="text-left px-4 py-3">Staff Count</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => (
              <tr key={dept.id} className="border-b">
                <td className="px-4 py-4 font-medium">{dept.name}</td>
                <td className="px-4 py-4">{dept.staffCount}</td>
                <td className="px-4 py-4">
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
                    {dept.status}
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