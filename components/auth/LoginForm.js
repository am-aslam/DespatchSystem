"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import CreatePasswordModal from "./CreatePasswordModal";
import { LockClosedIcon, UserIcon } from "@heroicons/react/24/outline";

export default function LoginForm() {
  const { login, setupAccount, setSetupAccount } = useAuth();

  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId.trim()) {
      setErrorMsg("Please enter your Employee ID.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    const result = await login(employeeId.trim(), password);
    setIsLoading(false);

    if (!result.success) {
      if (result.requiresSetup) {
        // Will trigger CreatePasswordModal via setupAccount state
        return;
      }
      setErrorMsg(result.error || "Invalid Employee ID or Password.");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
      
      {/* Login Card */}
      <div className="w-full max-w-md bg-white border border-[#E7E3DA] rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
        
        {/* Header Logo & Title */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#292524] text-white flex items-center justify-center font-bold text-xl tracking-wider mx-auto shadow-xs">
            AJ
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight">
              AURUM JEWELLERS
            </h1>
            <p className="text-xs text-[#78716C] mt-0.5">
              Sales Dispatch Management System
            </p>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#1C1917] block mb-1.5">
              Employee ID *
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="e.g. SL001 / AD001"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                className="w-full bg-[#FAF8F5] text-[#1C1917] text-sm font-semibold pl-9 pr-3 py-2.5 rounded-xl border border-[#E7E3DA] focus:outline-none focus:border-[#292524] focus:bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#1C1917] block mb-1.5">
              Password *
            </label>
            <div className="relative">
              <LockClosedIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#FAF8F5] text-[#1C1917] text-sm font-semibold pl-9 pr-3 py-2.5 rounded-xl border border-[#E7E3DA] focus:outline-none focus:border-[#292524] focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-[#44403C] font-medium">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-[#292524] rounded border-[#E7E3DA] focus:ring-[#292524]"
              />
              <span>Remember Me</span>
            </label>

            <button
              type="button"
              onClick={() => setIsForgotPasswordOpen(true)}
              className="text-[#292524] font-bold underline hover:text-[#1C1917]"
            >
              Forgot Password?
            </button>
          </div>

          <Button
            variant="primary"
            size="md"
            type="submit"
            disabled={isLoading}
            className="w-full font-bold py-3 text-sm mt-2"
          >
            {isLoading ? "Authenticating..." : "Sign In"}
          </Button>
        </form>

        <div className="pt-4 border-t border-[#E7E3DA] text-center text-[11px] text-[#78716C]">
          Protected System — Unauthorized Access Prohibited
        </div>

      </div>

      {/* First-Time Password Creation Modal */}
      {setupAccount && (
        <CreatePasswordModal
          isOpen={Boolean(setupAccount)}
          onClose={() => setSetupAccount(null)}
          account={setupAccount}
        />
      )}

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        title="Forgot Password?"
        subtitle="Password recovery policy"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs text-[#1C1917] py-2">
          <div className="p-4 bg-[#F5F2EC] border border-[#D6CEBE] rounded-xl text-center space-y-2">
            <LockClosedIcon className="w-8 h-8 text-[#292524] mx-auto" />
            <div className="font-extrabold text-sm text-[#1C1917]">
              Please contact your administrator to reset your password.
            </div>
            <p className="text-[#78716C] text-xs">
              For security compliance, employee password resets must be initiated by an Admin from the User Management console.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsForgotPasswordOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
