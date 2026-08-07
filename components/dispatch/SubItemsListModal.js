"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import { useDispatch } from "@/context/DispatchContext";
import { useAuth } from "@/context/AuthContext";
import {
  PencilSquareIcon,
  TrashIcon,
  ListBulletIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";

export default function SubItemsListModal({
  isOpen,
  onClose,
  parentBatch,
}) {
  const { deleteSubItem, updateSubItem, toggleItemVerification, calculateNetWeight, fetchBatchItems } =
    useDispatch();
  const { isAdmin, isManager } = useAuth();

  const [subItems, setSubItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sub-item editing state
  const [editingSubItem, setEditingSubItem] = useState(null);
  const [editItemNo, setEditItemNo] = useState("");
  const [editName, setEditName] = useState("");
  const [editGross, setEditGross] = useState("");
  const [editStone, setEditStone] = useState("0");
  const [editPearl, setEditPearl] = useState("0");

  useEffect(() => {
    if (isOpen && parentBatch?.batchNo) {
      const timeout = setTimeout(() => {
        setIsLoading(true);
        fetchBatchItems(parentBatch.batchNo)
          .then((items) => setSubItems(items))
          .finally(() => setIsLoading(false));
      }, 0);

      return () => clearTimeout(timeout);
    }
  }, [isOpen, parentBatch, fetchBatchItems]);

  if (!parentBatch) return null;

  const handleStartEdit = (item) => {
    setEditingSubItem(item);
    setEditItemNo(item.itemNo);
    setEditName(item.name);
    setEditGross(item.grossWeight.toString());
    setEditStone(item.stoneWeight.toString());
    setEditPearl(item.pearlWeight.toString());
  };

  const handleSaveSubItem = (e) => {
    e.preventDefault();
    if (!editingSubItem) return;

    updateSubItem(parentBatch.id, editingSubItem.id, {
      itemNo: editItemNo,
      name: editName,
      grossWeight: editGross,
      stoneWeight: editStone,
      pearlWeight: editPearl,
    });
    setEditingSubItem(null);
  };

  const computedNet = calculateNetWeight(editGross, editStone);

  // Calculate totals for this breakdown
  const subTotals = subItems.reduce(
    (acc, item) => {
      const g = item.grossWeight || 0;
      const s = item.stoneWeight || 0;
      const p = item.pearlWeight || 0;
      const n = item.netWeight || 0;
      acc.gross += g;
      acc.stone += s;
      acc.pearl += p;
      acc.ad += Math.max(0, s - p);
      acc.net += n;
      return acc;
    },
    { gross: 0, stone: 0, pearl: 0, ad: 0, net: 0 }
  );

  // Dedicated Window Print Handler for List Access Breakdown Table
  const handlePrintBatchList = () => {
    const printWindow = window.open("", "_blank", "width=900,height=700");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dispatch Breakdown — ${parentBatch.batchNo}</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1C1917; }
            h1 { font-size: 20px; font-weight: 900; margin: 0 0 4px 0; }
            .header-flex { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1C1917; padding-bottom: 10px; margin-bottom: 16px; }
            .meta { font-size: 12px; color: #44403C; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
            th, td { border: 1px solid #1C1917; padding: 8px 10px; text-align: left; }
            th { background-color: #FAF8F5; font-weight: bold; color: #1C1917; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            tfoot { background-color: #1C1917; color: #FFFFFF; font-weight: 800; }
            tfoot td { border-color: #1C1917; }
            @page { size: A4; margin: 10mm; }
          </style>
        </head>
        <body>
          <div class="header-flex">
            <div>
              <h1>AURUM JEWELLERS — DISPATCH BREAKDOWN SHEET</h1>
              <div class="meta">
                Dispatch Lot: <strong>${parentBatch.batchNo}</strong> &nbsp;|&nbsp; Total Items: <strong>${subItems.length}</strong><br/>
                Assigned Staff: <strong>${parentBatch.assignedStaffNames || parentBatch.assignedSalespeople?.join(", ")}</strong>
              </div>
            </div>
            <div class="meta" style="text-align: right;">
              Printed Date: <strong>${new Date().toLocaleDateString("en-IN")}</strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="text-center">#</th>
                <th>Item No</th>
                <th>Assigned Staff</th>
                <th class="text-right">Gross Wt (g)</th>
                <th class="text-right">Total Stone (g)</th>
                <th class="text-right">AD Wt (g)</th>
                <th class="text-right">Pearl Wt (g)</th>
                <th class="text-right">Net Wt (g)</th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${subItems
                .map((item, idx) => {
                  const adWeight = Math.max(0, (item.stoneWeight || 0) - (item.pearlWeight || 0));
                  return `
                    <tr>
                      <td class="text-center font-bold">${idx + 1}</td>
                      <td><strong>${item.itemNo}</strong></td>
                      <td>${item.assignedSalespeople?.join(", ") || parentBatch.assignedStaffNames}</td>
                      <td class="text-right">${item.grossWeight.toFixed(3)}</td>
                      <td class="text-right">${item.stoneWeight.toFixed(3)}</td>
                      <td class="text-right">${adWeight.toFixed(3)}</td>
                      <td class="text-right">${item.pearlWeight.toFixed(3)}</td>
                      <td class="text-right"><strong>${item.netWeight.toFixed(3)}</strong></td>
                      <td class="text-center">${item.isVerified ? "VERIFIED" : "ACTIVE"}</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="text-right" style="text-transform: uppercase;">Total Dispatch Summary:</td>
                <td class="text-right">${subTotals.gross.toFixed(3)}g</td>
                <td class="text-right">${subTotals.stone.toFixed(3)}g</td>
                <td class="text-right">${subTotals.ad.toFixed(3)}g</td>
                <td class="text-right">${subTotals.pearl.toFixed(3)}g</td>
                <td class="text-right" style="font-size: 13px;">${subTotals.net.toFixed(3)}g</td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between w-full pr-6">
          <div className="flex items-center gap-2">
            <ListBulletIcon className="w-5 h-5 text-[#292524]" />
            <span>
              Dispatch Breakdown — {parentBatch.batchNo} ({subItems.length} Items)
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={PrinterIcon}
            onClick={handlePrintBatchList}
          >
            Print Breakdown
          </Button>
        </div>
      }
      subtitle="Detailed ornament-level breakdown table fetched directly from backend API for Admin and Manager inspection."
      maxWidth="max-w-5xl"
    >
      <div className="space-y-4">
        
        {/* Scrollable Container with Horizontal & Vertical Scroll for Full Column Visibility */}
        <div className="border border-[#E7E3DA] rounded-xl overflow-x-auto overflow-y-auto bg-white max-h-[420px] max-w-full">
          <table className="w-full min-w-[950px] text-left border-collapse text-xs">
            <thead className="bg-[#FAF8F5] border-b border-[#E7E3DA] text-[#1C1917] sticky top-0 z-10">
              <tr>
                <th className="p-3 font-bold text-center w-12">Verify</th>
                <th className="p-3 font-bold w-10">#</th>
                <th className="p-3 font-bold w-32">Item No</th>
                <th className="p-3 font-bold w-44">Assigned Staff</th>
                <th className="p-3 font-bold text-right w-24">Gross Wt</th>
                <th className="p-3 font-bold text-right w-24">Total Stone</th>
                <th className="p-3 font-bold text-right w-24">AD Wt</th>
                <th className="p-3 font-bold text-right w-24">Pearl Wt</th>
                <th className="p-3 font-bold text-right w-28">Net Wt</th>
                <th className="p-3 font-bold text-center w-24">Status</th>
                <th className="p-3 font-bold text-center w-24 bg-[#FAF8F5] sticky right-0 shadow-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E3DA]">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-stone-500 font-bold">
                    Loading ornament breakdown from server...
                  </td>
                </tr>
              ) : subItems.length > 0 ? (
                subItems.map((item, idx) => {
                  const adWeight = Math.max(0, (item.stoneWeight || 0) - (item.pearlWeight || 0));
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        item.isVerified ? "bg-[#15803D]/5" : "hover:bg-[#FAF8F5]"
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(item.isVerified)}
                          onChange={() => toggleItemVerification(parentBatch.id, item.id)}
                          className="w-4 h-4 text-[#15803D] rounded border-[#E7E3DA] focus:ring-[#15803D] cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-bold text-stone-500">{idx + 1}</td>
                      <td className="p-3 font-extrabold text-[#1C1917]">
                        {item.itemNo}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {item.assignedSalespeople?.length > 0 ? (
                            item.assignedSalespeople.map((sp) => (
                              <Badge key={sp} variant="stone" size="sm">
                                {sp}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-stone-400">{parentBatch.assignedStaffNames}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right font-bold text-[#1C1917]">
                        {item.grossWeight.toFixed(3)}g
                      </td>
                      <td className="p-3 text-right font-medium text-amber-800">
                        {item.stoneWeight.toFixed(3)}g
                      </td>
                      <td className="p-3 text-right font-semibold text-[#B8860B]">
                        {adWeight.toFixed(3)}g
                      </td>
                      <td className="p-3 text-right font-medium text-sky-800">
                        {item.pearlWeight.toFixed(3)}g
                      </td>
                      <td className="p-3 text-right font-extrabold text-[#1C1917] bg-[#F5F2EC]">
                        {item.netWeight.toFixed(3)}g
                      </td>
                      <td className="p-3 text-center">
                        {item.isVerified ? (
                          <span className="text-[10px] font-bold text-[#15803D] bg-[#15803D]/10 px-2 py-0.5 rounded">
                            VERIFIED
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-[#78716C] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E7E3DA]">
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center sticky right-0 bg-white hover:bg-[#FAF8F5] shadow-xs">
                        <div className="flex items-center justify-center gap-1.5">
                          {(isAdmin || isManager) && (
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="p-1.5 rounded-lg text-stone-700 hover:text-[#1C1917] hover:bg-[#FAF8F5] border border-transparent hover:border-[#E7E3DA] transition-all"
                              title="Edit Ornament"
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                          )}
                          {(isAdmin || isManager) && (
                            <button
                              onClick={() => deleteSubItem(parentBatch.id, item.id)}
                              className="p-1.5 rounded-lg text-[#DC2626] hover:bg-[#DC2626]/10 border border-transparent transition-all"
                              title="Delete Ornament"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="p-6 text-center text-stone-500">
                    No ornaments in this dispatch.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Edit Sub-Item Drawer */}
        {editingSubItem && (
          <form onSubmit={handleSaveSubItem} className="p-4 bg-[#FAF8F5] border border-[#E7E3DA] rounded-xl space-y-3">
            <div className="text-xs font-bold text-[#1C1917] uppercase">
              Editing Ornament {editingSubItem.itemNo}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Item No"
                value={editItemNo}
                onChange={(e) => setEditItemNo(e.target.value)}
                required
              />
              <Input
                label="Ornament Description"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Gross Wt"
                type="number"
                step="0.001"
                value={editGross}
                onChange={(e) => setEditGross(e.target.value)}
                required
              />
              <Input
                label="Total Stone Wt"
                type="number"
                step="0.001"
                value={editStone}
                onChange={(e) => setEditStone(e.target.value)}
              />
              <Input
                label="Pearl Wt"
                type="number"
                step="0.001"
                value={editPearl}
                onChange={(e) => setEditPearl(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="font-bold">Calculated Net Wt: {computedNet.toFixed(3)}g</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingSubItem(null)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Ornament
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Modal Actions */}
        <div className="flex justify-between items-center pt-2">
          <Button
            variant="outline"
            size="sm"
            icon={PrinterIcon}
            onClick={handlePrintBatchList}
          >
            Print Breakdown
          </Button>

          <Button variant="outline" size="sm" onClick={onClose}>
            Close Breakdown
          </Button>
        </div>

      </div>
    </Modal>
  );
}
