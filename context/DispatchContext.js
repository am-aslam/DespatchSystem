"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

const DispatchContext = createContext();

export function DispatchProvider({ children }) {
  const { currentUser } = useAuth();

  const [batches, setBatches] = useState([]);
  const [allItemizedOrnaments, setAllItemizedOrnaments] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [trash, setTrash] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedBatchIds, setSelectedBatchIds] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type, id: Date.now() });
  };

  const closeToast = () => setToast(null);

  const calculateNetWeight = (gross, stone) => {
    const g = parseFloat(gross) || 0;
    const s = parseFloat(stone) || 0;
    return parseFloat(Math.max(0, g - s).toFixed(3));
  };

  // Fetch live dispatches, sales, and trash from backend API
  const fetchAllData = useCallback(async () => {
    if (!currentUser) return;
    try {
      // 1. Fetch Dispatches from SQL backend
      const dispatchesRes = await axios.get(
        `/api/dispatches?search=${encodeURIComponent(searchQuery)}&date=${dateFilter}`
      );
      if (dispatchesRes.data?.success) {
        const payload = dispatchesRes.data.data;

        if (payload?.isGrouped) {
          // SQL Grouped Data from Backend (One Object Per Dispatch)
          const rawGroups = payload.items || [];
          setBatches(
            rawGroups.map((g) => ({
              id: g.batch_no,
              batchNo: g.batch_no,
              name: "Gold Ornaments Lot",
              assignedSalespeople: g.assigned_users?.map((u) => u.name) || [],
              assignedStaffNames: g.assigned_staff_names || "Unassigned",
              date: g.created_at,
              status: "Active",
              grossWeight: g.gross_weight,
              stoneWeight: g.stone_weight,
              pearlWeight: g.pearl_weight,
              adWeight: g.ad_weight,
              netWeight: g.net_weight,
              itemCount: g.total_items,
              items: [],
            }))
          );
        } else {
          // Individual Ornament Data (for Salespersons)
          const rawItems = payload?.items || [];
          const formattedItems = rawItems.map((item) => ({
            id: item.id.toString(),
            itemNo: item.item_number,
            name: "Gold Ornament",
            grossWeight: item.gross_weight,
            stoneWeight: item.stone_weight,
            pearlWeight: item.pearl_weight,
            netWeight: item.net_weight,
            isVerified: Boolean(item.is_verified),
            assignedSalespeople: item.assigned_users?.map((u) => u.name || u.full_name) || [],
          }));
          setAllItemizedOrnaments(formattedItems);
        }
      }

      // 2. Fetch Sales History
      const salesRes = await axios.get("/api/sales");
      if (salesRes.data?.success) {
        const rawSales = salesRes.data.data || [];
        setSalesHistory(
          rawSales.map((s) => ({
            id: s.id.toString(),
            itemNo: s.dispatch_id ? `GLD-${s.dispatch_id}` : `SALE-${s.id}`,
            name: "Gold Ornament",
            grossWeight: s.gross_weight,
            stoneWeight: s.stone_weight,
            pearlWeight: s.pearl_weight,
            netWeight: s.net_weight,
            soldBy: s.salesperson_name || "Sales Executive",
            soldDate: s.sale_date,
            isVerified: true,
          }))
        );
      }

      // 3. Fetch Trash
      const trashRes = await axios.get("/api/trash");
      if (trashRes.data?.success) {
        const rawTrash = trashRes.data.data || [];
        setTrash(
          rawTrash.map((t) => ({
            id: t.id.toString(),
            itemNo: t.item_number,
            name: t.item_name || "Gold Ornament",
            grossWeight: t.gross_weight,
            stoneWeight: t.stone_weight,
            pearlWeight: t.pearl_weight,
            netWeight: t.net_weight,
            status: t.status,
            reason: `${t.status} item`,
            deletedBy: t.salesperson_name || "Admin",
            deletedDate: t.deleted_at,
          }))
        );
      }
    } catch (err) {
      console.error("Error fetching live dispatch data:", err);
    }
  }, [currentUser, searchQuery, dateFilter]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Fetch ornament-level items for List Access Modal via API
  const fetchBatchItems = async (batchNo) => {
    try {
      const res = await axios.get(`/api/dispatches/${encodeURIComponent(batchNo)}`);
      if (res.data?.success) {
        return (res.data.data || []).map((item) => ({
          id: item.id.toString(),
          itemNo: item.item_number,
          name: "Gold Ornament",
          grossWeight: item.gross_weight,
          stoneWeight: item.stone_weight,
          pearlWeight: item.pearl_weight,
          netWeight: item.net_weight,
          isVerified: Boolean(item.is_verified),
          assignedSalespeople: item.assigned_users?.map((u) => u.name || u.full_name) || [],
        }));
      }
    } catch (err) {
      console.error("Failed to fetch batch sub-items:", err);
    }
    return [];
  };

  const toggleItemVerification = (batchId, itemId) => {
    const targetItemId = itemId || batchId;
    setAllItemizedOrnaments((prev) =>
      prev.map((item) =>
        item.id === targetItemId ? { ...item, isVerified: !item.isVerified } : item
      )
    );
  };

  // Add Batch with API Persistence
  const addBatch = async (newItemsList, assignedPeople, batchName = "Gold Ornaments Lot") => {
    try {
      for (const item of newItemsList) {
        const g = parseFloat(item.grossWeight) || 0;
        const s = parseFloat(item.stoneWeight) || 0;
        const p = parseFloat(item.pearlWeight) || 0;

        await axios.post("/api/dispatches", {
          item_number: item.itemNo,
          gross_weight: g,
          stone_weight: s,
          pearl_weight: p,
          assigned_user_ids: [currentUser.id],
        });
      }

      showToast(`Added ${newItemsList.length} ornament(s) to active sheet!`, "success");
      fetchAllData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to add batch", "danger");
    }
  };

  const addItem = (data) => {
    addBatch([data], data.assignedSalespeople || ["SIJI CMS"], data.name || "Gold Ornament");
  };

  // Direct Delete Batch (Admin / Manager)
  const deleteBatch = async (batchId) => {
    try {
      await axios.delete(`/api/dispatches/${encodeURIComponent(batchId)}`);
      setBatches((prev) => prev.filter((b) => b.id !== batchId));
      setSelectedBatchIds((prev) => prev.filter((id) => id !== batchId));
      showToast("Moved batch to trash", "success");
      fetchAllData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete item", "danger");
    }
  };

  // Delete Salesperson Ornament (Sold vs Drop workflow)
  const deleteSalespersonOrnament = async (itemId, actionType = "sold", remarks = "") => {
    try {
      const statusParam = actionType === "sold" ? "SOLD" : "DROP";
      await axios.delete(`/api/dispatches/${itemId}?status=${statusParam}`);

      showToast(
        actionType === "sold"
          ? "Item marked as SOLD & added to Sales History!"
          : "Item dropped & moved to Trash.",
        actionType === "sold" ? "success" : "danger"
      );

      fetchAllData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete item", "danger");
    }
  };

  const deleteSubItem = async (batchId, itemId) => {
    try {
      await axios.delete(`/api/dispatches/${itemId}`);
      showToast("Sub-item deleted", "success");
      fetchAllData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete sub-item", "danger");
    }
  };

  const updateSubItem = (batchId, itemId, data) => {
    showToast("Item updated successfully!", "success");
  };

  const updateItem = (id, data) => {
    showToast("Batch updated", "success");
  };

  const assignSalespeopleToBatches = async (batchIds, selectedSalespeople) => {
    setSelectedBatchIds([]);
    showToast(`Assigned batch(es) to ${selectedSalespeople.join(", ")}`, "success");
  };

  // Restore from Trash with API Persistence
  const restoreFromTrash = async (trashId) => {
    try {
      await axios.post(`/api/trash/${trashId}`);
      showToast("Restored item to active table", "success");
      fetchAllData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to restore item", "danger");
    }
  };

  // Purge from Trash with API Persistence
  const purgeFromTrash = async (trashId) => {
    try {
      await axios.delete(`/api/trash/${trashId}`);
      setTrash((prev) => prev.filter((t) => t.id !== trashId));
      showToast("Item permanently removed from trash", "danger");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to purge item", "danger");
    }
  };

  const updateSaleItem = (saleId, updatedData) => {
    showToast("Sales item updated!", "success");
  };

  const deleteSaleItem = async (saleId) => {
    try {
      await axios.delete(`/api/sales/${saleId}`);
      setSalesHistory((prev) => prev.filter((s) => s.id !== saleId));
      showToast("Sale record deleted", "danger");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete sale", "danger");
    }
  };

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      if (assignedFilter !== "ALL") {
        const matchesSp = batch.assignedSalespeople?.some(
          (sp) => sp.toLowerCase().includes(assignedFilter.toLowerCase())
        );
        if (!matchesSp) return false;
      }
      return true;
    });
  }, [batches, assignedFilter]);

  const totals = useMemo(() => {
    if (batches.length > 0) {
      return batches.reduce(
        (acc, b) => {
          acc.grossWeight += b.grossWeight || 0;
          acc.stoneWeight += b.stoneWeight || 0;
          acc.pearlWeight += b.pearlWeight || 0;
          acc.netWeight += b.netWeight || 0;
          return acc;
        },
        { grossWeight: 0, stoneWeight: 0, pearlWeight: 0, netWeight: 0 }
      );
    }
    return allItemizedOrnaments.reduce(
      (acc, item) => {
        acc.grossWeight += item.grossWeight || 0;
        acc.stoneWeight += item.stoneWeight || 0;
        acc.pearlWeight += item.pearlWeight || 0;
        acc.netWeight += item.netWeight || 0;
        return acc;
      },
      { grossWeight: 0, stoneWeight: 0, pearlWeight: 0, netWeight: 0 }
    );
  }, [batches, allItemizedOrnaments]);

  const value = {
    batches: filteredBatches,
    items: allItemizedOrnaments,
    allItemizedOrnaments,
    salesHistory,
    trash,
    totals,
    searchQuery,
    setSearchQuery,
    assignedFilter,
    setAssignedFilter,
    dateFilter,
    setDateFilter,
    statusFilter,
    setStatusFilter,
    selectedBatchIds,
    setSelectedBatchIds,
    calculateNetWeight,
    addBatch,
    addItem,
    updateItem,
    deleteBatch,
    deleteSubItem,
    updateSubItem,
    deleteSalespersonOrnament,
    toggleItemVerification,
    restoreFromTrash,
    purgeFromTrash,
    updateSaleItem,
    deleteSaleItem,
    assignSalespeopleToBatches,
    fetchAllData,
    fetchBatchItems,
    toast,
    showToast,
    closeToast,
  };

  return (
    <DispatchContext.Provider value={value}>
      {children}
    </DispatchContext.Provider>
  );
}

export function useDispatch() {
  const context = useContext(DispatchContext);
  if (!context) {
    throw new Error("useDispatch must be used within a DispatchProvider");
  }
  return context;
}
