"use client";

import React, { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { useDispatch } from "@/context/DispatchContext";
import { SALESPERSONS } from "@/context/AuthContext";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ListBulletIcon,
  CalculatorIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

export default function AddEditModal({ isOpen, onClose, editItem }) {
  const { addBatch, addItem, updateItem, calculateNetWeight, showToast } = useDispatch();

  // Mode: 'INPUT' or 'REVIEW'
  const [viewMode, setViewMode] = useState("INPUT");

  // Shared batch settings
  const [categoryName, setCategoryName] = useState("Gold Ornament");
  const [selectedPeople, setSelectedPeople] = useState(["SIJI CMS", "BABU"]);

  // Current weight inputs in form
  const [grossWeight, setGrossWeight] = useState("");
  const [stoneWeight, setStoneWeight] = useState("0");
  const [pearlWeight, setPearlWeight] = useState("0");

  // Draft items list for batch adding
  const [draftItems, setDraftItems] = useState([]);
  const [editingDraftIndex, setEditingDraftIndex] = useState(null);

  const grossInputRef = useRef(null);

  // Reset or initialize on modal open
  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        // Single Edit Mode
        setViewMode("INPUT");
        setCategoryName(editItem.name || "Gold Ornament");
        setGrossWeight(editItem.grossWeight?.toString() || "");
        setStoneWeight(editItem.stoneWeight?.toString() || "0");
        setPearlWeight(editItem.pearlWeight?.toString() || "0");
        setSelectedPeople(editItem.assignedSalespeople || []);
        setDraftItems([]);
      } else {
        // Batch Add Mode
        setViewMode("INPUT");
        setCategoryName("Gold Ornament");
        setGrossWeight("");
        setStoneWeight("0");
        setPearlWeight("0");
        setSelectedPeople(["SIJI CMS", "BABU"]);
        setDraftItems([]);
        setEditingDraftIndex(null);

        // Auto-focus gross weight input
        setTimeout(() => {
          if (grossInputRef.current) grossInputRef.current.focus();
        }, 150);
      }
    }
  }, [isOpen, editItem]);

  // Calculate live single item net weight
  const currentNetWeight = calculateNetWeight(grossWeight, stoneWeight);

  // Calculate draft totals
  const draftTotals = draftItems.reduce(
    (acc, item) => {
      acc.gross += item.grossWeight || 0;
      acc.stone += item.stoneWeight || 0;
      acc.pearl += item.pearlWeight || 0;
      acc.net += item.netWeight || 0;
      return acc;
    },
    { gross: 0, stone: 0, pearl: 0, net: 0 }
  );

  const toggleSalesperson = (person) => {
    if (selectedPeople.includes(person)) {
      setSelectedPeople(selectedPeople.filter((p) => p !== person));
    } else {
      setSelectedPeople([...selectedPeople, person]);
    }
  };

  // Add current weight inputs to draft list
  const handleAddToList = (e) => {
    if (e) e.preventDefault();

    const g = parseFloat(grossWeight) || 0;
    if (g <= 0) {
      showToast("Please enter a valid Gross Weight > 0", "danger");
      if (grossInputRef.current) grossInputRef.current.focus();
      return;
    }

    const s = parseFloat(stoneWeight) || 0;
    const p = parseFloat(pearlWeight) || 0;
    const net = calculateNetWeight(g, s);

    if (editingDraftIndex !== null) {
      // Update existing draft item
      setDraftItems((prev) =>
        prev.map((item, idx) =>
          idx === editingDraftIndex
            ? {
                ...item,
                name: categoryName || "Gold Ornament",
                grossWeight: g,
                stoneWeight: s,
                pearlWeight: p,
                netWeight: net,
              }
            : item
        )
      );
      setEditingDraftIndex(null);
    } else {
      // Append new draft item
      const randNo = Math.floor(1000 + Math.random() * 9000);
      const newItem = {
        itemNo: `GLD-${randNo}`,
        name: categoryName || "Gold Ornament",
        grossWeight: g,
        stoneWeight: s,
        pearlWeight: p,
        netWeight: net,
      };
      setDraftItems((prev) => [...prev, newItem]);
    }

    // Reset weight fields for super fast next entry & auto focus Gross Weight
    setGrossWeight("");
    setStoneWeight("0");
    setPearlWeight("0");

    setTimeout(() => {
      if (grossInputRef.current) grossInputRef.current.focus();
    }, 50);
  };

  // Handle Enter key on Stone/Pearl inputs to add item quickly
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddToList();
    }
  };

  // Remove item from draft
  const removeDraftItem = (index) => {
    setDraftItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Edit item from draft
  const startEditDraftItem = (index) => {
    const item = draftItems[index];
    setGrossWeight(item.grossWeight.toString());
    setStoneWeight(item.stoneWeight.toString());
    setPearlWeight(item.pearlWeight.toString());
    setEditingDraftIndex(index);
    setViewMode("INPUT");
    setTimeout(() => {
      if (grossInputRef.current) grossInputRef.current.focus();
    }, 50);
  };

  // Final Submit: Add all draft items to main sheet (or single edit)
  const handleFinalSubmit = () => {
    if (editItem) {
      // Single Item Edit
      const g = parseFloat(grossWeight) || 0;
      const s = parseFloat(stoneWeight) || 0;
      const p = parseFloat(pearlWeight) || 0;
      const net = calculateNetWeight(g, s);

      updateItem(editItem.id, {
        itemNo: editItem.itemNo,
        name: categoryName,
        category: "Ornament",
        grossWeight: g,
        stoneWeight: s,
        pearlWeight: p,
        netWeight: net,
        assignedSalespeople: selectedPeople,
      });
      onClose();
      return;
    }

    // Batch Add Mode
    let finalBatch = [...draftItems];
    const g = parseFloat(grossWeight) || 0;
    if (g > 0) {
      const s = parseFloat(stoneWeight) || 0;
      const p = parseFloat(pearlWeight) || 0;
      const net = calculateNetWeight(g, s);
      const randNo = Math.floor(1000 + Math.random() * 9000);
      finalBatch.push({
        itemNo: `GLD-${randNo}`,
        name: categoryName || "Gold Ornament",
        grossWeight: g,
        stoneWeight: s,
        pearlWeight: p,
        netWeight: net,
      });
    }

    if (finalBatch.length === 0) {
      showToast("Please enter at least 1 ornament weight before confirming", "danger");
      return;
    }

    if (typeof addBatch === "function") {
      addBatch(finalBatch, selectedPeople, categoryName || "Gold Ornaments Lot");
    } else if (typeof addItem === "function") {
      finalBatch.forEach((item) => {
        addItem({
          itemNo: item.itemNo,
          name: item.name,
          category: "Ornament",
          grossWeight: item.grossWeight,
          stoneWeight: item.stoneWeight,
          pearlWeight: item.pearlWeight,
          assignedSalespeople: selectedPeople,
        });
      });
    }

    showToast(`Added ${finalBatch.length} ornament(s) to active sheet!`, "success");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <CalculatorIcon className="w-5 h-5 text-[#292524]" />
            <span>
              {editItem
                ? `Edit Ornament ${editItem.itemNo}`
                : `Add Ornaments (${draftItems.length + (parseFloat(grossWeight) > 0 ? 1 : 0)})`}
            </span>
          </div>

          {/* Top Toggle Mode Button (Input vs Review) */}
          {!editItem && (
            <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-lg border border-[#E7E3DA]">
              <button
                type="button"
                onClick={() => setViewMode("INPUT")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                  viewMode === "INPUT"
                    ? "bg-[#292524] text-white"
                    : "text-[#78716C] hover:text-[#1C1917]"
                }`}
              >
                Input
              </button>
              <button
                type="button"
                onClick={() => setViewMode("REVIEW")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 ${
                  viewMode === "REVIEW"
                    ? "bg-[#292524] text-white"
                    : "text-[#78716C] hover:text-[#1C1917]"
                }`}
              >
                <ListBulletIcon className="w-3.5 h-3.5" />
                <span>Review ({draftItems.length})</span>
              </button>
            </div>
          )}
        </div>
      }
      subtitle={
        editItem
          ? "Update weight metrics below"
          : "Item-by-item fast calculator system. Enter weights & press Add To List."
      }
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        
        {/* INPUT MODE */}
        {viewMode === "INPUT" && (
          <div className="space-y-4">
            
            {/* Description & Salesperson assignment */}
            <div className="grid grid-cols-1 gap-3">
              <Input
                label="Ornament Description"
                placeholder="e.g. Antiq Bangle / Temple Necklace"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
            </div>

            {/* Weights Input Calculator Card */}
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E7E3DA] space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#1C1917] uppercase tracking-wider">
                <span>Weight Entry (Grams)</span>
                <span className="text-[11px] text-[#78716C] font-normal">
                  Press Enter to Add
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1C1917] block mb-1">
                    Gross Wt (g) *
                  </label>
                  <input
                    ref={grossInputRef}
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={grossWeight}
                    onChange={(e) => setGrossWeight(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-white text-[#1C1917] text-base font-bold px-3 py-2 rounded-lg border border-[#E7E3DA] focus:outline-none focus:border-[#292524] focus:ring-1 focus:ring-[#292524]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1C1917] block mb-1">
                    Stone Wt (g)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={stoneWeight}
                    onChange={(e) => setStoneWeight(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-white text-[#1C1917] text-base font-bold px-3 py-2 rounded-lg border border-[#E7E3DA] focus:outline-none focus:border-[#292524] focus:ring-1 focus:ring-[#292524]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1C1917] block mb-1">
                    Pearl Wt (g)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={pearlWeight}
                    onChange={(e) => setPearlWeight(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-white text-[#1C1917] text-base font-bold px-3 py-2 rounded-lg border border-[#E7E3DA] focus:outline-none focus:border-[#292524] focus:ring-1 focus:ring-[#292524]"
                  />
                </div>
              </div>

              {/* Add To List Button */}
              {!editItem && (
                <Button
                  variant="secondary"
                  size="md"
                  icon={PlusIcon}
                  onClick={handleAddToList}
                  className="w-full font-bold"
                >
                  {editingDraftIndex !== null ? "Update Item in Draft" : "Add To List"}
                </Button>
              )}
            </div>

            {/* Salesperson Assignment Checkboxes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1C1917] block">
                Assign Salesperson:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SALESPERSONS.map((person) => {
                  const isChecked = selectedPeople.includes(person);
                  return (
                    <label
                      key={person}
                      onClick={() => toggleSalesperson(person)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? "border-[#292524] bg-[#F5F2EC] font-bold text-[#1C1917]"
                          : "border-[#E7E3DA] bg-white text-[#78716C] hover:bg-[#FAF8F5]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 text-[#292524] rounded border-[#E7E3DA] focus:ring-[#292524]"
                      />
                      <span>{person}</span>
                    </label>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* REVIEW MODE */}
        {viewMode === "REVIEW" && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-[#1C1917] uppercase tracking-wider flex items-center justify-between">
              <span>Batch Draft Items ({draftItems.length})</span>
              <button
                type="button"
                onClick={() => setViewMode("INPUT")}
                className="text-xs text-[#292524] underline hover:font-bold"
              >
                + Add More Items
              </button>
            </div>

            <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1">
              {draftItems.length > 0 ? (
                draftItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-[#E7E3DA] bg-white flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-stone-500 min-w-[24px]">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-[#1C1917]">
                          G: <span className="text-sm font-black">{item.grossWeight.toFixed(3)}</span>g | S: {item.stoneWeight.toFixed(3)}g | P: {item.pearlWeight.toFixed(3)}g
                        </div>
                        <div className="text-[11px] text-[#78716C]">
                          Net Wt: <strong className="text-[#1C1917]">{item.netWeight.toFixed(3)}g</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => startEditDraftItem(idx)}
                        className="p-1.5 rounded text-stone-600 hover:bg-[#FAF8F5]"
                        title="Edit draft item"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDraftItem(idx)}
                        className="p-1.5 rounded text-[#DC2626] hover:bg-[#DC2626]/10"
                        title="Delete draft item"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-[#78716C] bg-[#FAF8F5] rounded-lg border border-[#E7E3DA]">
                  No items added to draft list yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* BATCH DRAFT ACCUMULATOR SUMMARY BOX */}
        {!editItem && (
          <div className="p-3.5 rounded-xl bg-[#292524] text-white space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-400">
              <span>Items Count</span>
              <span className="text-base font-extrabold text-white">
                {draftItems.length + (parseFloat(grossWeight) > 0 ? 1 : 0)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold text-stone-300">
              <span>Total Gross Wt</span>
              <span className="text-base font-extrabold text-white">
                {(draftTotals.gross + (parseFloat(grossWeight) || 0)).toFixed(3)} g
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold text-amber-300">
              <span>Total Stone Wt</span>
              <span className="text-sm font-bold">
                {(draftTotals.stone + (parseFloat(stoneWeight) || 0)).toFixed(3)} g
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold text-sky-300">
              <span>Total Pearl Wt</span>
              <span className="text-sm font-bold">
                {(draftTotals.pearl + (parseFloat(pearlWeight) || 0)).toFixed(3)} g
              </span>
            </div>

            <div className="pt-1 border-t border-stone-700 flex items-center justify-between text-xs font-extrabold text-white">
              <span>Total Net Weight</span>
              <span className="text-lg font-black text-amber-200">
                {(draftTotals.net + (currentNetWeight || 0)).toFixed(3)} g
              </span>
            </div>
          </div>
        )}

        {/* PRIMARY ACTION BUTTON */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E3DA]">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={CheckIcon}
            onClick={handleFinalSubmit}
            className="font-bold flex-1"
          >
            {editItem
              ? "Confirm & Save Changes"
              : `✔ Confirm & Add to Sheet (${
                  draftItems.length + (parseFloat(grossWeight) > 0 ? 1 : 0)
                } Items)`}
          </Button>
        </div>

      </div>
    </Modal>
  );
}
