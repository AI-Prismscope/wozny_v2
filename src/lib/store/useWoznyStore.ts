import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { findDuplicateGroups } from "../data-quality";
import { sortRows } from "../services/sorting";

export type RowData = Record<string, string>;

export interface WoznyState {
  // Data State
  rawRows: RowData[];
  rows: RowData[];
  columns: string[];
  fileName: string | null;

  // App State
  activeTab:
    | "upload"
    | "ask-wozny"
    | "analysis"
    | "report"
    | "workshop"
    | "diff"
    | "about"
    | "status";

  // User Selection State
  userSelection: number[];
  showHiddenColumns: boolean;
  columnWidths: Record<string, number>;
  splittableColumns: Record<string, "ADDRESS" | "NAME" | "NONE">;
  sortConfig: { columnId: string; direction: "asc" | "desc" } | null;

  // System Status State
  storageUsage: { used: number; quota: number; percent: number } | null;

  // Actions
  setCsvData: (fileName: string, data: RowData[], columns: string[]) => void;
  setRows: (rows: RowData[]) => void;
  reset: () => void;
  setActiveTab: (tab: WoznyState["activeTab"]) => void;
  updateCell: (rowIndex: number, columnId: string, value: string) => void;
  removeRow: (rowIndex: number) => void;
  resolveDuplicates: () => void;
  toggleShowHiddenColumns: () => void;

  // Bulk Actions
  setUserSelection: (indices: number[]) => void;
  clearUserSelection: () => void;
  bulkUpdate: (indices: number[], columnId: string, value: string) => void;
  addColumn: (name: string, values: string[]) => void;

  // Address Split Action
  splitAddressColumn: (
    columnId: string,
  ) => Promise<{ success: number; fail: number }>;

  // Sort Action
  toggleSort: (columnId: string) => void;

  // System Actions
  checkStorage: () => Promise<void>;
}

import { calculateColumnWidths } from "../measure-utils";
import { getSplittableType } from "../split-utils";

export const useWoznyStore = create<WoznyState>()(
  immer((set) => ({
    rawRows: [],
    rows: [],
    columns: [],
    fileName: null,
    activeTab: "about",
    userSelection: [],
    showHiddenColumns: false,
    columnWidths: {},
    splittableColumns: {},
    sortConfig: null,
    storageUsage: null,

    setCsvData: (fileName, data, columns) =>
      set((state) => {
        state.fileName = fileName;
        state.rawRows = data;
        state.rows = data.map((row, i) => ({
          ...row,
          __wozny_index: String(i),
        }));
        state.columns = columns;
        state.columnWidths = calculateColumnWidths(data, columns);

        const splitMap: Record<string, "ADDRESS" | "NAME" | "NONE"> = {};
        columns.forEach((col) => {
          const values = data.map((r) => r[col] || "");
          splitMap[col] = getSplittableType(values);
        });
        state.splittableColumns = splitMap;

        state.sortConfig = null;
        state.activeTab = "report";
      }),

    setRows: (rows) =>
      set((state) => {
        state.rows = rows;
      }),

    reset: () =>
      set((state) => {
        state.rawRows = [];
        state.rows = [];
        state.columns = [];
        state.fileName = null;
        state.activeTab = "upload";
        state.userSelection = [];
        state.columnWidths = {};
        state.splittableColumns = {};
        state.sortConfig = null;
      }),

    setActiveTab: (tab) =>
      set((state) => {
        state.activeTab = tab;
      }),

    updateCell: (rowIndex, columnId, value) =>
      set((state) => {
        if (state.rows[rowIndex]) {
          state.rows[rowIndex][columnId] = value;
        }
      }),

    removeRow: (rowIndex) =>
      set((state) => {
        if (rowIndex >= 0 && rowIndex < state.rows.length) {
          state.rows.splice(rowIndex, 1);
        }
      }),

    resolveDuplicates: () =>
      set((state) => {
        const rowsToDelete = new Set<number>();
        const duplicateGroups = findDuplicateGroups(state.rows, state.columns);

        duplicateGroups.forEach((group) => {
          for (let i = 1; i < group.length; i++) {
            rowsToDelete.add(group[i]);
          }
        });

        state.rows = state.rows.filter((_, idx) => !rowsToDelete.has(idx));
      }),

    toggleShowHiddenColumns: () =>
      set((state) => {
        state.showHiddenColumns = !state.showHiddenColumns;
      }),

    setUserSelection: (indices) =>
      set((state) => {
        state.userSelection = indices;
      }),

    clearUserSelection: () =>
      set((state) => {
        state.userSelection = [];
      }),

    bulkUpdate: (indices, columnId, value) =>
      set((state) => {
        indices.forEach((idx) => {
          if (state.rows[idx]) {
            state.rows[idx][columnId] = value;
          }
        });
      }),

    addColumn: (name, values) =>
      set((state) => {
        let finalName = name;
        let counter = 1;
        while (state.columns.includes(finalName)) {
          finalName = `${name} (${counter++})`;
        }
        state.columns.push(finalName);
        state.rows.forEach((row, i) => {
          row[finalName] = values[i] || "";
        });
        state.columnWidths = calculateColumnWidths(state.rows, state.columns);
        state.splittableColumns[finalName] = getSplittableType(values);
      }),

    splitAddressColumn: async (columnId) => {
      const { smartSplitColumn } = await import("../split-utils");
      let successCount = 0;
      let failCount = 0;

      set((state) => {
        const type = state.splittableColumns[columnId];
        if (type === "NONE") return;

        const {
          results,
          successCount: s,
          failCount: f,
        } = smartSplitColumn(state.rows, columnId, type);
        successCount = s;
        failCount = f;

        const newCols =
          type === "ADDRESS"
            ? ["Street", "City", "State", "Zip"].map(
                (suffix) => `${columnId}_${suffix}`,
              )
            : ["First", "Middle", "Last"].map(
                (suffix) => `${columnId}_${suffix}`,
              );

        newCols.forEach((newCol) => {
          if (!state.columns.includes(newCol)) state.columns.push(newCol);
        });

        state.rows.forEach((row, idx) => {
          const parsed = results[idx];
          if (parsed) {
            newCols.forEach((colName, colIdx) => {
              const keys = Object.keys(parsed);
              row[colName] =
                (parsed as unknown as Record<string, string>)[keys[colIdx]] ||
                "";
            });
          }
        });

        state.columnWidths = calculateColumnWidths(state.rows, state.columns);
        newCols.forEach((c) => {
          state.splittableColumns[c] = "NONE";
        });
      });

      return { success: successCount, fail: failCount };
    },

    toggleSort: (columnId) =>
      set((state) => {
        let nextDir: "asc" | "desc" | null = "asc";
        if (state.sortConfig?.columnId === columnId) {
          if (state.sortConfig.direction === "asc") nextDir = "desc";
          else nextDir = null;
        }

        const config = nextDir ? { columnId, direction: nextDir } : null;
        state.sortConfig = config;
        state.rows = sortRows(state.rows, config);
      }),

    checkStorage: async () => {
      if ("storage" in navigator && "estimate" in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          const used = estimate.usage || 0;
          const quota = estimate.quota || 1024 * 1024 * 1024;
          const percent = Math.round((used / quota) * 100);

          set((state) => {
            state.storageUsage = { used, quota, percent };
          });
        } catch (e) {
          console.error("Storage estimate failed", e);
        }
      }
    },
  })),
);
