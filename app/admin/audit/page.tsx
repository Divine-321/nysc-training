import { Search, Filter, Download } from "lucide-react";

const auditLogs = [
  {
    id: "LOG-1045",
    action: "Created new course 'Cybersecurity Basics'",
    user: "Abba Admin",
    role: "Super Admin",
    module: "Courses",
    date: "Jun 03, 2026 14:30",
  },
  {
    id: "LOG-1044",
    action: "Assigned course to 'Batch 2026-A'",
    user: "Abba Admin",
    role: "Super Admin",
    module: "Assignments",
    date: "Jun 03, 2026 11:15",
  },
  {
    id: "LOG-1043",
    action: "Added new staff member 'Angela N.'",
    user: "System",
    role: "Automated",
    module: "Users",
    date: "Jun 02, 2026 09:45",
  },
  {
    id: "LOG-1042",
    action: "Exported Reports CSV",
    user: "Jane Doe",
    role: "Admin",
    module: "Reports",
    date: "Jun 01, 2026 16:20",
  },
  {
    id: "LOG-1041",
    action: "Updated Department 'ICT'",
    user: "Abba Admin",
    role: "Super Admin",
    module: "Departments",
    date: "May 30, 2026 10:05",
  },
];

export default function AuditTrailPage() {
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
                <th className="px-6 py-4 font-medium">Log ID</th>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Module</th>
                <th className="px-6 py-4 font-medium">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-xs font-mono text-gray-500">{log.id}</td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-800">{log.user}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{log.role}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-800 font-medium">{log.action}</td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-md font-medium">
                      {log.module}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{log.date}</td>
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
    </div>
  );
}