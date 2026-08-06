"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import Badge from "@/components/ui/Badge";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

export default function ActivityLogsView() {
  const { isAdmin, isManager } = useAuth();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAdmin || isManager) {
      axios
        .get("/api/logs?limit=100")
        .then((res) => {
          if (res.data?.success) {
            setLogs(res.data.data || []);
          }
        })
        .catch((err) => console.error(err))
        .finally(() => setIsLoading(false));
    }
  }, [isAdmin, isManager]);

  if (!isAdmin && !isManager) {
    return (
      <div className="p-12 text-center text-[#DC2626] font-bold text-base bg-white rounded-xl border border-[#E7E3DA]">
        403 Forbidden: Only Administrators and Managers can view system activity logs.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      {/* Header Card */}
      <div className="bg-white p-4 rounded-xl border border-[#E7E3DA] flex items-center justify-between shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#1C1917] tracking-tight flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-[#292524]" />
            System Activity Audit Trail
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            Real-time audit log of user logins, dispatches, sales, drops, and user account actions.
          </p>
        </div>

        <Badge variant="stone" size="md">
          {logs.length} Log Entries
        </Badge>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-[#E7E3DA] rounded-xl shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse min-w-[700px] text-xs">
          <thead className="bg-[#FAF8F5] border-b border-[#E7E3DA] text-[#1C1917]">
            <tr>
              <th className="px-4 py-3 font-bold">#</th>
              <th className="px-4 py-3 font-bold">Action</th>
              <th className="px-4 py-3 font-bold">Description</th>
              <th className="px-4 py-3 font-bold">Performed By</th>
              <th className="px-4 py-3 font-bold">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E3DA] bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-stone-500">
                  Loading activity logs...
                </td>
              </tr>
            ) : logs.length > 0 ? (
              logs.map((log, idx) => (
                <tr key={log.id} className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="px-4 py-3 font-bold text-stone-400">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <span className="font-extrabold text-[#1C1917] bg-[#F5F2EC] px-2 py-0.5 rounded border border-[#E7E3DA] text-[11px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#1C1917]">
                    {log.description}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-[#1C1917]">{log.user_name}</span>
                    <span className="ml-1 text-[10px] text-stone-500">({log.user_role})</span>
                  </td>
                  <td className="px-4 py-3 text-[11px] font-medium text-[#78716C]">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-stone-500">
                  No activity logs recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
