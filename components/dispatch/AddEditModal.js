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

  // Shared batch settings
  const [dispatchNo, setDispatchNo] = useState("");
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

  // Generate random dispatch number
  const generateDispatchNo = () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `GLD-${rand}`;
  };

  // Reset or initialize on modal open
  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        // Single Edit Mode
        setDispatchNo(editItem.batchNo || editItem.itemNo || generateDispatchNo());
        setCategoryName(editItem.name || "Gold Ornament");
        setGrossWeight(editItem.grossWeight?.toString() || "");
        setStoneWeight(editItem.stoneWeight?.toString() || "0");
        setPearlWeight(editItem.pearlWeight?.toString() || "0");
        setSelectedPeople(editItem.assignedSalespeople || ["SIJI CMS"]);
        setDraftItems([]);
      } else {
        // Batch Add Mode
        const newNo = generateDispatchNo();
        setDispatchNo(newNo);
        setCategoryName("Gold Ornament");
        setGrossWeight("");
        setStoneWeight("0");
        setPearlWeight("0");
        setSelectedPeople(["SIJI CMS", "BABU"]);
        setDraftItems([]);
        setEditingDraftIndex(null);

        setTimeout(() => {
          if (grossInputRef.current) grossInputRef.current.focus();
        }, 150);
      }
    }
  }, [isOpen, editItem]);

  // Calculate live single item weights
  const gross = parseFloat(grossWeight) || 0;
  const stone = parseFloat(stoneWeight) || 0;
  const pearl = parseFloat(pearlWeight) || 0;
  const currentAdWeight = Math.max(0, stone - pearl);
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

  // Add current weight inputs to draft list under the same Dispatch Number
  const handleAddToList = (e) => {
    if (e) e.preventDefault();

    if (gross <= 0) {
      showToast("Please enter a valid Gross Weight > 0", "danger");
      if (grossInputRef.current) grossInputRef.current.focus();
      return;
    }

    if (editingDraftIndex !== null) {
      // Update existing draft item
      const updated = [...draftItems];
      updated[editingDraftIndex] = {
        ...updated[editingDraftIndex],
        grossWeight: gross,
        stoneWeight: stone,
        pearlWeight: pearl,
        netWeight: currentNetWeight,
      };
      setDraftItems(updated);
      setEditingDraftIndex(null);
      showToast(`Updated item ${updated[editingDraftIndex].itemNo}`, "success");
    } else {
      // Add new ornament to this dispatch
      const nextNum = draftItems.length + 1;
      const itemNo = `${dispatchNo}-${nextNum}`;

      const newItem = {
        id: `draft-${Date.now()}-${nextNum}`,
        itemNo,
        name: categoryName,
        grossWeight: gross,
        stoneWeight: stone,
        pearlWeight: pearl,
        netWeight: currentNetWeight,
        isVerified: false,
      };

      setDraftItems((prev) => [...prev, newItem]);
      showToast(`Added ${itemNo} to batch!`, "success");
    }

    // Reset weight fields for fast next entry
    setGrossWeight("");
    setStoneWeight("0");
    setPearlWeight("0");

    setTimeout(() => {
      if (grossInputRef.current) grossInputRef.current.focus();
    }, 50);
  };

  const handleEditDraft = (index) => {
    const item = draftItems[index];
    setEditingDraftIndex(index);
    setGrossWeight(item.grossWeight.toString());
    setStoneWeight(item.stoneWeight.toString());
    setPearlWeight(item.pearlWeight.toString());
    if (grossInputRef.current) grossInputRef.current.focus();
  };

  const handleDeleteDraft = (index) => {
    setDraftItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit complete Dispatch Batch to Backend
  const handleFinalSubmit = () => {
    if (editItem) {
      updateItem(editItem.id, {
        grossWeight: gross,
        stoneWeight: stone,
        pearlWeight: pearl,
        assignedSalespeople: selectedPeople,
      });
      onClose();
      return;
    }

    let finalBatch = [...draftItems];
    if (gross > 0 && draftItems.length === 0) {
      const itemNo = `${dispatchNo}-1`;
      finalBatch.push({
        id: `draft-${Date.now()}-1`,
        itemNo,
        name: categoryName,
        grossWeight: gross,
        stoneWeight: stone,
        pearlWeight: pearl,
        netWeight: currentNetWeight,
      });
    }

    if (finalBatch.length === 0) {
      showToast("Please enter at least one ornament weight before finishing dispatch", "danger");
      return;
    }

    if (selectedPeople.length === 0) {
      showToast("Please select at least one Salesperson", "danger");
      return;
    }

    addBatch(finalBatch, selectedPeople, dispatchNo);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editItem ? `Edit Dispatch ${editItem.batchNo || editItem.itemNo}` : `Create New Dispatch ${dispatchNo}`}
      subtitle={editItem ? "Update ornament details" : "Add multiple ornaments into this dispatch batch. One summary row will be generated."}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        
        {/* Header Information (Dispatch No & Salesperson Selection) */}
        <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E7E3DA] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7E3DA] pb-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#78716C]">Dispatch Lot Number:</span>
              <span className="font-black text-sm text-[#1C1917] bg-white px-2.5 py-1 rounded border border-[#E7E3DA]">
                {dispatchNo}
              </span>
            </div>
            <div className="text-xs font-bold text-[#1C1917]">
              Ornaments Count: <span className="text-[#B8860B] font-extrabold">{draftItems.length} Added</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#1C1917] block mb-1.5">
              Assign Salesperson(s) *
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SALESPERSONS.map((person) => {
                const isSelected = selectedPeople.includes(person);
                return (
                  <button
                    key={person}
                    type="button"
                    onClick={() => toggleSalesperson(person)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-[#292524] text-white border border-[#292524] shadow-xs"
                        : "bg-white text-[#44403C] border border-[#E7E3DA] hover:bg-[#FAF8F5]"
                    }`}
                  >
                    {isSelected && <CheckIcon className="w-3.5 h-3.5 text-[#B8860B] stroke-[3]" />}
                    <span>{person}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Input Form for adding Ornaments */}
        <form onSubmit={handleAddToList} className="bg-white p-3.5 rounded-xl border border-[#E7E3DA] space-y-3">
          <div className="text-xs font-bold text-[#1C1917] uppercase tracking-wider flex items-center justify-between">
            <span>Ornament Weight Entry</span>
            {editingDraftIndex !== null && (
              <span className="text-amber-700 font-extrabold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Editing Item {draftItems[editingDraftIndex]?.itemNo}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-[#1C1917] block mb-1">
                Gross Weight (g) *
              </label>
              <input
                ref={grossInputRef}
                type="number"
                step="0.001"
                placeholder="0.000"
                value={grossWeight}
                onChange={(e) => setGrossWeight(e.target.value)}
                className="w-full bg-[#FAF8F5] text-[#1C1917] text-sm font-black px-3 py-2 rounded-lg border border-[#E7E3DA] focus:outline-none focus:border-[#292524] focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#1C1917] block mb-1">
                Total Stone Wt (g)
              </label>
              <input
                type="number"
                step="0.001"
                placeholder="0.000"
                value={stoneWeight}
                onChange={(e) => setStoneWeight(e.target.value)}
                className="w-full bg-[#FAF8F5] text-[#1C1917] text-sm font-bold px-3 py-2 rounded-lg border border-[#E7E3DA] focus:outline-none focus:border-[#292524] focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#1C1917] block mb-1">
                Pearl Weight (g)
              </label>
              <input
                type="number"
                step="0.001"
                placeholder="0.000"
                value={pearlWeight}
                onChange={(e) => setPearlWeight(e.target.value)}
                className="w-full bg-[#FAF8F5] text-[#1C1917] text-sm font-bold px-3 py-2 rounded-lg border border-[#E7E3DA] focus:outline-none focus:border-[#292524] focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-2.5 rounded-lg bg-[#FAF8F5] border border-[#E7E3DA] text-xs">
            <div>
              <span className="font-bold text-[#78716C]">Calculated AD Weight:</span>
              <div className="text-sm font-extrabold text-[#B8860B] mt-0.5">
                {currentAdWeight.toFixed(3)} g
              </div>
            </div>
            <div>
              <span className="font-bold text-[#78716C]">Calculated Net Weight:</span>
              <div className="text-sm font-black text-[#1C1917] mt-0.5">
                {currentNetWeight.toFixed(3)} g
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              type="submit"
              icon={PlusIcon}
              className="font-bold"
            >
              {editingDraftIndex !== null ? "Update Ornament" : "+ Add Ornament to Dispatch"}
            </Button>
          </div>
        </form>

        {/* Live Draft Ornaments List Table */}
        {draftItems.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#1C1917] uppercase tracking-wider flex items-center justify-between">
              <span>Ornaments in this Dispatch ({draftItems.length})</span>
              <span className="text-stone-500 font-semibold text-[11px]">
                Gross: {draftTotals.gross.toFixed(3)}g | Net: {draftTotals.net.toFixed(3)}g
              </span>
            </div>

            <div className="border border-[#E7E3DA] rounded-xl overflow-hidden bg-white max-h-48 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#FAF8F5] border-b border-[#E7E3DA] text-[#1C1917] sticky top-0">
                  <tr>
                    <th className="p-2.5 font-bold">#</th>
                    <th className="p-2.5 font-bold">Item No</th>
                    <th className="p-2.5 font-bold text-right">Gross Wt</th>
                    <th className="p-2.5 font-bold text-right">AD Wt</th>
                    <th className="p-2.5 font-bold text-right">Pearl Wt</th>
                    <th className="p-2.5 font-bold text-right">Net Wt</th>
                    <th className="p-2.5 font-bold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E3DA]">
                  {draftItems.map((item, index) => {
                    const ad = Math.max(0, (item.stoneWeight || 0) - (item.pearlWeight || 0));
                    return (
                      <tr key={item.id} className="hover:bg-[#FAF8F5]">
                        <td className="p-2.5 font-bold text-stone-400">{index + 1}</td>
                        <td className="p-2.5 font-extrabold text-[#1C1917]">{item.itemNo}</td>
                        <td className="p-2.5 text-right font-bold">{item.grossWeight.toFixed(3)}g</td>
                        <td className="p-2.5 text-right font-semibold text-[#B8860B]">{ad.toFixed(3)}g</td>
                        <td className="p-2.5 text-right font-semibold text-sky-800">{item.pearlWeight.toFixed(3)}g</td>
                        <td className="p-2.5 text-right font-extrabold text-[#1C1917]">{item.netWeight.toFixed(3)}g</td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditDraft(index)}
                              className="p-1 rounded text-stone-600 hover:text-[#1C1917]"
                              title="Edit"
                            >
                              <PencilIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDraft(index)}
                              className="p-1 rounded text-[#DC2626] hover:bg-[#DC2626]/10"
                              title="Delete"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E7E3DA]">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="md"
            type="button"
            onClick={handleFinalSubmit}
            className="font-extrabold"
          >
            Finish & Save Dispatch ({draftItems.length > 0 ? draftItems.length : 1} Ornaments)
          </Button>
        </div>

      </div>
    </Modal>
  );
}
