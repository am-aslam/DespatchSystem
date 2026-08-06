"use client";

import React, { createContext, useContext, useState, useMemo } from "react";
import { useAuth } from "./AuthContext";

const DispatchContext = createContext();

const INITIAL_BATCHES = [
  {
    id: "batch-101",
    batchNo: "GLD-4158",
    name: "Gold Ornaments Lot #1",
    assignedSalespeople: ["SIJI CMS", "BABU"],
    date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    status: "Active",
    items: [
      {
        id: "item-101a",
        itemNo: "GLD-4158-1",
        name: "Kundan Antique Necklace",
        grossWeight: 8.000,
        stoneWeight: 1.500,
        pearlWeight: 0.000,
        netWeight: 6.500,
        isVerified: false,
      },
      {
        id: "item-101b",
        itemNo: "GLD-4158-2",
        name: "Gold Bangle Pair",
        grossWeight: 6.000,
        stoneWeight: 1.200,
        pearlWeight: 0.000,
        netWeight: 4.800,
        isVerified: false,
      },
    ],
  },
  {
    id: "batch-102",
    batchNo: "GLD-9793",
    name: "Gold Ornaments Lot #2",
    assignedSalespeople: ["SIJI CMS", "BABU"],
    date: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    status: "Active",
    items: [
      {
        id: "item-102a",
        itemNo: "GLD-9793-1",
        name: "Diamond Choker",
        grossWeight: 10.000,
        stoneWeight: 3.000,
        pearlWeight: 0.000,
        netWeight: 7.000,
        isVerified: false,
      },
    ],
  },
  {
    id: "batch-103",
    batchNo: "GLD-5153",
    name: "Gold Ornaments Lot #3",
    assignedSalespeople: ["MHD SHAMIL", "SHAMIL VK"],
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    status: "Active",
    items: [
      {
        id: "item-103a",
        itemNo: "GLD-5153-1",
        name: "Plain Gold Chain",
        grossWeight: 20.000,
        stoneWeight: 0.000,
        pearlWeight: 0.000,
        netWeight: 20.000,
        isVerified: false,
      },
    ],
  },
  {
    id: "batch-104",
    batchNo: "GLD-5575",
    name: "Gold Ornaments Lot #4",
    assignedSalespeople: ["SIJI CMS", "BABU"],
    date: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    status: "Active",
    items: [
      {
        id: "item-104a",
        itemNo: "GLD-5575-1",
        name: "Temple Pendant",
        grossWeight: 10.000,
        stoneWeight: 2.000,
        pearlWeight: 0.000,
        netWeight: 8.000,
        isVerified: false,
      },
    ],
  },
];

const INITIAL_SALES = [
  {
    id: "sale-901",
    itemNo: "GLD-8810",
    name: "Floral Gold Bracelet",
    grossWeight: 22.400,
    stoneWeight: 0.900,
    pearlWeight: 0.300,
    netWeight: 21.500,
    assignedSalespeople: ["BABU"],
    soldBy: "BABU",
    soldDate: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    isVerified: true,
  },
  {
    id: "sale-902",
    itemNo: "GLD-8812",
    name: "Solitaire Ring",
    grossWeight: 12.500,
    stoneWeight: 1.500,
    pearlWeight: 0.000,
    netWeight: 11.000,
    assignedSalespeople: ["SIJI CMS"],
    soldBy: "SIJI CMS",
    soldDate: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    isVerified: true,
  },
];

const INITIAL_TRASH = [
  {
    id: "trash-801",
    itemNo: "GLD-8805",
    name: "Sample Casting Pendant",
    grossWeight: 8.200,
    stoneWeight: 0.500,
    pearlWeight: 0.000,
    netWeight: 7.700,
    type: "drop",
    reason: "Dropped item",
    assignedSalespeople: ["MHD SHAMIL"],
    deletedBy: "Admin",
    deletedDate: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
  },
];

export function DispatchProvider({ children }) {
  const { currentUser } = useAuth();

  const [batches, setBatches] = useState(INITIAL_BATCHES);
  const [salesHistory, setSalesHistory] = useState(INITIAL_SALES);
  const [trash, setTrash] = useState(INITIAL_TRASH);

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

  const toggleItemVerification = (batchId, itemId) => {
    const targetItemId = itemId || batchId;
    setBatches((prev) =>
      prev.map((batch) => {
        const hasItem = batch.items.some((i) => i.id === targetItemId);
        if (hasItem) {
          return {
            ...batch,
            items: batch.items.map((item) =>
              item.id === targetItemId
                ? { ...item, isVerified: !item.isVerified }
                : item
            ),
          };
        }
        return batch;
      })
    );
  };

  const addBatch = (newItemsList, assignedPeople, batchName = "Gold Ornaments Lot") => {
    const randNo = Math.floor(1000 + Math.random() * 9000);
    const batchId = `batch-${Date.now()}`;
    const batchNo = `GLD-${randNo}`;

    const formattedItems = newItemsList.map((item, idx) => {
      const g = parseFloat(item.grossWeight) || 0;
      const s = parseFloat(item.stoneWeight) || 0;
      const p = parseFloat(item.pearlWeight) || 0;
      const net = calculateNetWeight(g, s);
      return {
        id: `item-${Date.now()}-${idx}`,
        itemNo: item.itemNo || `${batchNo}-${idx + 1}`,
        name: item.name || "Gold Ornament",
        grossWeight: g,
        stoneWeight: s,
        pearlWeight: p,
        netWeight: net,
        isVerified: false,
      };
    });

    const newBatch = {
      id: batchId,
      batchNo: batchNo,
      name: batchName,
      assignedSalespeople: assignedPeople || ["SIJI CMS", "BABU"],
      date: new Date().toISOString(),
      status: "Active",
      items: formattedItems,
    };

    setBatches((prev) => [newBatch, ...prev]);
  };

  const addItem = (data) => {
    addBatch([data], data.assignedSalespeople || ["SIJI CMS", "BABU"], data.name || "Gold Ornament");
  };

  // Delete Batch Row (Direct Delete for Admin/Manager)
  const deleteBatch = (batchId) => {
    const batchToDelete = batches.find((b) => b.id === batchId);
    if (!batchToDelete) return;

    setBatches((prev) => prev.filter((b) => b.id !== batchId));
    setSelectedBatchIds((prev) => prev.filter((id) => id !== batchId));

    const trashRecord = {
      id: `trash-${Date.now()}`,
      itemNo: batchToDelete.batchNo,
      name: batchToDelete.name,
      grossWeight: batchToDelete.items.reduce((acc, i) => acc + i.grossWeight, 0),
      netWeight: batchToDelete.items.reduce((acc, i) => acc + i.netWeight, 0),
      type: "drop",
      reason: "Batch row deletion",
      assignedSalespeople: batchToDelete.assignedSalespeople,
      deletedBy: currentUser?.assignedName || currentUser?.name || "Admin",
      deletedDate: new Date().toISOString(),
    };
    setTrash((prev) => [trashRecord, ...prev]);
    showToast(`Moved ${batchToDelete.batchNo} to trash`, "success");
  };

  // Salesperson Deletion with Sold vs Drop Choice
  const deleteSalespersonOrnament = (itemId, actionType = "sold", remarks = "") => {
    let targetItem = null;
    let targetBatchId = null;

    for (const b of batches) {
      const found = b.items.find((i) => i.id === itemId);
      if (found) {
        targetItem = found;
        targetBatchId = b.id;
        break;
      }
    }

    if (!targetItem) return;

    // Remove item from batch
    deleteSubItem(targetBatchId, itemId);

    const nowISO = new Date().toISOString();
    const actorName = currentUser?.assignedName || currentUser?.name || "Salesperson";

    if (actionType === "sold") {
      // 1. Add to Sales History
      const newSaleRecord = {
        id: `sale-${Date.now()}`,
        itemNo: targetItem.itemNo,
        name: targetItem.name,
        grossWeight: targetItem.grossWeight,
        stoneWeight: targetItem.stoneWeight,
        pearlWeight: targetItem.pearlWeight,
        netWeight: targetItem.netWeight,
        assignedSalespeople: [actorName],
        soldBy: actorName,
        soldDate: nowISO,
        isVerified: true,
      };
      setSalesHistory((prev) => [newSaleRecord, ...prev]);

      // 2. Add to Trash audit log
      const trashRecord = {
        id: `trash-${Date.now()}`,
        itemNo: targetItem.itemNo,
        name: targetItem.name,
        grossWeight: targetItem.grossWeight,
        stoneWeight: targetItem.stoneWeight,
        pearlWeight: targetItem.pearlWeight,
        netWeight: targetItem.netWeight,
        type: "sold",
        reason: remarks || "Sold by salesperson",
        deletedBy: actorName,
        deletedDate: nowISO,
      };
      setTrash((prev) => [trashRecord, ...prev]);

      showToast(`Item ${targetItem.itemNo} marked as SOLD & added to Sales History!`, "success");
    } else {
      // Drop action: Add ONLY to Trash (Excluded from Sales)
      const trashRecord = {
        id: `trash-${Date.now()}`,
        itemNo: targetItem.itemNo,
        name: targetItem.name,
        grossWeight: targetItem.grossWeight,
        stoneWeight: targetItem.stoneWeight,
        pearlWeight: targetItem.pearlWeight,
        netWeight: targetItem.netWeight,
        type: "drop",
        reason: remarks || "Dropped ornament",
        deletedBy: actorName,
        deletedDate: nowISO,
      };
      setTrash((prev) => [trashRecord, ...prev]);

      showToast(`Item ${targetItem.itemNo} dropped & moved to Trash.`, "danger");
    }
  };

  const deleteSubItem = (batchId, itemId) => {
    setBatches((prev) =>
      prev
        .map((batch) => {
          if (batch.id === batchId) {
            const updatedItems = batch.items.filter((i) => i.id !== itemId);
            return {
              ...batch,
              items: updatedItems,
            };
          }
          return batch;
        })
        .filter((batch) => batch.items.length > 0)
    );
  };

  const updateSubItem = (batchId, itemId, data) => {
    const g = parseFloat(data.grossWeight) || 0;
    const s = parseFloat(data.stoneWeight) || 0;
    const p = parseFloat(data.pearlWeight) || 0;
    const net = calculateNetWeight(g, s);

    setBatches((prev) =>
      prev.map((batch) => {
        if (batch.id === batchId) {
          return {
            ...batch,
            items: batch.items.map((item) => {
              if (item.id === itemId) {
                return {
                  ...item,
                  itemNo: data.itemNo || item.itemNo,
                  name: data.name || item.name,
                  grossWeight: g,
                  stoneWeight: s,
                  pearlWeight: p,
                  netWeight: net,
                };
              }
              return item;
            }),
          };
        }
        return batch;
      })
    );
    showToast("Sub-item updated successfully!", "success");
  };

  const updateItem = (id, data) => {
    setBatches((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          return {
            ...b,
            name: data.name || b.name,
            assignedSalespeople: data.assignedSalespeople || b.assignedSalespeople,
          };
        }
        return b;
      })
    );
    showToast("Batch updated", "success");
  };

  const assignSalespeopleToBatches = (batchIds, selectedSalespeople) => {
    setBatches((prev) =>
      prev.map((batch) => {
        if (batchIds.includes(batch.id)) {
          return {
            ...batch,
            assignedSalespeople: selectedSalespeople,
          };
        }
        return batch;
      })
    );
    setSelectedBatchIds([]);
    showToast(`Assigned ${batchIds.length} batch(es) to ${selectedSalespeople.join(", ")}`, "success");
  };

  const restoreFromTrash = (trashId) => {
    const trashItem = trash.find((t) => t.id === trashId);
    if (!trashItem) return;

    setTrash((prev) => prev.filter((t) => t.id !== trashId));

    const randNo = Math.floor(1000 + Math.random() * 9000);
    const restoredBatch = {
      id: `batch-${Date.now()}`,
      batchNo: trashItem.itemNo || `GLD-${randNo}`,
      name: trashItem.name || "Restored Ornament Lot",
      assignedSalespeople: trashItem.assignedSalespeople || ["SIJI CMS", "BABU"],
      date: new Date().toISOString(),
      status: "Active",
      items: [
        {
          id: `item-${Date.now()}`,
          itemNo: trashItem.itemNo || `GLD-${randNo}-1`,
          name: trashItem.name || "Restored Ornament",
          grossWeight: trashItem.grossWeight || 0,
          stoneWeight: 0,
          pearlWeight: 0,
          netWeight: trashItem.netWeight || 0,
          isVerified: false,
        },
      ],
    };

    setBatches((prev) => [restoredBatch, ...prev]);
    showToast(`Restored ${trashItem.itemNo} to active table`, "success");
  };

  const purgeFromTrash = (trashId) => {
    setTrash((prev) => prev.filter((t) => t.id !== trashId));
    showToast("Item permanently removed from trash", "danger");
  };

  const updateSaleItem = (saleId, updatedData) => {
    const g = parseFloat(updatedData.grossWeight) || 0;
    const s = parseFloat(updatedData.stoneWeight) || 0;
    const p = parseFloat(updatedData.pearlWeight) || 0;
    const net = calculateNetWeight(g, s);

    setSalesHistory((prev) =>
      prev.map((sale) => {
        if (sale.id === saleId) {
          return {
            ...sale,
            itemNo: updatedData.itemNo || sale.itemNo,
            name: updatedData.name || sale.name,
            grossWeight: g,
            stoneWeight: s,
            pearlWeight: p,
            netWeight: net,
            soldBy: updatedData.soldBy || sale.soldBy,
          };
        }
        return sale;
      })
    );
    showToast("Sales item updated!", "success");
  };

  const deleteSaleItem = (saleId) => {
    setSalesHistory((prev) => prev.filter((s) => s.id !== saleId));
    showToast("Sale record deleted", "danger");
  };

  const filteredBatches = useMemo(() => {
    return batches.map((batch) => {
      const grossSum = batch.items.reduce((acc, i) => acc + (i.grossWeight || 0), 0);
      const stoneSum = batch.items.reduce((acc, i) => acc + (i.stoneWeight || 0), 0);
      const pearlSum = batch.items.reduce((acc, i) => acc + (i.pearlWeight || 0), 0);
      const netSum = batch.items.reduce((acc, i) => acc + (i.netWeight || 0), 0);

      return {
        ...batch,
        itemCount: batch.items.length,
        grossWeight: grossSum,
        stoneWeight: stoneSum,
        pearlWeight: pearlSum,
        netWeight: netSum,
      };
    }).filter((batch) => {
      if (currentUser?.role === "Salesperson" && currentUser?.assignedName) {
        const isAssigned = batch.assignedSalespeople?.includes(currentUser.assignedName);
        if (!isAssigned) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNo = batch.batchNo.toLowerCase().includes(q);
        const matchesName = batch.name.toLowerCase().includes(q);
        const matchesPeople = batch.assignedSalespeople.some((sp) =>
          sp.toLowerCase().includes(q)
        );
        const matchesSubItems = batch.items.some(
          (i) => i.itemNo.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
        );
        if (!matchesNo && !matchesName && !matchesPeople && !matchesSubItems) {
          return false;
        }
      }

      if (assignedFilter !== "ALL") {
        const matchesSp = batch.assignedSalespeople.includes(assignedFilter);
        if (!matchesSp) return false;
      }

      return true;
    });
  }, [batches, currentUser, searchQuery, assignedFilter]);

  const allItemizedOrnaments = useMemo(() => {
    const list = [];
    filteredBatches.forEach((batch) => {
      batch.items.forEach((item) => {
        list.push({
          ...item,
          batchId: batch.id,
          batchNo: batch.batchNo,
          assignedSalespeople: batch.assignedSalespeople,
        });
      });
    });
    return list;
  }, [filteredBatches]);

  const totals = useMemo(() => {
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
  }, [allItemizedOrnaments]);

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
