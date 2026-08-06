"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { KeyIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

export default function CreatePasswordModal({ isOpen, onClose, account }) {
  const { handleSetupPassword } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!account) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    const res = await handleSetupPassword(account.employee_id, newPassword, confirmPassword);
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg("Password created successfully! Please sign in with your new password.");
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setErrorMsg(res.error || "Failed to create password.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-[#1C1917]">
          <KeyIcon className="w-5 h-5 text-[#292524]" />
          <span>First-Time Password Setup</span>
        </div>
      }
      subtitle={`Employee ID: ${account.employee_id} — ${account.full_name} (${account.role})`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        
        <div className="p-3 bg-[#F5F2EC] border border-[#D6CEBE] rounded-xl text-xs text-[#44403C]">
          <strong>Notice:</strong> No password has been created for your account. Please set a secure password (minimum 8 characters) to proceed.
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-[#15803D]/10 border border-[#15803D]/30 text-[#15803D] text-xs font-bold flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#1C1917] block mb-1">
                New Password * (Min. 8 characters)
              </label>
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#FAF8F5] text-[#1C1917] text-sm font-semibold px-3 py-2.5 rounded-xl border border-[#E7E3DA] focus:outline-none focus:border-[#292524] focus:bg-white"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#1C1917] block mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#FAF8F5] text-[#1C1917] text-sm font-semibold px-3 py-2.5 rounded-xl border border-[#E7E3DA] focus:outline-none focus:border-[#292524] focus:bg-white"
                required
                minLength={8}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E3DA]">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={isLoading}
                className="font-bold flex-1"
              >
                {isLoading ? "Saving Password..." : "✔ Create Password & Sign In"}
              </Button>
            </div>
          </form>
        )}

      </div>
    </Modal>
  );
}
