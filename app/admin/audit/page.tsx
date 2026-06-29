"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  extractErrorMessage,
  readApiList,
} from "@/app/lib/portal-api";
import { formatDateTime } from "@/app/lib/format";

type AuditLog = {
  id: number;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  action: string;
  description: string;
  ip_address: string | null;
  created_at: string;
};

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const response = await fetch("/api/audit", {
          cache: "no-store",
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            extractErrorMessage(payload, "Could not load audit logs.")
          );
        }

        setLogs(readApiList<AuditLog>(payload));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load audit logs."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadLogs();
  }, []);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredLogs = logs.filter((log) =>
    [
      log.action,
      log.description,
      log.user.email,
      log.user.first_name,
      log.user.last_name,
    ].some((value) =>
      value.toLowerCase().includes(normalizedSearch)
    )
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          System Audit Trail
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Administrative actions recorded by the system.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="relative max-w-md p-5">
          <Search
            size={18}
            className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search audit logs..."
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm"
          />
        </div>

        {loading ? (
          <p className="p-6 text-sm text-gray-500">
            Loading audit logs...
          </p>
        ) : filteredLogs.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">
            No audit logs were found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="p-4">Time</th>
                  <th className="p-4">User</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">IP Address</th>
                </tr>
              </thead>

              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-t">
                    <td className="p-4">
                      {formatDateTime(log.created_at)}
                    </td>

                    <td className="p-4">
                      <p className="font-semibold">
                        {[log.user.first_name, log.user.last_name]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                      <p className="text-xs text-gray-500">
                        {log.user.email}
                      </p>
                    </td>

                    <td className="p-4 font-medium">
                      {log.action}
                    </td>

                    <td className="p-4">
                      {log.description}
                    </td>

                    <td className="p-4">
                      {log.ip_address || "Not recorded"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}