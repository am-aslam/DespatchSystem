"use client";

import React, { useState } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DispatchProvider, useDispatch } from "@/context/DispatchContext";
import LoginForm from "@/components/auth/LoginForm";
import TopBar from "@/components/layout/TopBar";
import Sidebar from "@/components/layout/Sidebar";
import DispatchTable from "@/components/dispatch/DispatchTable";
import AddEditModal from "@/components/dispatch/AddEditModal";
import PrintableDispatchSheet from "@/components/print/PrintableDispatchSheet";
import SalesHistoryView from "@/components/sales/SalesHistoryView";
import TrashView from "@/components/trash/TrashView";
import UserManagementView from "@/components/users/UserManagementView";
import ActivityLogsView from "@/components/logs/ActivityLogsView";
import UserProfileView from "@/components/users/UserProfileView";
import SettingsView from "@/components/settings/SettingsView";
import Toast from "@/components/ui/Toast";

function AppContent() {
  const { currentUser, isInitialized, isAdmin, isManager } = useAuth();
  const { toast, closeToast } = useDispatch();

  const [currentTab, setCurrentTab] = useState("dispatch");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#292524] text-[#B8860B] flex items-center justify-center font-bold text-xl animate-pulse mx-auto border border-[#B8860B]/30">
            AJ
          </div>
          <div className="text-xs font-bold text-[#1C1917]">
            Loading Aurum Gold System...
          </div>
        </div>
      </div>
    );
  }

  // Show Login page if not authenticated
  if (!currentUser) {
    return <LoginForm />;
  }

  // Role Guard Helper
  const canAccessTab = (tab) => {
    if (tab === "dispatch" || tab === "sales" || tab === "trash" || tab === "profile") {
      return true;
    }
    if (tab === "users" || tab === "settings") {
      return isAdmin;
    }
    if (tab === "logs") {
      return isAdmin || isManager;
    }
    return false;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#1C1917]">
      
      {/* Top Bar Navigation */}
      <TopBar
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />

      {/* Main App Layout */}
      <div className="flex flex-1 min-h-0 relative">
        
        {/* Navigation Sidebar Drawer */}
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenPrintModal={() => setIsPrintModalOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto flex flex-col min-w-0">
          {!canAccessTab(currentTab) ? (
            <div className="p-8 text-center text-[#DC2626] bg-white border border-[#E7E3DA] rounded-xl font-bold text-sm">
              403 Unauthorized: Access to this page is restricted for your role ({currentUser.role}).
            </div>
          ) : (
            <>
              {currentTab === "dispatch" && (
                <DispatchTable onOpenAddModal={() => setIsAddModalOpen(true)} />
              )}

              {currentTab === "sales" && (
                <SalesHistoryView onOpenPrintModal={() => setIsPrintModalOpen(true)} />
              )}

              {currentTab === "trash" && <TrashView />}

              {currentTab === "users" && <UserManagementView />}

              {currentTab === "logs" && <ActivityLogsView />}

              {currentTab === "profile" && <UserProfileView />}

              {currentTab === "settings" && <SettingsView />}
            </>
          )}
        </main>

      </div>

      {/* Global Modals */}
      <AddEditModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        editItem={null}
      />

      <PrintableDispatchSheet
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />

      {/* Global Toast */}
      <Toast toast={toast} onClose={closeToast} />

    </div>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <DispatchProvider>
        <AppContent />
      </DispatchProvider>
    </AuthProvider>
  );
}
