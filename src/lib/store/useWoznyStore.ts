import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type RowData = Record<string, string>;

export interface WoznyState {
    // Data State
    rawRows: RowData[];         // The original immutable copy
    rows: RowData[];            // The working copy (edited)
    columns: string[];          // Header names
    fileName: string | null;

    // App State
    activeTab: 'upload' | 'table' | 'analysis' | 'report' | 'workshop' | 'diff';
    isAnalyzing: boolean;

    // Actions
    setCsvData: (fileName: string, data: RowData[], columns: string[]) => void;
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
        activeTab: 'upload',
        isAnalyzing: false,

        setCsvData: (fileName, data, columns) =>
            set((state) => {
                state.fileName = fileName;
                state.rawRows = data;
                state.rows = data; // Initially same as raw
                state.columns = columns;
                state.activeTab = 'table'; // Auto-navigate to table
            }),

        reset: () =>
            set((state) => {
                state.rawRows = [];
                state.rows = [];
                state.columns = [];
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
                }
            }),
    }))
);
