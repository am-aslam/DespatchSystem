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
} from "@heroicons/react/24/outline";

export default function Sidebar({ currentTab, setCurrentTab, isMobileOpen, onCloseMobile }) {
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
      label: "Activity Logs",
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

  // Filter items based on logged-in user role
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
          className="fixed inset-0 bg-[#1C1917]/50 z-40 lg:hidden no-print"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Navigation Drawer */}
      <aside
        className={`bg-white border-r border-[#E7E3DA] flex flex-col justify-between p-3 shrink-0 no-print transition-all duration-200 z-50 ${
          isMobileOpen
            ? "fixed inset-y-0 left-0 w-64 shadow-2xl"
            : "hidden lg:flex w-56 min-h-[calc(100vh-60px)]"
        }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between lg:hidden pb-2 mb-2 border-b border-[#E7E3DA]">
          <div className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
            Navigation Menu
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-stone-500 hover:bg-[#FAF8F5]"
          >
            <XMarkIcon className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* Links */}
        <nav className="space-y-1">
          <div className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider px-2.5 py-1.5 hidden lg:block">
            Menu ({userRole})
          </div>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium text-xs transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "bg-[#292524] text-white shadow-xs"
                    : "text-[#1C1917] hover:bg-[#FAF8F5]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 stroke-[2] ${
                      isActive ? "text-white" : "text-[#78716C]"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
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

        {/* Footer Info & Logout */}
        <div className="pt-3 border-t border-[#E7E3DA] space-y-2">
          <div className="bg-[#FAF8F5] p-2.5 rounded-lg border border-[#E7E3DA]">
            <div className="text-[10px] font-bold text-[#1C1917] uppercase tracking-wider truncate">
              {currentUser?.full_name || currentUser?.name}
            </div>
            <div className="text-[11px] font-semibold text-[#78716C] mt-0.5 flex items-center justify-between">
              <span>ID: {currentUser?.employee_id}</span>
              <span className="font-bold text-[#1C1917]">{currentUser?.role}</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#DC2626]/30 text-[#DC2626] hover:bg-[#DC2626]/10 font-semibold text-xs transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4 stroke-[2]" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
