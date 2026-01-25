import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { runDeterministicAnalysis, autoFixRow } from '../data-quality';

export type RowData = Record<string, string>;

export interface AnalysisIssue {
    rowId: number;
    column: string;
    issueType: "FORMAT" | "DUPLICATE" | "MISSING";
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
    activeTab: 'upload' | 'table' | 'analysis' | 'report' | 'workshop' | 'diff';
    isAnalyzing: boolean;

    // Actions
    setCsvData: (fileName: string, data: RowData[], columns: string[]) => void;
    setAnalysisResults: (issues: AnalysisIssue[]) => void; // New action
    reset: () => void;
    setActiveTab: (tab: WoznyState['activeTab']) => void;
    updateCell: (rowIndex: number, columnId: string, value: string) => void;
    autoFormat: () => void;
    removeRow: (rowIndex: number) => void;
    resolveDuplicates: () => void;
}

export const useWoznyStore = create<WoznyState>()(
    immer((set) => ({
        rawRows: [],
        rows: [],
        columns: [],
        fileName: null,
        issues: [],
        activeTab: 'upload',
        isAnalyzing: false,



        setCsvData: (fileName, data, columns) =>
            set((state) => {
                state.fileName = fileName;
                state.rawRows = data;
                state.rows = data;
                state.columns = columns;

                // Run Immediate Deterministic Analysis
                const autoIssues = runDeterministicAnalysis(data, columns);
                state.issues = autoIssues;

                state.activeTab = 'report';
            }),

        setAnalysisResults: (issues) =>
            set((state) => {
                state.issues = issues;
            }),

        reset: () =>
            set((state) => {
                state.rawRows = [];
                state.rows = [];
                state.columns = [];
                state.issues = [];
                state.fileName = null;
                state.activeTab = 'upload';
                state.isAnalyzing = false;
            }),

        setActiveTab: (tab) =>
            set((state) => {
                state.activeTab = tab;
            }),

        updateCell: (rowIndex, columnId, value) =>
            set((state) => {
                if (state.rows[rowIndex]) {
                    // 1. Update the Data
                    state.rows[rowIndex][columnId] = value;

                    // 2. Re-Run Analysis (Reactive)
                    // We run the full analysis so that global issues (like Duplicates) 
                    // are resolved for ALL affected rows, not just the edited one.
                    // This is fast enough for <100k rows in a browser.
                    state.issues = runDeterministicAnalysis(state.rows, state.columns);
                }
            }),

        autoFormat: () =>
            set((state) => {
                // 1. Apply Auto-Fix to ALL rows
                state.rows = state.rows.map(row => autoFixRow(row, state.columns));

                // 2. Re-Run Analysis to clear Formatting issues
                state.issues = runDeterministicAnalysis(state.rows, state.columns);
            }),

        removeRow: (rowIndex) =>
            set((state) => {
                if (rowIndex >= 0 && rowIndex < state.rows.length) {
                    // Splice the row out
                    state.rows.splice(rowIndex, 1);

                    // Re-run analysis
                    state.issues = runDeterministicAnalysis(state.rows, state.columns);
                }
            }),

        resolveDuplicates: () =>
            set((state) => {
                // Strategy: 
                // 1. Identify all rows marked as "DUPLICATE" (suggested as Copy).
                //    Wait, our analysis flags ALL involved rows.
                // 2. We need to Group them by "Fingerprint" and keep the first one.
                // 3. Easier: run the same logic as analysis but filter out rows.

                // Let's use the current `issues` list to find Duplicates? 
                // No, issues list might be stable but we need to know WHICH ones are safe to delete.
                // Re-running logic is safer.

                // Set of rows to DELETE (Indices)
                const rowsToDelete = new Set<number>();

                const exactMap = new Map<string, number[]>();
                const columns = state.columns;

                state.rows.forEach((row, rowIndex) => {
                    const fingerprint = columns
                        .map(col => String(row[col] || '').trim().toLowerCase())
                        .join('|');

                    if (exactMap.has(fingerprint)) {
                        // This is a duplicate (Start from 2nd text)
                        rowsToDelete.add(rowIndex);
                    } else {
                        exactMap.set(fingerprint, [rowIndex]);
                    }
                });

                // Now Filter
                // IMPORTANT: Filter creates a new array. Immer requires mutation or return.
                state.rows = state.rows.filter((_, idx) => !rowsToDelete.has(idx));

                // Re-Analyze
                state.issues = runDeterministicAnalysis(state.rows, state.columns);
            }),
    }))
);
