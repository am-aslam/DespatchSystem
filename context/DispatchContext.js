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
  const toastIdCounter = React.useRef(0);

  const showToast = useCallback((message, type = "success") => {
    toastIdCounter.current += 1;
    setToast({ message, type, id: toastIdCounter.current });
  }, []);

  const closeToast = useCallback(() => setToast(null), []);

  const calculateNetWeight = (gross, stone) => {
    const g = parseFloat(gross) || 0;
    const s = parseFloat(stone) || 0;
    return parseFloat(Math.max(0, g - s).toFixed(3));
  };

  // Fetch live dispatches, sales, and trash from backend API in 1 fast unified HTTP call
  const fetchAllData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await axios.get(
        `/api/init-data?search=${encodeURIComponent(searchQuery)}&date=${dateFilter}`
      );
      if (res.data?.success) {
        const { dispatches, sales, trash: rawTrash } = res.data.data;

        // 1. Format Dispatches
        if (dispatches?.isGrouped) {
          const rawGroups = dispatches.items || [];
          setBatches(
            rawGroups.map((g) => ({
              id: g.dispatch_no || g.id,
              batchNo: g.dispatch_no || g.batch_no,
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
        } else if (dispatches?.items) {
          const rawItems = dispatches.items || [];
          const formattedItems = rawItems.map((item) => ({
              id: item.id.toString(),
              dispatchId: item.dispatch_id?.toString(),
              batchNo: item.dispatch_no,
              itemNo: item.item_number,
              name: item.description || "Gold Ornament",
              grossWeight: item.gross_weight,
              stoneWeight: item.stone_weight,
              pearlWeight: item.pearl_weight,
              adWeight: item.ad_weight,
              netWeight: item.net_weight,
              isVerified: Boolean(item.is_verified),
            assignedSalespeople: item.assigned_users?.map((u) => u.name || u.full_name) || [],
          }));
          setAllItemizedOrnaments(formattedItems);
        }

        // 2. Format Sales History
        if (Array.isArray(sales)) {
          setSalesHistory(
            sales.map((s) => ({
              id: s.id.toString(),
              itemNo: s.item_number || `SALE-${s.id}`,
              name: s.description || "Gold Ornament",
              grossWeight: s.gross_weight,
              stoneWeight: s.stone_weight,
              pearlWeight: s.pearl_weight,
              adWeight: s.ad_weight,
              netWeight: s.net_weight,
              soldBy: s.salesperson_name || "Sales Executive",
              soldDate: s.sale_date,
              remarks: s.remarks || "",
              isVerified: true,
            }))
          );
        }

        // 3. Format Trash
        if (Array.isArray(rawTrash)) {
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
              remarks: t.remarks || `${t.status} item`,
              deletedBy: t.salesperson_name || "Admin",
              deletedDate: t.deleted_at,
            }))
          );
        }
      }
    } catch (err) {
      console.error("Error fetching live dispatch data:", err);
    }
  }, [currentUser, searchQuery, dateFilter]);

  // Initial fetch + 30-second polling for cross-window live sync
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchAllData();
    }, 0);

    const interval = setInterval(() => {
      fetchAllData();
    }, 30000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchAllData]);

  // Fetch ornament-level items for List Access Modal via API
  const fetchBatchItems = useCallback(async (batchNo) => {
    try {
      const res = await axios.get(`/api/dispatches/${encodeURIComponent(batchNo)}`);
      if (res.data?.success) {
        return (res.data.data || []).map((item) => ({
          id: item.id.toString(),
          dispatchId: item.dispatch_id?.toString(),
          batchNo: item.dispatch_no,
          itemNo: item.item_number,
          name: item.description || "Gold Ornament",
          grossWeight: item.gross_weight,
          stoneWeight: item.stone_weight,
          pearlWeight: item.pearl_weight,
          adWeight: item.ad_weight,
          netWeight: item.net_weight,
          isVerified: Boolean(item.is_verified),
          assignedSalespeople: item.assigned_users?.map((u) => u.name || u.full_name) || [],
        }));
      }
    } catch (err) {
      console.error("Failed to fetch batch sub-items:", err);
    }
    return [];
  }, []);

  const toggleItemVerification = async (batchId, itemId) => {
    const targetItemId = itemId || batchId;
    const currentItem = allItemizedOrnaments.find((item) => item.id === targetItemId);
    const nextValue = !currentItem?.isVerified;

    try {
      await axios.put(`/api/dispatch-items/${targetItemId}`, {
        is_verified: nextValue,
      });

      setAllItemizedOrnaments((prev) =>
        prev.map((item) =>
          item.id === targetItemId ? { ...item, isVerified: nextValue } : item
        )
      );
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update verification", "danger");
    }
  };

  // Create a single Dispatch Lot containing multiple ornaments (Single API Request)
  const addBatch = async (newItemsList, assignedPeople, batchNo) => {
    try {
      const dispatchNumber = batchNo || `GLD-${Math.floor(1000 + Math.random() * 9000)}`;

      await axios.post("/api/dispatches", {
        dispatch_no: dispatchNumber,
        assigned_salespeople: assignedPeople,
        items: newItemsList,
      });

      showToast(`Created dispatch ${dispatchNumber} with ${newItemsList.length} ornament(s)!`, "success");
      fetchAllData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to create dispatch lot", "danger");
    }
  };

  const addItem = (data) => {
    addBatch([data], data.assignedSalespeople || ["SIJI CMS"], data.batchNo || "GLD-1001");
  };

  // Direct Delete Batch (Admin / Manager)
  const deleteBatch = async (batchId) => {
    try {
      await axios.delete(`/api/dispatches/${encodeURIComponent(batchId)}`);
      setBatches((prev) => prev.filter((b) => b.id !== batchId && b.batchNo !== batchId));
      setSelectedBatchIds((prev) => prev.filter((id) => id !== batchId));
      showToast("Moved dispatch lot to trash", "success");
      fetchAllData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete dispatch lot", "danger");
    }
  };

  // Delete Salesperson Ornament (Sold vs Drop workflow with remarks note)
  const deleteSalespersonOrnament = async (itemId, actionType = "sold", remarks = "") => {
    try {
      const statusParam = actionType === "sold" ? "SOLD" : "DROP";
      await axios.delete(
        `/api/dispatches/${itemId}?status=${statusParam}&remarks=${encodeURIComponent(remarks)}`
      );

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

  const updateSubItem = async (batchId, itemId, data) => {
    try {
      await axios.put(`/api/dispatch-items/${itemId}`, data);
      showToast("Item updated successfully!", "success");
      fetchAllData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update item", "danger");
    }
  };

  const updateItem = async (id, data) => {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(id)
      );

      if (isUuid) {
        await axios.put(`/api/dispatch-items/${id}`, data);
      } else {
        await axios.put(`/api/dispatches/${encodeURIComponent(id)}`, {
          dispatch_no: data.batchNo,
          assigned_salespeople: data.assignedSalespeople,
        });
      }

      showToast("Batch updated", "success");
      fetchAllData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update batch", "danger");
    }
  };

  const assignSalespeopleToBatches = async (batchIds, selectedSalespeople) => {
    try {
      await axios.post("/api/dispatches/assign", {
        dispatch_ids: batchIds,
        user_ids: selectedSalespeople,
      });

      setSelectedBatchIds([]);
      showToast(`Assigned batch(es) to ${selectedSalespeople.join(", ")}`, "success");
      fetchAllData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to assign salespeople", "danger");
    }
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

  const updateSaleItem = async (saleId, updatedData) => {
    try {
      await axios.put(`/api/sales/${saleId}`, updatedData);
      showToast("Sales item updated!", "success");
      fetchAllData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update sale", "danger");
    }
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
    // Sort salesperson ornaments by net weight ascending (small → big)
    allItemizedOrnaments: [...allItemizedOrnaments].sort((a, b) => (a.netWeight || 0) - (b.netWeight || 0)),
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
    assignSalespeopleToItems: assignSalespeopleToBatches,
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
