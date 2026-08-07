"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useDispatch } from "@/context/DispatchContext";

export default function DeleteModal({ isOpen, onClose, item }) {
  const { deleteSalespersonOrnament } = useDispatch();
  const [selectedAction, setSelectedAction] = useState("sold"); // default 'sold' per requirement
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setSelectedAction("sold");
        setRemarks("");
      });
    }
  }, [isOpen]);

  if (!item) return null;

  const handleConfirm = () => {
    deleteSalespersonOrnament(item.id, selectedAction, remarks);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="What happened to this ornament?"
      subtitle={`Item No: ${item.itemNo} — ${item.name} (${item.netWeight?.toFixed(3)}g Net)`}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4 text-xs">
        
        {/* Radio options container */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-[#1C1917]">
            Select Action:
          </div>

          {/* Option 1: Sold (Selected by default) */}
          <label
            onClick={() => setSelectedAction("sold")}
            className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
              selectedAction === "sold"
                ? "border-[#15803D] bg-[#15803D]/5 shadow-xs"
                : "border-[#E7E3DA] bg-white hover:bg-[#FAF8F5]"
            }`}
          >
            <input
              type="radio"
              name="deleteAction"
              value="sold"
              checked={selectedAction === "sold"}
              onChange={() => setSelectedAction("sold")}
              className="mt-0.5 w-4 h-4 text-[#15803D] focus:ring-[#15803D] border-[#E7E3DA]"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#15803D]">
                  ● Sold
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#15803D]/10 text-[#15803D]">
                  DEFAULT
                </span>
              </div>
              <p className="text-xs text-[#78716C] mt-0.5">
                Adds item weight to <strong>Sales History</strong> and logs in Trash audit trail.
              </p>
            </div>
          </label>

          {/* Option 2: Drop */}
          <label
            onClick={() => setSelectedAction("drop")}
            className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
              selectedAction === "drop"
                ? "border-[#DC2626] bg-[#DC2626]/5 shadow-xs"
                : "border-[#E7E3DA] bg-white hover:bg-[#FAF8F5]"
            }`}
          >
            <input
              type="radio"
              name="deleteAction"
              value="drop"
              checked={selectedAction === "drop"}
              onChange={() => setSelectedAction("drop")}
              className="mt-0.5 w-4 h-4 text-[#DC2626] focus:ring-[#DC2626] border-[#E7E3DA]"
            />
            <div className="flex-1">
              <span className="text-sm font-bold text-[#DC2626]">
                ○ Drop
              </span>
              <p className="text-xs text-[#78716C] mt-0.5">
                Stores <strong>only in Trash</strong>. Will NOT count as sales or revenue.
              </p>
            </div>
          </label>
        </div>

        {/* Optional Note / Remarks */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#1C1917]">
            Reason / Remarks (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Sold to customer / Returned"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full bg-[#FAF8F5] text-[#1C1917] text-xs px-3 py-2 rounded-lg border border-[#E7E3DA] focus:outline-none focus:border-[#292524]"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E3DA]">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={selectedAction === "sold" ? "secondary" : "danger"}
            size="sm"
            onClick={handleConfirm}
          >
            Confirm {selectedAction === "sold" ? "As Sold" : "Drop"}
          </Button>
        </div>

      </div>
    </Modal>
  );
}
