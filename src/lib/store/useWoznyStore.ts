import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { runDeterministicAnalysis, autoFixRow } from '../data-quality';

export type RowData = Record<string, string>;

export interface AnalysisIssue {
    rowId: number;
    column: string;
    issueType: "FORMAT" | "DUPLICATE" | "MISSING" | "VALIDITY";
    suggestion: string;
}

export interface WoznyState {
    // Data State
    rawRows: RowData[];
    rows: RowData[];
    columns: string[];
    fileName: string | null;

    // Analysis State
    issues: AnalysisIssue[]; // Flat list of all issues

    // App State
    activeTab: 'upload' | 'ask-wozny' | 'analysis' | 'report' | 'workshop' | 'diff' | 'about';
    isAnalyzing: boolean;

    // User Selection State
    userSelection: number[];
    ignoredColumns: string[];
    showHiddenColumns: boolean;
    columnWidths: Record<string, number>;
    // Actions
    setCsvData: (fileName: string, data: RowData[], columns: string[]) => void;
    setAnalysisResults: (issues: AnalysisIssue[]) => void;
    reset: () => void;
    setActiveTab: (tab: WoznyState['activeTab']) => void;
    updateCell: (rowIndex: number, columnId: string, value: string) => void;
    autoFormat: () => void;
    removeRow: (rowIndex: number) => void;
    resolveDuplicates: () => void;
    toggleIgnoreColumn: (columnId: string) => void;
    toggleShowHiddenColumns: () => void; // NEW: Toggle action

    // Bulk Actions
    setUserSelection: (indices: number[]) => void;
    clearUserSelection: () => void;
    bulkUpdate: (indices: number[], columnId: string, value: string) => void;
    addColumn: (name: string, values: string[]) => void;
    // Address Split Action
    splitAddressColumn: (columnId: string) => Promise<{ success: number; fail: number }>;
}

import { calculateColumnWidths } from '../measure-utils';

export const useWoznyStore = create<WoznyState>()(
    immer((set) => ({
        rawRows: [],
        rows: [],
        columns: [],
        fileName: null, issues: [], activeTab: 'about', isAnalyzing: false, userSelection: [], ignoredColumns: [], showHiddenColumns: false, columnWidths: {},

        setCsvData: (fileName, data, columns) => set((state) => {
            state.fileName = fileName; state.rawRows = data; state.rows = data; state.columns = columns;
            state.columnWidths = calculateColumnWidths(data, columns);
            const autoIssues = runDeterministicAnalysis(data, columns);
            state.issues = autoIssues;
            state.activeTab = 'report';
        }),

        setAnalysisResults: (issues) => set((state) => { state.issues = issues; }),

        reset: () => set((state) => {
            state.rawRows = []; state.rows = []; state.columns = []; state.issues = []; state.fileName = null; state.activeTab = 'upload'; state.isAnalyzing = false;
        }),

        setActiveTab: (tab) => set((state) => { state.activeTab = tab; }),

        updateCell: (rowIndex, columnId, value) => set((state) => {
            if (state.rows[rowIndex]) {
                state.rows[rowIndex][columnId] = value;
                state.issues = runDeterministicAnalysis(state.rows, state.columns);
            }
        }),

        autoFormat: () => set((state) => {
            state.rows = state.rows.map((row, idx) => {
                const rowIssues = state.issues.filter(i => i.rowId === idx);
                return autoFixRow(row, state.columns, rowIssues);
            });
            state.issues = runDeterministicAnalysis(state.rows, state.columns);
        }),

        removeRow: (rowIndex) => set((state) => {
            if (rowIndex >= 0 && rowIndex < state.rows.length) {
                state.rows.splice(rowIndex, 1);
                state.issues = runDeterministicAnalysis(state.rows, state.columns);
            }
        }),

        resolveDuplicates: () => set((state) => {
            const rowsToDelete = new Set<number>();
            const exactMap = new Map<string, number[]>();
            const columns = state.columns;
            state.rows.forEach((row, rowIndex) => {
                const fingerprint = columns.map(col => String(row[col] || '').trim().toLowerCase()).join('|');
                if (exactMap.has(fingerprint)) rowsToDelete.add(rowIndex);
                else exactMap.set(fingerprint, [rowIndex]);
            });
            state.rows = state.rows.filter((_, idx) => !rowsToDelete.has(idx));
            state.issues = runDeterministicAnalysis(state.rows, state.columns);
        }),

        toggleIgnoreColumn: (columnId) => set((state) => {
            if (state.ignoredColumns.includes(columnId)) state.ignoredColumns = state.ignoredColumns.filter(c => c !== columnId);
            else state.ignoredColumns.push(columnId);
        }),

        toggleShowHiddenColumns: () => set((state) => { state.showHiddenColumns = !state.showHiddenColumns; }),

        setUserSelection: (indices) => set((state) => { state.userSelection = indices; }),

        clearUserSelection: () => set((state) => { state.userSelection = []; }),

        bulkUpdate: (indices, columnId, value) => set((state) => {
            let updated = false;
            indices.forEach(idx => {
                if (state.rows[idx]) { state.rows[idx][columnId] = value; updated = true; }
            });
            if (updated) state.issues = runDeterministicAnalysis(state.rows, state.columns);
        }),

        addColumn: (name, values) => set((state) => {
            let finalName = name; let counter = 1;
            while (state.columns.includes(finalName)) finalName = `${name} (${counter++})`;
            state.columns.push(finalName);
            state.rows.forEach((row, i) => { row[finalName] = values[i] || ''; });
            state.issues = runDeterministicAnalysis(state.rows, state.columns);
            state.columnWidths = calculateColumnWidths(state.rows, state.columns);
        }),

        splitAddressColumn: async (columnId) => {
            // We need to import the helper safely
            const { splitAddressColumn } = await import('../split-utils');

            let successCount = 0;
            let failCount = 0;

            set((state) => {
                // 1. Run Logic
                // NOTE: We pass state.rows which is a Proxy in Immer. 
                // It's safer to pass a copy or rely on the function being side-effect free (it is).
                const { results, successCount: s, failCount: f } = splitAddressColumn(state.rows, columnId);
                successCount = s;
                failCount = f;

                // 2. Determine New Column Names
                // We want: "Address_Street", "Address_City", etc.
                // Ideally next to the original column? For now, append to end is easier.
                const newCols = ['Street', 'City', 'State', 'Zip'].map(suffix => `${columnId}_${suffix}`);

                // Add new columns if not exist
                newCols.forEach(newCol => {
                    if (!state.columns.includes(newCol)) {
                        state.columns.push(newCol);
                    }
                });

                // 3. Populate Rows
                state.rows.forEach((row, idx) => {
                    const parsed = results[idx];
                    if (parsed) {
                        row[newCols[0]] = parsed.Street; // Street
                        row[newCols[1]] = parsed.City;   // City
                        row[newCols[2]] = parsed.State;  // State
                        row[newCols[3]] = parsed.Zip;    // Zip
                    } else {
                        // Optional: Fill with empty string? Already handled by 'undefined' check usually.
                        // Maybe mark as [UNPARSEABLE]?
                    }
                });

                // 4. Re-Analyze & Re-size
                state.issues = runDeterministicAnalysis(state.rows, state.columns);
                state.columnWidths = calculateColumnWidths(state.rows, state.columns);
            });

            return { success: successCount, fail: failCount };
        }
    }))
);
