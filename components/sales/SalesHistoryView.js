"use client";

import React, { useState, useMemo } from "react";
import { useDispatch } from "@/context/DispatchContext";
import { useAuth, SALESPERSONS } from "@/context/AuthContext";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import {
  ShoppingBagIcon,
  PrinterIcon,
  PencilSquareIcon,
  TrashIcon,
  UserGroupIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";

export default function SalesHistoryView({ onOpenPrintModal }) {
  const { salesHistory, updateSaleItem, deleteSaleItem, calculateNetWeight } =
    useDispatch();
  const { isAdmin, isManager } = useAuth();

  // Edit Sale Modal state
  const [editingSale, setEditingSale] = useState(null);
  const [editItemNo, setEditItemNo] = useState("");
  const [editName, setEditName] = useState("");
  const [editGross, setEditGross] = useState("");
  const [editStone, setEditStone] = useState("0");
  const [editPearl, setEditPearl] = useState("0");
  const [editSoldBy, setEditSoldBy] = useState("");

  // Full weight sums across all sales history
  const salesTotals = useMemo(() => {
    return salesHistory.reduce(
      (acc, s) => {
        acc.grossWeight += s.grossWeight || 0;
        acc.stoneWeight += s.stoneWeight || 0;
        acc.pearlWeight += s.pearlWeight || 0;
        acc.netWeight += s.netWeight || 0;
        return acc;
      },
      { grossWeight: 0, stoneWeight: 0, pearlWeight: 0, netWeight: 0 }
    );
  }, [salesHistory]);

  // Aggregated Sales Summary by Sales Staff Name (for Admin & Manager Console)
  const salesByStaff = useMemo(() => {
    const map = {};

    // Initialize all salespersons
    SALESPERSONS.forEach((sp) => {
      map[sp] = {
        staffName: sp,
        itemCount: 0,
        grossSum: 0,
        stoneSum: 0,
        pearlSum: 0,
        netSum: 0,
      };
    });

    salesHistory.forEach((sale) => {
      const staffName = sale.soldBy || "Unassigned";
      if (!map[staffName]) {
        map[staffName] = {
          staffName: staffName,
          itemCount: 0,
          grossSum: 0,
          stoneSum: 0,
          pearlSum: 0,
          netSum: 0,
        };
      }
      map[staffName].itemCount += 1;
      map[staffName].grossSum += sale.grossWeight || 0;
      map[staffName].stoneSum += sale.stoneWeight || 0;
      map[staffName].pearlSum += sale.pearlWeight || 0;
      map[staffName].netSum += sale.netWeight || 0;
    });

    return Object.values(map);
  }, [salesHistory]);

  const openEditModal = (sale) => {
    setEditingSale(sale);
    setEditItemNo(sale.itemNo);
    setEditName(sale.name);
    setEditGross(sale.grossWeight.toString());
    setEditStone(sale.stoneWeight.toString());
    setEditPearl(sale.pearlWeight.toString());
    setEditSoldBy(sale.soldBy || "Sales Executive");
  };

  const handleSaveSale = (e) => {
    e.preventDefault();
    if (!editingSale) return;

    updateSaleItem(editingSale.id, {
      itemNo: editItemNo,
      name: editName,
      grossWeight: editGross,
      stoneWeight: editStone,
      pearlWeight: editPearl,
      soldBy: editSoldBy,
    });
    setEditingSale(null);
  };

  const computedNet = calculateNetWeight(editGross, editStone);

  return (
    <div className="space-y-4">
      
      {/* Top Header Card */}
      <div className="bg-white p-4 rounded-xl border border-[#E7E3DA] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#1C1917] tracking-tight flex items-center gap-2">
            <ShoppingBagIcon className="w-5 h-5 text-[#15803D]" />
            Sales History & Revenue Console
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            Full weight sums (Gross, Stone, Pearl, Net Wt) and salesperson sales performance.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={PrinterIcon}
          onClick={onOpenPrintModal}
        >
          Print Sales Report
        </Button>
      </div>

      {/* FULL WEIGHT SUMS SUMMARY CARDS (Gross Sum, Stone Sum, Pearl Sum, Net Sum) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-[#E7E3DA] shadow-xs">
          <div className="text-[10px] font-bold text-[#78716C] uppercase">
            Total Gross Wt Sum
          </div>
          <div className="text-xl font-extrabold text-[#1C1917] tracking-tight mt-0.5">
            {salesTotals.grossWeight.toFixed(3)}{" "}
            <span className="text-xs font-normal text-stone-500">g</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-[#E7E3DA] shadow-xs">
          <div className="text-[10px] font-bold text-amber-700 uppercase">
            Total Stone Wt Sum
          </div>
          <div className="text-xl font-extrabold text-amber-800 tracking-tight mt-0.5">
            {salesTotals.stoneWeight.toFixed(3)}{" "}
            <span className="text-xs font-normal text-stone-500">g</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-[#E7E3DA] shadow-xs">
          <div className="text-[10px] font-bold text-sky-700 uppercase">
            Total Pearl Wt Sum
          </div>
          <div className="text-xl font-extrabold text-sky-800 tracking-tight mt-0.5">
            {salesTotals.pearlWeight.toFixed(3)}{" "}
            <span className="text-xs font-normal text-stone-500">g</span>
          </div>
        </div>

        <div className="bg-[#15803D]/10 p-3 rounded-xl border border-[#15803D]/30 shadow-xs">
          <div className="text-[10px] font-bold text-[#15803D] uppercase">
            Total Net Wt Sum
          </div>
          <div className="text-xl font-black text-[#15803D] tracking-tight mt-0.5">
            {salesTotals.netWeight.toFixed(3)}{" "}
            <span className="text-xs font-bold text-[#1C1917]">g</span>
          </div>
        </div>
      </div>

      {/* ADMIN & MANAGER SALESPERSON PERFORMANCE CONSOLE (Staff Name & Sum of Weights) */}
      {(isAdmin || isManager) && (
        <div className="bg-white border border-[#E7E3DA] rounded-xl p-4 shadow-xs space-y-3">
          <div className="text-xs font-bold text-[#1C1917] uppercase tracking-wider flex items-center gap-2">
            <UserGroupIcon className="w-4 h-4 text-[#292524]" />
            <span>Sales Staff Weight Breakdown Summary</span>
          </div>

          <div className="border border-[#E7E3DA] rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#FAF8F5] border-b border-[#E7E3DA] text-[#1C1917]">
                <tr>
                  <th className="p-2.5 font-bold">Sales Staff Name</th>
                  <th className="p-2.5 font-bold text-center">Items Sold</th>
                  <th className="p-2.5 font-bold text-right">Sum Gross Wt</th>
                  <th className="p-2.5 font-bold text-right">Sum Stone Wt</th>
                  <th className="p-2.5 font-bold text-right">Sum Pearl Wt</th>
                  <th className="p-2.5 font-bold text-right">Sum Net Wt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E3DA]">
                {salesByStaff.map((staff) => (
                  <tr key={staff.staffName} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="p-2.5 font-extrabold text-[#1C1917]">
                      {staff.staffName}
                    </td>
                    <td className="p-2.5 text-center">
                      <span className="font-bold px-2 py-0.5 rounded bg-[#F5F2EC] text-[#1C1917]">
                        {staff.itemCount} Items
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-bold text-[#1C1917]">
                      {staff.grossSum.toFixed(3)}g
                    </td>
                    <td className="p-2.5 text-right font-medium text-amber-800">
                      {staff.stoneSum.toFixed(3)}g
                    </td>
                    <td className="p-2.5 text-right font-medium text-sky-800">
                      {staff.pearlSum.toFixed(3)}g
                    </td>
                    <td className="p-2.5 text-right font-black text-[#15803D]">
                      {staff.netSum.toFixed(3)}g
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Itemized Sales Table */}
      <div className="bg-white border border-[#E7E3DA] rounded-xl shadow-xs overflow-hidden">
        <div className="p-3 bg-[#FAF8F5] border-b border-[#E7E3DA] font-bold text-xs text-[#1C1917]">
          Itemized Sold Ornaments Log
        </div>
        <table className="w-full text-left border-collapse min-w-[750px] text-xs">
          <thead className="bg-[#FAF8F5] border-b border-[#E7E3DA] text-[#1C1917]">
            <tr>
              <th className="px-4 py-3 font-bold">#</th>
              <th className="px-4 py-3 font-bold">Item No</th>
              <th className="px-4 py-3 font-bold">Ornament Name</th>
              <th className="px-4 py-3 font-bold text-right">Gross Wt</th>
              <th className="px-4 py-3 font-bold text-right">Stone Wt</th>
              <th className="px-4 py-3 font-bold text-right">Pearl Wt</th>
              <th className="px-4 py-3 font-bold text-right">Net Weight</th>
              <th className="px-4 py-3 font-bold">Sold By</th>
              <th className="px-4 py-3 font-bold">Sold Date</th>
              <th className="px-4 py-3 font-bold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E3DA] bg-white">
            {salesHistory.length > 0 ? (
              salesHistory.map((item, idx) => (
                <tr key={item.id} className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="px-4 py-3 font-bold text-stone-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-extrabold text-[#1C1917] text-sm">
                    {item.itemNo}
                  </td>
                  <td className="px-4 py-3 font-bold text-[#1C1917]">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 font-bold text-[#1C1917] text-right">
                    {item.grossWeight.toFixed(3)}g
                  </td>
                  <td className="px-4 py-3 font-medium text-amber-800 text-right">
                    {item.stoneWeight.toFixed(3)}g
                  </td>
                  <td className="px-4 py-3 font-medium text-sky-800 text-right">
                    {item.pearlWeight.toFixed(3)}g
                  </td>
                  <td className="px-4 py-3 text-right font-black text-[#15803D]">
                    <span className="bg-[#15803D]/10 px-2 py-0.5 rounded border border-[#15803D]/20">
                      {item.netWeight.toFixed(3)}g
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#1C1917]">
                    <Badge variant="success" size="sm">
                      {item.soldBy}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[11px] font-medium text-[#78716C]">
                    {new Date(item.soldDate).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1 rounded text-stone-600 hover:text-[#1C1917] hover:bg-[#FAF8F5]"
                        title="Edit Sales Item"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => deleteSaleItem(item.id)}
                        className="p-1 rounded text-[#DC2626] hover:bg-[#DC2626]/10"
                        title="Delete Sale Item"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-6 py-10 text-center text-[#78716C]">
                  No sales recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Sale Item Modal */}
      {editingSale && (
        <Modal
          isOpen={Boolean(editingSale)}
          onClose={() => setEditingSale(null)}
          title={`Edit Sales Record — ${editingSale.itemNo}`}
          subtitle="Modify sold ornament metrics below."
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveSale} className="space-y-3">
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
            <div className="grid grid-cols-3 gap-2">
              <Input
                label="Gross Wt"
                type="number"
                step="0.001"
                value={editGross}
                onChange={(e) => setEditGross(e.target.value)}
                required
              />
              <Input
                label="Stone Wt"
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

            <div className="p-2.5 rounded bg-[#F5F2EC] border border-[#D6CEBE] flex items-center justify-between text-xs">
              <span className="font-bold text-[#44403C]">Net Weight</span>
              <span className="font-black text-[#1C1917] text-sm">
                {computedNet.toFixed(3)}g
              </span>
            </div>

            <Input
              label="Sold By"
              value={editSoldBy}
              onChange={(e) => setEditSoldBy(e.target.value)}
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E3DA]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingSale(null)}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}
