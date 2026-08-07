"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import {
  UsersIcon,
  UserPlusIcon,
  ArrowPathIcon,
  TrashIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

export default function UserManagementView() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Create User Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEmpId, setNewEmpId] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("SALESPERSON");
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  // Toast / feedback message
  const [actionFeedback, setActionFeedback] = useState(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axios.get("/api/users");
      if (res.data?.success) {
        setUsers(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      const timeout = setTimeout(() => {
        fetchUsers();
      }, 0);

      return () => clearTimeout(timeout);
    }
  }, [isAdmin, fetchUsers]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setModalError("");
    setModalSuccess("");

    try {
      const res = await axios.post("/api/users", {
        employee_id: newEmpId.trim().toUpperCase(),
        full_name: newName.trim(),
        email: newEmail ? newEmail.trim() : null,
        role: newRole,
        status: "ACTIVE",
      });

      if (res.data?.success) {
        setModalSuccess(res.data.message);
        fetchUsers();
        setTimeout(() => {
          setIsCreateModalOpen(false);
          setNewEmpId("");
          setNewName("");
          setNewEmail("");
          setModalSuccess("");
        }, 1500);
      }
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to create user.");
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const res = await axios.put(`/api/users/${user.id}/status`);
      if (res.data?.success) {
        setActionFeedback({ message: res.data.message, type: "success" });
        fetchUsers();
      }
    } catch (err) {
      setActionFeedback({ message: err.response?.data?.message || "Failed to update status", type: "danger" });
    }
  };

  const handleResetPassword = async (user) => {
    if (!confirm(`Are you sure you want to reset the password for ${user.employee_id} (${user.full_name})? The user will be required to create a new password on their next login.`)) {
      return;
    }

    try {
      const res = await axios.post(`/api/users/${user.id}/reset-password`);
      if (res.data?.success) {
        setActionFeedback({ message: res.data.message, type: "success" });
        fetchUsers();
      }
    } catch (err) {
      setActionFeedback({ message: err.response?.data?.message || "Failed to reset password", type: "danger" });
    }
  };

  const handleDeleteUser = async (user) => {
    if (!confirm(`Permanently delete account ${user.employee_id} (${user.full_name})?`)) {
      return;
    }

    try {
      const res = await axios.delete(`/api/users/${user.id}`);
      if (res.data?.success) {
        setActionFeedback({ message: res.data.message, type: "success" });
        fetchUsers();
      }
    } catch (err) {
      setActionFeedback({ message: err.response?.data?.message || "Failed to delete user", type: "danger" });
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.employee_id?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  if (!isAdmin) {
    return (
      <div className="p-12 text-center text-[#DC2626] font-bold text-base bg-white rounded-xl border border-[#E7E3DA]">
        403 Forbidden: Only Administrators can access User Management.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      {/* Top Header Card */}
      <div className="bg-white p-4 rounded-xl border border-[#E7E3DA] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#1C1917] tracking-tight flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-[#292524]" />
            Employee Accounts Management
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            Admin console: Create accounts, suspend/activate employees, and reset passwords.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={UserPlusIcon}
          onClick={() => setIsCreateModalOpen(true)}
        >
          + Add New Employee
        </Button>
      </div>

      {/* Action feedback toast */}
      {actionFeedback && (
        <div className={`p-3 rounded-lg text-xs font-bold flex items-center justify-between ${
          actionFeedback.type === 'success' ? 'bg-[#15803D]/10 border border-[#15803D]/30 text-[#15803D]' : 'bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626]'
        }`}>
          <span>{actionFeedback.message}</span>
          <button onClick={() => setActionFeedback(null)} className="underline">Dismiss</button>
        </div>
      )}

      {/* Search Input */}
      <div className="relative max-w-sm">
        <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder="Search Employee ID, Name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white text-[#1C1917] text-xs pl-8 pr-3 py-2 rounded-lg border border-[#E7E3DA] focus:outline-none focus:border-[#292524]"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#E7E3DA] rounded-xl shadow-xs">
        <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-[800px] text-xs">
          <thead className="bg-[#FAF8F5] border-b border-[#E7E3DA] text-[#1C1917]">
            <tr>
              <th className="px-4 py-3 font-bold">Emp ID</th>
              <th className="px-4 py-3 font-bold">Full Name</th>
              <th className="px-4 py-3 font-bold">Email</th>
              <th className="px-4 py-3 font-bold">Role</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Password Status</th>
              <th className="px-4 py-3 font-bold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E3DA] bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-stone-500">
                  Loading employee accounts...
                </td>
              </tr>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="px-4 py-3 font-black text-[#1C1917] text-sm">
                    {u.employee_id}
                  </td>
                  <td className="px-4 py-3 font-bold text-[#1C1917]">
                    {u.full_name}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {u.email || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="stone" size="sm">
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        u.status === "ACTIVE"
                          ? "bg-[#15803D]/10 text-[#15803D] border-[#15803D]/30"
                          : "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {u.first_login === 1 || !u.password_hash ? (
                      <span className="text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                        Pending Setup
                      </span>
                    ) : (
                      <span className="text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                        Password Set
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Reset Password Button */}
                      <button
                        onClick={() => handleResetPassword(u)}
                        className="px-2 py-1 rounded bg-[#F5F2EC] text-[#1C1917] hover:bg-[#292524] hover:text-white text-[11px] font-bold border border-[#E7E3DA] transition-colors flex items-center gap-1"
                        title="Reset password so user must set a new password on next login"
                      >
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                        <span>Reset Pass</span>
                      </button>

                      {/* Suspend / Activate Button */}
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`p-1.5 rounded transition-colors ${
                          u.status === "ACTIVE"
                            ? "text-amber-700 hover:bg-amber-100"
                            : "text-emerald-700 hover:bg-emerald-100"
                        }`}
                        title={u.status === "ACTIVE" ? "Suspend user" : "Activate user"}
                      >
                        <NoSymbolIcon className="w-4 h-4" />
                      </button>

                      {/* Delete User Button */}
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="p-1.5 rounded text-[#DC2626] hover:bg-[#DC2626]/10"
                        title="Delete user account permanently"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-stone-500">
                  No employee accounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Create New Employee Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Employee Account"
        subtitle="Admin will create account details. Password will be set by employee on first login."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateUser} className="space-y-3">
          {modalError && (
            <div className="p-2.5 rounded bg-[#DC2626]/10 text-[#DC2626] text-xs font-semibold">
              {modalError}
            </div>
          )}

          {modalSuccess && (
            <div className="p-2.5 rounded bg-[#15803D]/10 text-[#15803D] text-xs font-bold flex items-center gap-1.5">
              <CheckCircleIcon className="w-4 h-4" />
              <span>{modalSuccess}</span>
            </div>
          )}

          <Input
            label="Employee ID (Unique) *"
            placeholder="e.g. SL006"
            value={newEmpId}
            onChange={(e) => setNewEmpId(e.target.value.toUpperCase())}
            required
          />

          <Input
            label="Full Name *"
            placeholder="e.g. RAJESH KUMAR"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />

          <Input
            label="Email (Optional)"
            type="email"
            placeholder="rajesh@aurum.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />

          <Select
            label="Role *"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            options={[
              { value: "SALESPERSON", label: "SALESPERSON" },
              { value: "MANAGER", label: "MANAGER" },
              { value: "ADMIN", label: "ADMIN" },
            ]}
          />

          <div className="p-2.5 rounded bg-[#F5F2EC] border border-[#D6CEBE] text-[11px] text-[#44403C]">
            <strong>Note:</strong> Initial password will be set to NULL. Upon first login with Employee ID, the user will be prompted to create their password.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E3DA]">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Create Employee Account
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
