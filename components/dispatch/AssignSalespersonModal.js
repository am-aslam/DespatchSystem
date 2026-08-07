"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useDispatch } from "@/context/DispatchContext";
import { useAuth } from "@/context/AuthContext";
import { UserGroupIcon } from "@heroicons/react/24/outline";

export default function AssignSalespersonModal({
  isOpen,
  onClose,
  selectedItemIds,
}) {
  const { assignSalespeopleToItems, items } = useDispatch();
  const { salespersonNames } = useAuth();
  const [selectedPeople, setSelectedPeople] = useState([]);

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        // If editing a single item, pre-check its assigned salespeople
        if (selectedItemIds.length === 1) {
          const item = items.find((i) => i.id === selectedItemIds[0]);
          if (item) {
            setSelectedPeople(item.assignedSalespeople || []);
            return;
          }
        }
        setSelectedPeople([]);
      });
    }
  }, [isOpen, selectedItemIds, items]);

  const togglePerson = (person) => {
    if (selectedPeople.includes(person)) {
      setSelectedPeople(selectedPeople.filter((p) => p !== person));
    } else {
      setSelectedPeople([...selectedPeople, person]);
    }
  };

  const handleSave = () => {
    assignSalespeopleToItems(selectedItemIds, selectedPeople);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Salespeople to Ornaments"
      subtitle={`Assigning ${selectedItemIds.length} selected ornament(s). Only selected users will be able to view these items.`}
      maxWidth="max-w-lg"
    >
      <div className="space-y-6">
        
        {/* Salespeople List Checkboxes */}
        <div className="space-y-3">
          <div className="text-base font-semibold text-[#1C1917] flex items-center gap-2">
            <UserGroupIcon className="w-5 h-5 text-[#B8860B]" />
            <span>Select Salespersons:</span>
          </div>

          <div className="space-y-2.5">
            {salespersonNames.map((person) => {
              const isChecked = selectedPeople.includes(person);
              return (
                <label
                  key={person}
                  onClick={() => togglePerson(person)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                    isChecked
                      ? "border-[#B8860B] bg-[#B8860B]/10 shadow-sm"
                      : "border-[#E7E2D9] bg-white hover:bg-[#FAF9F6]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by div onClick
                      className="w-5 h-5 text-[#B8860B] rounded border-[#E7E2D9] focus:ring-[#B8860B]"
                    />
                    <span className="text-base font-bold text-[#1C1917]">
                      {person}
                    </span>
                  </div>
                  {isChecked && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#B8860B] text-white">
                      ASSIGNED
                    </span>
                  )}
                </label>
              );
            })}
            {salespersonNames.length === 0 && (
              <div className="p-4 rounded-xl border border-[#DC2626]/20 bg-[#DC2626]/10 text-[#DC2626] text-xs font-bold">
                No active salesperson accounts found.
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E7E2D9]">
          <Button variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={handleSave}>
            Confirm Assignment ({selectedPeople.length})
          </Button>
        </div>

      </div>
    </Modal>
  );
}
