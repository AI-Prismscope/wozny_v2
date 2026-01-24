import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { runDeterministicAnalysis } from '../data-quality';

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
                    state.rows[rowIndex][columnId] = value;
                    // Reactive Logic: If we fix a cell, we should technically remove the issue for that cell.
                    state.issues = state.issues.filter(i => !(i.rowId === rowIndex && i.column === columnId));
                }
            }),
    }))
);
