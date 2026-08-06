"use client";

import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useDispatch } from "@/context/DispatchContext";
import { Cog6ToothIcon, BuildingStorefrontIcon, ScaleIcon } from "@heroicons/react/24/outline";

export default function SettingsView() {
  const { showToast } = useDispatch();

  const [companyName, setCompanyName] = useState("AURUM JEWELLERS PVT LTD");
  const [address, setAddress] = useState("Gold Bazaar Road, Zaveri Market, Mumbai");
  const [gstin, setGstin] = useState("27AAAAA0000A1Z5");
  const [decimals, setDecimals] = useState("3");

  const handleSave = (e) => {
    e.preventDefault();
    showToast("System settings updated successfully!", "success");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7E2D9] shadow-sm">
        <h2 className="text-2xl font-bold text-[#1C1917] tracking-tight flex items-center gap-3">
          <Cog6ToothIcon className="w-7 h-7 text-[#B8860B]" />
          System Settings & Store Preferences
        </h2>
        <p className="text-base text-[#78716C] mt-1">
          Manage company dispatch voucher branding, weight precision formats, and system defaults.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Store Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E2D9] space-y-4 shadow-sm">
          <h3 className="text-lg font-bold text-[#1C1917] flex items-center gap-2">
            <BuildingStorefrontIcon className="w-5 h-5 text-[#B8860B]" />
            Company & Print Voucher Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company Legal Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <Input
              label="GSTIN / Tax ID"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
            />
          </div>

          <Input
            label="Showroom Address (Appears on Print Sheets)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        {/* Weight Precision Settings */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E2D9] space-y-4 shadow-sm">
          <h3 className="text-lg font-bold text-[#1C1917] flex items-center gap-2">
            <ScaleIcon className="w-5 h-5 text-[#B8860B]" />
            Weight Calculation Standards
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Weight Decimal Precision"
              value={decimals}
              onChange={(e) => setDecimals(e.target.value)}
            >
              <option value="3">3 Decimal Places (0.001 g - Gold Standard)</option>
              <option value="2">2 Decimal Places (0.01 g)</option>
            </Select>

            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E7E2D9] flex flex-col justify-center">
              <div className="text-xs font-bold text-[#78716C] uppercase">
                Net Weight Formula
              </div>
              <div className="text-base font-bold text-[#1C1917] mt-1">
                Net Weight = Gross Weight - Stone Weight
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="primary" size="md" type="submit">
            Save System Settings
          </Button>
        </div>

      </form>

    </div>
  );
}
