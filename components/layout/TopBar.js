"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useDispatch } from "@/context/DispatchContext";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  MagnifyingGlassIcon,
  PrinterIcon,
  PlusIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export default function TopBar({ onOpenAddModal, onOpenPrintModal, onToggleMobileSidebar, isMobileSidebarOpen }) {
  const { currentUser, logout, isAdmin, isManager } = useAuth();
  const {
    searchQuery,
    setSearchQuery,
    assignedFilter,
    setAssignedFilter,
    dateFilter,
    setDateFilter,
  } = useDispatch();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E7E3DA] px-3 sm:px-6 py-2.5 no-print shadow-xs">
      <div className="flex flex-col gap-3">
        
        {/* Top Header Row: Mobile Menu + Brand Logo + User Info + Quick Actions */}
        <div className="flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-2.5">
            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 rounded-lg border border-[#E7E3DA] text-[#1C1917] hover:bg-[#FAF8F5] transition-colors"
              aria-label="Toggle navigation menu"
            >
              {isMobileSidebarOpen ? (
                <XMarkIcon className="w-5 h-5 stroke-[2]" />
              ) : (
                <Bars3Icon className="w-5 h-5 stroke-[2]" />
              )}
            </button>

            {/* Brand Logo */}
            <div className="w-8 h-8 rounded-lg bg-[#292524] text-white flex items-center justify-center font-bold text-sm tracking-wider shrink-0">
              AJ
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-[#1C1917] tracking-tight flex items-center gap-1.5 leading-none">
                <span>AURUM</span>
                <span className="hidden sm:inline">JEWELLERS</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#F5F2EC] text-[#44403C] border border-[#E7E3DA]">
                  DISPATCH
                </span>
              </h1>
              <p className="text-[11px] text-[#78716C] mt-0.5 hidden sm:block">
                Gold Sales Dispatch Management
              </p>
            </div>
          </div>

          {/* Authenticated User Badge & Action Buttons */}
          <div className="flex items-center gap-2">
            
            {/* User Profile Info Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E7E3DA] bg-[#FAF8F5]">
              <UserCircleIcon className="w-4 h-4 text-[#44403C]" />
              <div className="text-xs font-bold text-[#1C1917] flex items-center gap-1.5">
                <span className="truncate max-w-[90px] sm:max-w-[140px]">
                  {currentUser?.full_name || currentUser?.name}
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#292524] text-white">
                  {currentUser?.employee_id}
                </span>
                <Badge variant="stone" size="sm" className="hidden md:inline-flex">
                  {currentUser?.role}
                </Badge>
              </div>
            </div>

            {/* Print Button */}
            <Button
              variant="outline"
              size="sm"
              icon={PrinterIcon}
              onClick={onOpenPrintModal}
              className="hidden sm:inline-flex"
            >
              Print
            </Button>

            {/* Add Item Button (Admin/Manager) */}
            {(isAdmin || isManager) && (
              <Button
                variant="primary"
                size="sm"
                icon={PlusIcon}
                onClick={onOpenAddModal}
              >
                + Add
              </Button>
            )}

            {/* Logout Button */}
            <button
              onClick={logout}
              className="p-1.5 rounded-lg border border-[#E7E3DA] text-[#DC2626] hover:bg-[#DC2626]/10 transition-colors"
              title="Logout"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4 stroke-[2]" />
            </button>

          </div>

        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-[#FAF8F5]">
          
          {/* Search Input */}
          <div className="relative w-full sm:col-span-1">
            <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search Item No, Description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FAF8F5] text-[#1C1917] text-xs pl-8 pr-3 py-1.5 rounded-lg border border-[#E7E3DA] focus:outline-none focus:border-[#292524] focus:bg-white min-h-[34px] transition-all"
            />
          </div>

          {/* Salesperson Filter (Admin / Manager only) */}
          {(isAdmin || isManager) && (
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="w-full bg-white text-[#1C1917] text-xs font-medium px-2.5 py-1.5 rounded-lg border border-[#E7E3DA] focus:outline-none focus:border-[#292524] min-h-[34px] cursor-pointer"
            >
              <option value="ALL">All Salespeople</option>
              <option value="SIJI CMS">SIJI CMS (SL001)</option>
              <option value="MHD SHAMIL">MHD SHAMIL (SL002)</option>
              <option value="SHAMIL VK">SHAMIL VK (SL003)</option>
              <option value="BABU">BABU (SL004)</option>
              <option value="SHAMEER">SHAMEER (SL005)</option>
            </select>
          )}

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full bg-white text-[#1C1917] text-xs font-medium px-2.5 py-1.5 rounded-lg border border-[#E7E3DA] focus:outline-none focus:border-[#292524] min-h-[34px] cursor-pointer"
          >
            <option value="ALL">All Dates</option>
            <option value="TODAY">Today Only</option>
            <option value="WEEK">Last 7 Days</option>
            <option value="MONTH">Last 30 Days</option>
          </select>

        </div>

      </div>
    </header>
  );
}
