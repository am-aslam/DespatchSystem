"use client";

import React from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useDispatch } from "@/context/DispatchContext";
import { useAuth } from "@/context/AuthContext";
import { PrinterIcon } from "@heroicons/react/24/outline";

export default function PrintableDispatchSheet({ isOpen, onClose }) {
  const { allItemizedOrnaments, totals, assignedFilter } = useDispatch();
  const { currentUser } = useAuth();

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDateStr = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Print Ornaments List Preview"
      subtitle="Clean itemized print sheet containing all ornaments."
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        
        {/* Clean Print Container */}
        <div className="p-6 bg-white border border-[#E7E3DA] rounded-xl text-[#1C1917] space-y-4 font-sans text-xs">
          
          {/* Minimal Header (No logo, no address, no GSTIN, no signature blocks per user prompt) */}
          <div className="flex items-center justify-between border-b border-[#1C1917] pb-2">
            <div>
              <h1 className="text-xl font-black text-[#1C1917]">
                DISPATCH ORNAMENTS SHEET
              </h1>
              <p className="text-xs text-stone-600">
                Staff Filter: {assignedFilter === "ALL" ? "All Sales Personnel" : assignedFilter}
              </p>
            </div>
            <div className="text-right font-mono text-xs">
              <div>Date: {currentDateStr}</div>
              <div>Total Ornaments: <strong>{allItemizedOrnaments.length} Items</strong></div>
            </div>
          </div>

          {/* Clean Items Table */}
          <table className="w-full text-left border-collapse border border-[#E7E3DA] text-xs">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E7E3DA] text-[#1C1917]">
                <th className="p-2.5 font-bold border-r border-[#E7E3DA] w-10 text-center">#</th>
                <th className="p-2.5 font-bold border-r border-[#E7E3DA]">Item No</th>
                <th className="p-2.5 font-bold border-r border-[#E7E3DA]">Ornament Description</th>
                <th className="p-2.5 font-bold border-r border-[#E7E3DA]">Assigned Staff</th>
                <th className="p-2.5 font-bold border-r border-[#E7E3DA] text-right">Gross Wt</th>
                <th className="p-2.5 font-bold border-r border-[#E7E3DA] text-right">Stone Wt</th>
                <th className="p-2.5 font-bold border-r border-[#E7E3DA] text-right">Pearl Wt</th>
                <th className="p-2.5 font-bold text-right">Net Wt (g)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E3DA]">
              {allItemizedOrnaments.map((item, idx) => (
                <tr key={item.id}>
                  <td className="p-2.5 border-r border-[#E7E3DA] text-center font-bold text-stone-500">
                    {idx + 1}
                  </td>
                  <td className="p-2.5 border-r border-[#E7E3DA] font-extrabold text-[#1C1917]">
                    {item.itemNo}
                  </td>
                  <td className="p-2.5 border-r border-[#E7E3DA] font-semibold">
                    {item.name}
                  </td>
                  <td className="p-2.5 border-r border-[#E7E3DA] text-stone-600">
                    {item.assignedSalespeople?.join(", ")}
                  </td>
                  <td className="p-2.5 border-r border-[#E7E3DA] text-right font-bold">
                    {item.grossWeight.toFixed(3)}
                  </td>
                  <td className="p-2.5 border-r border-[#E7E3DA] text-right text-amber-800 font-medium">
                    {item.stoneWeight.toFixed(3)}
                  </td>
                  <td className="p-2.5 border-r border-[#E7E3DA] text-right text-sky-800 font-medium">
                    {item.pearlWeight.toFixed(3)}
                  </td>
                  <td className="p-2.5 text-right font-black text-[#1C1917]">
                    {item.netWeight.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#292524] text-white font-bold text-xs">
                <td colSpan={4} className="p-3 text-right font-extrabold uppercase">
                  Grand Totals:
                </td>
                <td className="p-3 text-right">{totals.grossWeight.toFixed(3)} g</td>
                <td className="p-3 text-right text-amber-300">
                  {totals.stoneWeight.toFixed(3)} g
                </td>
                <td className="p-3 text-right text-sky-300">
                  {totals.pearlWeight.toFixed(3)} g
                </td>
                <td className="p-3 text-right text-amber-200 font-black text-sm">
                  {totals.netWeight.toFixed(3)} g
                </td>
              </tr>
            </tfoot>
          </table>

        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-2 no-print">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Preview
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={PrinterIcon}
            onClick={handlePrint}
          >
            Print List
          </Button>
        </div>

      </div>
    </Modal>
  );
}
