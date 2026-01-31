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
    splittableColumns: Record<string, 'ADDRESS' | 'NAME' | 'NONE'>;
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
import { getSplittableType } from '../split-utils';

export const useWoznyStore = create<WoznyState>()(
    immer((set) => ({
        rawRows: [],
        rows: [],
        columns: [],
        fileName: null, issues: [], activeTab: 'about', isAnalyzing: false, userSelection: [], ignoredColumns: [], showHiddenColumns: false, columnWidths: {}, splittableColumns: {},

        setCsvData: (fileName, data, columns) => set((state) => {
            state.fileName = fileName; state.rawRows = data; state.rows = data; state.columns = columns;
            state.columnWidths = calculateColumnWidths(data, columns);

            // Detect Splittable Columns
            const splitMap: Record<string, any> = {};
            columns.forEach(col => {
                const values = data.map(r => r[col] || '');
                splitMap[col] = getSplittableType(values);
            });
            state.splittableColumns = splitMap;

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

            // Update splittable map
            state.splittableColumns[finalName] = getSplittableType(values);
        }),

        splitAddressColumn: async (columnId) => {
            const { smartSplitColumn } = await import('../split-utils');
            let successCount = 0; let failCount = 0;

            set((state) => {
                const type = state.splittableColumns[columnId];
                if (type === 'NONE') return;

                const { results, successCount: s, failCount: f } = smartSplitColumn(state.rows, columnId, type);
                successCount = s; failCount = f;

                const newCols = type === 'ADDRESS'
                    ? ['Street', 'City', 'State', 'Zip'].map(suffix => `${columnId}_${suffix}`)
                    : ['First', 'Middle', 'Last'].map(suffix => `${columnId}_${suffix}`);

                newCols.forEach(newCol => {
                    if (!state.columns.includes(newCol)) state.columns.push(newCol);
                });

                state.rows.forEach((row, idx) => {
                    const parsed = results[idx];
                    if (parsed) {
                        newCols.forEach((colName, colIdx) => {
                            const keys = Object.keys(parsed);
                            row[colName] = (parsed as any)[keys[colIdx]] || '';
                        });
                    }
                });

                state.issues = runDeterministicAnalysis(state.rows, state.columns);
                state.columnWidths = calculateColumnWidths(state.rows, state.columns);

                // All new columns are NONE splittable until re-analyzed or if we want to be deep
                newCols.forEach(c => { state.splittableColumns[c] = 'NONE'; });
            });

            return { success: successCount, fail: failCount };
        }
    }))
);
