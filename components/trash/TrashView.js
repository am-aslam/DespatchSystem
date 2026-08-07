"use client";

import React from "react";
import { useDispatch } from "@/context/DispatchContext";
import { useAuth } from "@/context/AuthContext";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { TrashIcon, ArrowPathIcon, XCircleIcon } from "@heroicons/react/24/outline";

export default function TrashView() {
  const { trash, restoreFromTrash, purgeFromTrash } = useDispatch();
  const { isAdmin, isManager } = useAuth();

  return (
    <div className="space-y-4">
      
      {/* Header Card */}
      <div className="bg-white p-4 rounded-xl border border-[#E7E3DA] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#1C1917] tracking-tight flex items-center gap-2">
            <TrashIcon className="w-5 h-5 text-[#DC2626]" />
            Trash Audit Bin
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            Audit log of deleted items. Click <strong>Restore</strong> to send back to active table, or click <strong>✖</strong> to permanently delete.
          </p>
        </div>

        <Badge variant="danger" size="md">
          {trash.length} Total Trash Items
        </Badge>
      </div>

      {/* Trash Table (Note / Remarks replaces Date & Time column) */}
      <div className="bg-white border border-[#E7E3DA] rounded-xl shadow-xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[750px] text-xs">
            <thead className="bg-[#FAF8F5] border-b border-[#E7E3DA] text-[#1C1917]">
              <tr>
                <th className="px-4 py-3 font-bold">Item No</th>
                <th className="px-4 py-3 font-bold">Ornament Name</th>
                <th className="px-4 py-3 font-bold">Delete Status</th>
                <th className="px-4 py-3 font-bold text-right">Net Weight</th>
                <th className="px-4 py-3 font-bold">Deleted By</th>
                <th className="px-4 py-3 font-bold">Note / Remarks</th>
                <th className="px-4 py-3 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E3DA] bg-white">
              {trash.length > 0 ? (
                trash.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="px-4 py-3 font-extrabold text-[#1C1917] text-sm">
                      {item.itemNo}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#1C1917]">
                      {item.name}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="danger" size="sm">
                        {item.status || "Deleted Item"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#1C1917] text-right">
                      {(item.netWeight || 0).toFixed(3)} g
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#1C1917]">
                      {item.deletedBy || "Admin"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#1C1917]">
                      {item.remarks || item.reason ? (
                        <span className="bg-[#FAF8F5] px-2.5 py-1 rounded-lg border border-[#E7E3DA] inline-block text-stone-800 font-semibold max-w-[180px] break-words">
                          {item.remarks || item.reason}
                        </span>
                      ) : (
                        <span className="text-stone-400 italic text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={ArrowPathIcon}
                          onClick={() => restoreFromTrash(item.id)}
                          title="Restore item back to active dispatch table"
                        >
                          Restore
                        </Button>
                        {(isAdmin || isManager) && (
                          <button
                            onClick={() => purgeFromTrash(item.id)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-[#DC2626] hover:bg-[#DC2626]/10 transition-colors"
                            title="Permanently remove item from trash"
                          >
                            <XCircleIcon className="w-5 h-5 stroke-[2]" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-[#78716C]">
                    Trash bin is empty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
