"use client";

import React, { useRef } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { PrinterIcon } from "@heroicons/react/24/outline";

export default function SingleItemTagModal({ isOpen, onClose, item }) {
  const printRef = useRef(null);

  if (!item) return null;

  const handlePrintSingle = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Single Ornament Tag / Voucher"
      subtitle={`Item Tag preview for ${item.itemNo}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        
        {/* Printable Tag Container */}
        <div
          ref={printRef}
          className="p-6 rounded-2xl bg-[#FAF9F6] border-2 border-[#B8860B] space-y-4 font-sans text-[#1C1917]"
        >
          {/* Tag Header */}
          <div className="text-center border-b border-[#E7E2D9] pb-3">
            <div className="text-xs uppercase tracking-widest font-extrabold text-[#B8860B]">
              AURUM JEWELLERS DISPATCH
            </div>
            <div className="text-2xl font-black text-[#1C1917] mt-1 tracking-tight">
              {item.itemNo}
            </div>
            <div className="text-xs text-[#78716C] mt-0.5">
              Purity: <strong className="text-[#1C1917]">{item.purity}</strong>
            </div>
          </div>

          {/* Item Name */}
          <div className="text-center">
            <div className="text-lg font-bold text-[#1C1917] leading-snug">
              {item.name}
            </div>
            <div className="text-xs text-[#78716C] mt-0.5">
              Category: {item.category}
            </div>
          </div>

          {/* Weights Grid */}
          <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-[#E7E2D9] text-center">
            <div>
              <div className="text-[11px] font-bold text-[#78716C] uppercase">
                Gross Wt
              </div>
              <div className="text-base font-bold text-[#1C1917]">
                {item.grossWeight.toFixed(3)} g
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-amber-600 uppercase">
                Stone Wt
              </div>
              <div className="text-base font-bold text-amber-700">
                {item.stoneWeight.toFixed(3)} g
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-sky-600 uppercase">
                Pearl Wt
              </div>
              <div className="text-base font-bold text-sky-700">
                {item.pearlWeight.toFixed(3)} g
              </div>
            </div>
            <div className="bg-[#B8860B]/10 rounded-lg p-1">
              <div className="text-[11px] font-extrabold text-[#B8860B] uppercase">
                Net Weight
              </div>
              <div className="text-base font-black text-[#B8860B]">
                {item.netWeight.toFixed(3)} g
              </div>
            </div>
          </div>

          {/* Assigned Salespeople */}
          <div className="border-t border-[#E7E2D9] pt-3 text-xs text-center space-y-1">
            <div className="font-semibold text-[#78716C]">Assigned Staff:</div>
            <div className="font-bold text-[#1C1917]">
              {item.assignedSalespeople?.join(", ") || "Unassigned"}
            </div>
          </div>

          {/* Stamp / Barcode placeholder */}
          <div className="pt-2 text-center">
            <div className="inline-block px-4 py-1.5 border border-dashed border-[#B8860B] rounded-lg text-xs font-mono font-bold text-[#B8860B]">
              * {item.itemNo} *
            </div>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" size="md" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={PrinterIcon}
            onClick={handlePrintSingle}
          >
            Print Tag
          </Button>
        </div>

      </div>
    </Modal>
  );
}
