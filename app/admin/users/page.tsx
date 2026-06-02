import { staffUsers } from "@/app/data/adminData";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Staff</h2>
        <p className="text-sm text-gray-500">View staff and their training groups.</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-[#f0f7f3]">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Department</th>
              <th className="text-left px-4 py-3">Cohort</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {staffUsers.map((staff) => (
              <tr key={staff.id} className="border-b">
                <td className="px-4 py-4 font-medium">{staff.name}</td>
                <td className="px-4 py-4">{staff.email}</td>
                <td className="px-4 py-4">{staff.department}</td>
                <td className="px-4 py-4">{staff.cohort}</td>
                <td className="px-4 py-4">
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
                    {staff.status}
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