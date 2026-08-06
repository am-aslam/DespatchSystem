"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useDispatch } from "@/context/DispatchContext";
import {
  ClipboardDocumentListIcon,
  ShoppingBagIcon,
  TrashIcon,
  UsersIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  XMarkIcon,
  DocumentTextIcon,
  PrinterIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

export default function Sidebar({
  currentTab,
  setCurrentTab,
  isMobileOpen,
  onCloseMobile,
  onOpenAddModal,
  onOpenPrintModal,
}) {
  const { isAdmin, isManager, isSalesperson, logout, currentUser } = useAuth();
  const { batches = [], salesHistory = [], trash = [] } = useDispatch();

  const navItems = [
    {
      id: "dispatch",
      label: isSalesperson ? "My Dispatch" : "Dispatch List",
      icon: ClipboardDocumentListIcon,
      count: batches.length,
      roles: ["ADMIN", "MANAGER", "SALESPERSON"],
    },
    {
      id: "sales",
      label: isSalesperson ? "My Sales" : "Sales History",
      icon: ShoppingBagIcon,
      count: salesHistory.length,
      roles: ["ADMIN", "MANAGER", "SALESPERSON"],
    },
    {
      id: "trash",
      label: isSalesperson ? "My Trash" : "Trash Audit Bin",
      icon: TrashIcon,
      count: trash.length,
      roles: ["ADMIN", "MANAGER", "SALESPERSON"],
    },
    {
      id: "users",
      label: "Users Management",
      icon: UsersIcon,
      roles: ["ADMIN"],
    },
    {
      id: "logs",
      label: "Activity Audit Logs",
      icon: DocumentTextIcon,
      roles: ["ADMIN", "MANAGER"],
    },
    {
      id: "profile",
      label: "My Profile",
      icon: UserCircleIcon,
      roles: ["ADMIN", "MANAGER", "SALESPERSON"],
    },
    {
      id: "settings",
      label: "System Settings",
      icon: Cog6ToothIcon,
      roles: ["ADMIN"],
    },
  ];

  const userRole = currentUser?.role || "SALESPERSON";
  const visibleNavItems = navItems.filter((item) => item.roles.includes(userRole));

  const handleSelectTab = (id) => {
    setCurrentTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-[#1C1917]/60 backdrop-blur-xs z-40 lg:hidden no-print transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Navigation Drawer */}
      <aside
        className={`bg-white border-r border-[#E7E3DA] flex flex-col justify-between p-4 shrink-0 no-print transition-all duration-200 z-50 ${
          isMobileOpen
            ? "fixed inset-y-0 left-0 w-72 shadow-2xl overflow-y-auto"
            : "hidden lg:flex w-60 min-h-[calc(100vh-60px)]"
        }`}
      >
        <div className="space-y-4">
          
          {/* Mobile Navigation Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E3DA] lg:hidden">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#292524] text-[#B8860B] font-black text-xs flex items-center justify-center border border-[#B8860B]/30">
                AJ
              </div>
              <div>
                <div className="text-xs font-black text-[#1C1917] tracking-tight">
                  AURUM JEWELLERS
                </div>
                <div className="text-[10px] text-[#78716C] font-semibold">
                  Navigation Menu
                </div>
              </div>
            </div>
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-xl border border-[#E7E3DA] text-stone-500 hover:bg-[#FAF8F5]"
            >
              <XMarkIcon className="w-5 h-5 stroke-[2]" />
            </button>
          </div>

          {/* User Profile Card (Inside Mobile Drawer) */}
          <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#E7E3DA] space-y-1">
            <div className="text-xs font-black text-[#1C1917] truncate">
              {currentUser?.full_name || currentUser?.name}
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold text-[#78716C]">
              <span>ID: <strong className="text-[#1C1917]">{currentUser?.employee_id}</strong></span>
              <span className="bg-[#292524] text-white px-2 py-0.5 rounded text-[10px] uppercase font-extrabold">
                {currentUser?.role}
              </span>
            </div>
          </div>

          {/* MOBILE-ONLY QUICK ACTION BUTTONS (+ Add Item & Print) */}
          <div className="space-y-2 lg:hidden pt-1">
            {(isAdmin || isManager) && (
              <button
                onClick={() => {
                  if (onCloseMobile) onCloseMobile();
                  if (onOpenAddModal) onOpenAddModal();
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#292524] text-white text-xs font-bold shadow-xs hover:bg-[#1C1917] transition-all"
              >
                <PlusIcon className="w-4 h-4 text-[#B8860B] stroke-[2.5]" />
                <span>+ Add New Ornament Item</span>
              </button>
            )}

            <button
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
                if (onOpenPrintModal) onOpenPrintModal();
              }}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#1C1917] border border-[#E7E3DA] text-xs font-bold hover:bg-[#FAF8F5] transition-all"
            >
              <PrinterIcon className="w-4 h-4 text-[#78716C] stroke-[2]" />
              <span>Print Dispatch Report</span>
            </button>
          </div>

          {/* Navigation Links (Larger touch targets for senior users 40+) */}
          <nav className="space-y-1.5 pt-2">
            <div className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider px-2 py-1 hidden lg:block">
              Main Menu
            </div>

            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-[#292524] text-white shadow-xs"
                      : "text-[#1C1917] hover:bg-[#FAF8F5]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-5 h-5 stroke-[2] ${
                        isActive ? "text-[#B8860B]" : "text-[#78716C]"
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-[#F5F2EC] text-[#1C1917] border border-[#E7E3DA]"
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

        </div>

        {/* Footer Logout Button (Larger touch target) */}
        <div className="pt-4 border-t border-[#E7E3DA]">
          <button
            onClick={logout}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/5 text-[#DC2626] hover:bg-[#DC2626]/15 font-extrabold text-xs sm:text-sm transition-colors shadow-xs"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 stroke-[2]" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
