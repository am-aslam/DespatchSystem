"use client";

import React from "react";
import { useDispatch } from "@/context/DispatchContext";

export default function StickyTotalsRow() {
  const { totals, items } = useDispatch();

  return (
    <div className="sticky bottom-0 z-20 bg-white text-[#1C1917] border-t-2 border-[#E7E3DA] shadow-md px-4 py-2.5 no-print">
      <div className="flex flex-wrap items-center justify-between gap-3">
        
        {/* Total Summary Header */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-6 bg-[#292524] rounded-full" />
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-[#78716C]">
              Totals ({items.length} Items)
            </div>
            <div className="text-sm font-extrabold text-[#1C1917] tracking-tight">
              GRAND TOTALS
            </div>
          </div>
        </div>

        {/* Weights Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 max-w-3xl justify-items-end">
          
          {/* Gross Weight */}
          <div className="bg-[#FAF8F5] px-3 py-1.5 rounded-lg border border-[#E7E3DA] w-full text-right">
            <div className="text-[10px] font-bold text-[#78716C] uppercase">
              Gross Wt
            </div>
            <div className="text-base font-extrabold text-[#1C1917] tracking-tight">
              {totals.grossWeight.toFixed(3)}{" "}
              <span className="text-xs font-normal text-stone-500">g</span>
            </div>
          </div>

          {/* Stone Weight */}
          <div className="bg-[#FAF8F5] px-3 py-1.5 rounded-lg border border-[#E7E3DA] w-full text-right">
            <div className="text-[10px] font-bold text-amber-700 uppercase">
              Stone Wt
            </div>
            <div className="text-base font-extrabold text-amber-800 tracking-tight">
              {totals.stoneWeight.toFixed(3)}{" "}
              <span className="text-xs font-normal text-stone-500">g</span>
            </div>
          </div>

          {/* Pearl Weight */}
          <div className="bg-[#FAF8F5] px-3 py-1.5 rounded-lg border border-[#E7E3DA] w-full text-right">
            <div className="text-[10px] font-bold text-sky-700 uppercase">
              Pearl Wt
            </div>
            <div className="text-base font-extrabold text-sky-800 tracking-tight">
              {totals.pearlWeight.toFixed(3)}{" "}
              <span className="text-xs font-normal text-stone-500">g</span>
            </div>
          </div>

          {/* Net Weight */}
          <div className="bg-[#F5F2EC] px-3 py-1.5 rounded-lg border border-[#D6CEBE] w-full text-right">
            <div className="text-[10px] font-bold text-[#44403C] uppercase">
              Total Net Wt
            </div>
            <div className="text-base font-black text-[#1C1917] tracking-tight">
              {totals.netWeight.toFixed(3)}{" "}
              <span className="text-xs font-bold text-[#44403C]">g</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
