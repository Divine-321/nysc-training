"use client";

import React, { useState } from "react";
import { Search, Filter, Download, X, Info } from "lucide-react";

const auditLogs = [
  {
    id: "LOG-1045",
    timestamp: "Jun 03, 2026 14:30",
    action: "Created Course",
    user: "Abba Admin",
    role: "Super Admin",
    target: "Historical Background of the NYSC",
    status: "Success",
    details: "Added new onboarding course for recruited staff",
    ipAddress: "192.168.1.45",
    device: "Mac OS / Chrome",
  },
  {
    id: "LOG-1044",
    timestamp: "Jun 03, 2026 11:15",
    action: "Assigned Course",
    user: "Abba Admin",
    role: "Super Admin",
    target: "Junior staff",
    status: "Success",
    details: "Assigned Historical Background to 450 members",
    ipAddress: "192.168.1.45",
    device: "Mac OS / Chrome",
  },
  {
    id: "LOG-1043",
    timestamp: "Jun 02, 2026 09:45",
    action: "Added Staff Member",
    user: "System",
    role: "Automated",
    target: "Angela N.",
    status: "Success",
    details: "Onboarded successfully via HR portal sync",
    ipAddress: "10.0.0.2",
    device: "System Internal",
  },
  {
    id: "LOG-1042",
    timestamp: "Jun 01, 2026 16:20",
    action: "Exported Reports",
    user: "Jane Doe",
    role: "Admin",
    target: "System Reports",
    status: "Success",
    details: "CSV export for May 2026 assessments",
    ipAddress: "192.168.1.112",
    device: "Windows 11 / Edge",
  },
  {
    id: "LOG-1041",
    timestamp: "May 30, 2026 10:05",
    action: "Updated Department",
    user: "Abba Admin",
    role: "Super Admin",
    target: "ICT",
    status: "Failed",
    details: "Validation error on staff count update",
    ipAddress: "192.168.1.45",
    device: "Mac OS / Chrome",
  },
];

type AuditLog = typeof auditLogs[0];

export default function AuditTrailPage() {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">System Audit Trail</h2>
          <p className="text-sm text-gray-500 mt-1">Track and review all administrative actions and system events.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition shadow-sm">
            <Download size={16} />
            Export Logs
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="relative max-w-md w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by action, user, or module..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b3c]"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition">
              <Filter size={16} />
              Filter by Date
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Timestamps</th>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Target</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {auditLogs.map((log) => (
                <tr key={log.id} onClick={() => setSelectedLog(log)} className="hover:bg-gray-50 transition cursor-pointer group">
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{log.timestamp}</td>
                  <td className="px-6 py-4 text-sm text-gray-800 font-medium whitespace-nowrap">{log.action}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-semibold text-gray-800">{log.user}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{log.role}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{log.target}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${log.status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs group-hover:text-[#1a6b3c] transition">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{log.details}</span>
                      <Info size={14} className="opacity-0 group-hover:opacity-100 shrink-0" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Placeholder */}
        <div className="p-5 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <p>Showing 1 to {auditLogs.length} of {auditLogs.length} entries</p>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">Prev</button>
            <button className="px-3 py-1 bg-[#1a6b3c] text-white rounded">1</button>
            <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* Comprehensive Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f0f7f3] text-[#1a6b3c] flex items-center justify-center">
                  <Info size={20} />
                </div>
                <h3 className="font-bold text-lg text-gray-800">Audit Log Details</h3>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-full p-2 transition">
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Log ID</p>
                  <p className="font-semibold text-gray-800">{selectedLog.id}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Timestamp</p>
                  <p className="font-semibold text-gray-800">{selectedLog.timestamp}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Action</p>
                  <p className="font-semibold text-[#1a6b3c]">{selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Target</p>
                  <p className="font-semibold text-gray-800">{selectedLog.target}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">User Initiated</p>
                  <p className="font-semibold text-gray-800">{selectedLog.user} <span className="text-xs font-medium text-gray-500">({selectedLog.role})</span></p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Status</p>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${selectedLog.status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {selectedLog.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">IP Address</p>
                  <p className="font-medium text-gray-600">{selectedLog.ipAddress}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Device</p>
                  <p className="font-medium text-gray-600">{selectedLog.device}</p>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Comprehensive Details</p>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-sm text-gray-700 font-medium leading-relaxed">
                  {selectedLog.details}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}