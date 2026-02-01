import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useWoznyStore, RowData } from './useWoznyStore';
import { runDeterministicAnalysis, autoFixRow } from '../data-quality';

export interface AnalysisIssue {
    rowId: number;
    column: string;
    issueType: "FORMAT" | "DUPLICATE" | "MISSING" | "VALIDITY";
    suggestion: string;
}

interface AnalysisState {
    issues: AnalysisIssue[];
    ignoredColumns: string[];
    isAnalyzing: boolean;

    // Actions
    setIssues: (issues: AnalysisIssue[]) => void;
    toggleIgnoreColumn: (columnId: string) => void;
    autoFormat: () => void;
    runAnalysis: () => void;
}

export const useAnalysisStore = create<AnalysisState>()(
    immer((set, get) => ({
        issues: [],
        ignoredColumns: [],
        isAnalyzing: false,

        setIssues: (issues) => set((state) => { state.issues = issues; }),

        toggleIgnoreColumn: (columnId) => set((state) => {
            if (state.ignoredColumns.includes(columnId)) {
                state.ignoredColumns = state.ignoredColumns.filter(c => c !== columnId);
            } else {
                state.ignoredColumns.push(columnId);
            }
        }),

        autoFormat: () => {
            const woznyStore = useWoznyStore.getState();
            const { issues } = get();

            // We need to update the main store rows, but logic is here
            // Option 1: Call a generic updateRows action on WoznyStore
            // Option 2: Compute new rows here and sending them back

            const newRows = woznyStore.rows.map((row, idx) => {
                const rowIssues = issues.filter(i => i.rowId === idx);
                return autoFixRow(row, woznyStore.columns, rowIssues);
            });

            // Update Main Store
            woznyStore.setRows(newRows);

            // Re-run analysis immediately
            get().runAnalysis();
        },

        runAnalysis: () => {
            const { rows, columns } = useWoznyStore.getState();
            // In a real app this might be async / web worker
            const issues = runDeterministicAnalysis(rows, columns);
            set({ issues });
        }
    }))
);

// Subscription: Auto-analyze when rows change
useWoznyStore.subscribe((state, prevState) => {
    if (state.rows !== prevState.rows || state.columns !== prevState.columns) {
        useAnalysisStore.getState().runAnalysis();
    }
});
