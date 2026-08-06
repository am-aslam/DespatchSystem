"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { UserCircleIcon, KeyIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

export default function UserProfileView() {
  const { currentUser, changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (newPassword.length < 8) {
      setErrorMsg("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    const res = await changePassword(currentPassword, newPassword, confirmPassword);
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setErrorMsg(res.error || "Failed to change password.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Header Card */}
      <div className="bg-white p-6 rounded-xl border border-[#E7E3DA] shadow-xs flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#292524] text-white flex items-center justify-center font-black text-xl shrink-0">
          {currentUser?.employee_id?.slice(0, 2) || "EP"}
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#1C1917] tracking-tight">
            {currentUser?.full_name || currentUser?.name}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold text-stone-500 bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E7E3DA]">
              Employee ID: {currentUser?.employee_id}
            </span>
            <Badge variant="stone" size="sm">
              {currentUser?.role}
            </Badge>
          </div>
        </div>
      </div>

      {/* Account Profile Details Card */}
      <div className="bg-white p-6 rounded-xl border border-[#E7E3DA] shadow-xs space-y-4">
        <div className="text-xs font-bold text-[#1C1917] uppercase tracking-wider border-b border-[#E7E3DA] pb-2 flex items-center gap-2">
          <UserCircleIcon className="w-4 h-4 text-[#292524]" />
          <span>Employee Profile Information</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-[#78716C] font-medium block">Employee ID</label>
            <div className="text-sm font-extrabold text-[#1C1917] mt-0.5 p-2.5 bg-[#FAF8F5] rounded-lg border border-[#E7E3DA]">
              {currentUser?.employee_id}
            </div>
            <p className="text-[10px] text-stone-400 mt-1">Permanent Employee ID (Cannot be modified)</p>
          </div>

          <div>
            <label className="text-[#78716C] font-medium block">Assigned Role</label>
            <div className="text-sm font-extrabold text-[#1C1917] mt-0.5 p-2.5 bg-[#FAF8F5] rounded-lg border border-[#E7E3DA]">
              {currentUser?.role}
            </div>
            <p className="text-[10px] text-stone-400 mt-1">System Authorization Level</p>
          </div>

          <div>
            <label className="text-[#78716C] font-medium block">Full Name</label>
            <div className="text-sm font-bold text-[#1C1917] mt-0.5 p-2.5 bg-[#FAF8F5] rounded-lg border border-[#E7E3DA]">
              {currentUser?.full_name || currentUser?.name}
            </div>
          </div>

          <div>
            <label className="text-[#78716C] font-medium block">Email Address</label>
            <div className="text-sm font-bold text-[#1C1917] mt-0.5 p-2.5 bg-[#FAF8F5] rounded-lg border border-[#E7E3DA]">
              {currentUser?.email || "No email assigned"}
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white p-6 rounded-xl border border-[#E7E3DA] shadow-xs space-y-4">
        <div className="text-xs font-bold text-[#1C1917] uppercase tracking-wider border-b border-[#E7E3DA] pb-2 flex items-center gap-2">
          <KeyIcon className="w-4 h-4 text-[#292524]" />
          <span>Security & Password Settings</span>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-[#15803D]/10 border border-[#15803D]/30 text-[#15803D] text-xs font-bold flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-[#1C1917] block mb-1">
              Current Password *
            </label>
            <input
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-[#FAF8F5] text-[#1C1917] text-xs font-semibold px-3 py-2.5 rounded-lg border border-[#E7E3DA] focus:outline-none focus:border-[#292524]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[#1C1917] block mb-1">
                New Password * (Min 8 chars)
              </label>
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#FAF8F5] text-[#1C1917] text-xs font-semibold px-3 py-2.5 rounded-lg border border-[#E7E3DA] focus:outline-none focus:border-[#292524]"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="font-bold text-[#1C1917] block mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#FAF8F5] text-[#1C1917] text-xs font-semibold px-3 py-2.5 rounded-lg border border-[#E7E3DA] focus:outline-none focus:border-[#292524]"
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={isLoading}
              className="font-bold"
            >
              {isLoading ? "Updating Password..." : "Update Password"}
            </Button>
          </div>
        </form>
      </div>

    </div>
  );
}
