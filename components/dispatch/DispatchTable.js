"use client";

import React, { useState } from "react";
import { useDispatch } from "@/context/DispatchContext";
import { useAuth } from "@/context/AuthContext";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import AddEditModal from "./AddEditModal";
import DeleteModal from "./DeleteModal";
import AssignSalespersonModal from "./AssignSalespersonModal";
import SingleItemTagModal from "./SingleItemTagModal";
import SubItemsListModal from "./SubItemsListModal";
import StickyTotalsRow from "./StickyTotalsRow";
import {
  PencilSquareIcon,
  TrashIcon,
  PrinterIcon,
  UserGroupIcon,
  QueueListIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";

export default function DispatchTable({ onOpenAddModal }) {
  const {
    batches,
    allItemizedOrnaments,
    selectedBatchIds,
    setSelectedBatchIds,
    deleteBatch,
    toggleItemVerification,
  } = useDispatch();
  const { isAdmin, isManager, isSalesperson } = useAuth();

  const [editingItem, setEditingItem] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [deletingSalesItem, setDeletingSalesItem] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [singlePrintItem, setSinglePrintItem] = useState(null);
  const [isSinglePrintModalOpen, setIsSinglePrintModalOpen] = useState(false);

  const [listAccessBatchId, setListAccessBatchId] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const activeListAccessBatch = batches.find((b) => b.id === listAccessBatchId);

  const isAllSelected =
    batches.length > 0 && selectedBatchIds.length === batches.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(batches.map((b) => b.id));
    }
  };

  const toggleSelectBatch = (id) => {
    if (selectedBatchIds.includes(id)) {
      setSelectedBatchIds(selectedBatchIds.filter((item) => item !== id));
    } else {
      setSelectedBatchIds([...selectedBatchIds, id]);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white border border-[#E7E3DA] rounded-xl shadow-xs overflow-hidden">
      
      {/* Batch Selection Bar (Admin / Manager) */}
      {(isAdmin || isManager) && selectedBatchIds.length > 0 && (
        <div className="bg-[#292524] text-white px-4 py-2 flex items-center justify-between no-print">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold">
              {selectedBatchIds.length} Dispatch(es) Selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={UserGroupIcon}
              onClick={() => setIsAssignModalOpen(true)}
            >
              Assign Salespeople
            </Button>

            <button
              onClick={() => setSelectedBatchIds([])}
              className="text-xs text-stone-300 hover:text-white underline px-2"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Main Table Scroll Container */}
      <div className="flex-1 overflow-x-auto overflow-y-auto relative">
        
        {/* VIEW 1: ADMIN & MANAGER GROUPED DISPATCH VIEW (One Row Per Dispatch) */}
        {!isSalesperson && (
          <table className="w-full text-left border-collapse min-w-[850px] text-xs">
            <thead className="sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#E7E3DA] text-[#1C1917]">
              <tr>
                <th className="px-4 py-3 font-bold w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-[#292524] rounded border-[#E7E3DA] focus:ring-[#292524] cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 font-bold">Dispatch No</th>
                <th className="px-4 py-3 font-bold">Assigned Staff</th>
                <th className="px-4 py-3 font-bold text-center">Items</th>
                <th className="px-4 py-3 font-bold text-right">Gross Wt (g)</th>
                <th className="px-4 py-3 font-bold text-right">AD Wt (g)</th>
                <th className="px-4 py-3 font-bold text-right">Pearl Wt (g)</th>
                <th className="px-4 py-3 font-bold text-right">Net Wt (g)</th>
                <th className="px-4 py-3 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E3DA] bg-white">
              {batches.length > 0 ? (
                batches.map((batch) => {
                  const adWeight = Math.max(0, (batch.stoneWeight || 0) - (batch.pearlWeight || 0));
                  return (
                    <tr
                      key={batch.id}
                      className={`hover:bg-[#FAF8F5] transition-colors ${
                        selectedBatchIds.includes(batch.id) ? "bg-[#F5F2EC]/60" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedBatchIds.includes(batch.id)}
                          onChange={() => toggleSelectBatch(batch.id)}
                          className="w-4 h-4 text-[#292524] rounded border-[#E7E3DA] focus:ring-[#292524] cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 font-black text-[#1C1917] text-sm tracking-tight">
                        {batch.batchNo}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {batch.assignedSalespeople?.length > 0 ? (
                            batch.assignedSalespeople.map((sp) => (
                              <Badge key={sp} variant="stone" size="sm">
                                {sp}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-stone-400 italic">Unassigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-extrabold px-2.5 py-1 rounded bg-[#F5F2EC] text-[#1C1917] border border-[#E7E3DA] inline-block">
                          {batch.itemCount} {batch.itemCount === 1 ? "Item" : "Items"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#1C1917] text-sm">
                        {batch.grossWeight.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#B8860B] text-sm">
                        {adWeight.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-sky-800 text-sm">
                        {batch.pearlWeight.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-[#1C1917] text-sm">
                        <span className="bg-[#F5F2EC] px-2.5 py-1 rounded-md border border-[#D6CEBE] inline-block">
                          {batch.netWeight.toFixed(3)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* LIST ACCESS BUTTON */}
                          <button
                            onClick={() => setListAccessBatchId(batch.id)}
                            className="px-2.5 py-1 rounded bg-[#292524] text-white text-xs font-semibold hover:bg-[#1C1917] flex items-center gap-1 transition-colors shadow-xs"
                            title="View sub-items breakdown"
                          >
                            <QueueListIcon className="w-3.5 h-3.5" />
                            <span>List Access</span>
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => {
                              setEditingItem(batch);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 rounded text-stone-600 hover:text-[#1C1917] hover:bg-[#FAF8F5]"
                            title="Edit Dispatch"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>

                          {/* Print Tag Button */}
                          <button
                            onClick={() => {
                              setSinglePrintItem({
                                itemNo: batch.batchNo,
                                name: batch.name,
                                grossWeight: batch.grossWeight,
                                stoneWeight: batch.stoneWeight,
                                pearlWeight: batch.pearlWeight,
                                netWeight: batch.netWeight,
                                assignedSalespeople: batch.assignedSalespeople,
                              });
                              setIsSinglePrintModalOpen(true);
                            }}
                            className="p-1.5 rounded text-stone-600 hover:text-[#15803D] hover:bg-[#FAF8F5]"
                            title="Print Summary Tag"
                          >
                            <PrinterIcon className="w-4 h-4" />
                          </button>

                          {/* Direct Delete Button */}
                          <button
                            onClick={() => deleteBatch(batch.id)}
                            className="p-1.5 rounded text-[#DC2626] hover:bg-[#DC2626]/10"
                            title="Delete Dispatch"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center bg-white">
                    <div className="max-w-xs mx-auto flex flex-col items-center gap-2">
                      <InboxIcon className="w-8 h-8 text-stone-400" />
                      <h3 className="text-base font-bold text-[#1C1917]">
                        No Dispatches Found
                      </h3>
                      <p className="text-xs text-[#78716C]">
                        Click + Add Item to create new dispatch entries.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* VIEW 2: SALESPERSON FULL ITEMIZED TABLE (Unchanged Individual Ornament Rows) */}
        {isSalesperson && (
          <table className="w-full text-left border-collapse min-w-[850px] text-xs">
            <thead className="sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#E7E3DA] text-[#1C1917]">
              <tr>
                <th className="px-3 py-3 font-bold text-center">Verify Wt</th>
                <th className="px-3 py-3 font-bold">#</th>
                <th className="px-4 py-3 font-bold">Item No</th>
                <th className="px-4 py-3 font-bold">Ornament Description</th>
                <th className="px-4 py-3 font-bold">Assigned Staff</th>
                <th className="px-4 py-3 font-bold text-right">Gross Wt (g)</th>
                <th className="px-4 py-3 font-bold text-right">AD Wt (g)</th>
                <th className="px-4 py-3 font-bold text-right">Pearl Wt (g)</th>
                <th className="px-4 py-3 font-bold text-right">Net Wt (g)</th>
                <th className="px-4 py-3 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E3DA] bg-white">
              {allItemizedOrnaments.length > 0 ? (
                allItemizedOrnaments.map((item, idx) => {
                  const adWeight = Math.max(0, (item.stoneWeight || 0) - (item.pearlWeight || 0));
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        item.isVerified ? "bg-[#15803D]/5" : "hover:bg-[#FAF8F5]"
                      }`}
                    >
                      {/* Verification Tick Checkbox */}
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(item.isVerified)}
                          onChange={() => toggleItemVerification(item.batchId, item.id)}
                          className="w-4 h-4 text-[#15803D] rounded border-[#E7E3DA] focus:ring-[#15803D] cursor-pointer"
                          title="Tick after verifying weight on physical scale"
                        />
                      </td>
                      <td className="px-3 py-3 font-bold text-stone-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-extrabold text-[#1C1917] text-sm">
                        {item.itemNo}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold text-[#1C1917] ${item.isVerified ? "line-through text-stone-500" : ""}`}>
                          {item.name}
                        </span>
                        {item.isVerified && (
                          <span className="ml-2 text-[10px] font-bold text-[#15803D] bg-[#15803D]/10 px-1.5 py-0.5 rounded">
                            VERIFIED
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {item.assignedSalespeople?.map((sp) => (
                            <Badge key={sp} variant="stone" size="sm">
                              {sp}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#1C1917]">
                        {item.grossWeight.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#B8860B]">
                        {adWeight.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-sky-800">
                        {item.pearlWeight.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-[#1C1917]">
                        <span className="bg-[#F5F2EC] px-2 py-0.5 rounded border border-[#D6CEBE]">
                          {item.netWeight.toFixed(3)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Edit Button for Sales Staff */}
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1 rounded text-stone-600 hover:text-[#1C1917] hover:bg-[#FAF8F5]"
                            title="Edit Ornament"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>

                          {/* Delete Button for Sales Staff */}
                          <button
                            onClick={() => {
                              setDeletingSalesItem(item);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1 rounded text-[#DC2626] hover:bg-[#DC2626]/10"
                            title="Delete Ornament (Triggers Sold or Drop choice)"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center bg-white text-stone-500">
                    No assigned ornaments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

      </div>

      {/* Fixed Bottom Totals Row */}
      <StickyTotalsRow />

      {/* Modals */}
      <AddEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItem(null);
        }}
        editItem={editingItem}
      />

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingSalesItem(null);
        }}
        item={deletingSalesItem}
      />

      <SubItemsListModal
        isOpen={Boolean(activeListAccessBatch)}
        onClose={() => setListAccessBatchId(null)}
        parentBatch={activeListAccessBatch}
      />

      <SingleItemTagModal
        isOpen={isSinglePrintModalOpen}
        onClose={() => {
          setIsSinglePrintModalOpen(false);
          setSinglePrintItem(null);
        }}
        item={singlePrintItem}
      />

      <AssignSalespersonModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        selectedItemIds={selectedBatchIds}
      />

    </div>
  );
}
