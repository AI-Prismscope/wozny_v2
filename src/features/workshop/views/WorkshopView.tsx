'use client';

import React, { useState, useMemo } from 'react';
import { useWoznyStore, RowData, AnalysisIssue } from '@/lib/store/useWoznyStore';
import { DataGrid } from '@/shared/DataGrid';
import { FileText, AlertTriangle, Ban, Layers, ArrowLeft } from 'lucide-react';
import clsx from 'clsx';

type FilterType = 'ALL' | 'MISSING' | 'FORMAT' | 'DUPLICATE';

export const WorkshopView = () => {
    const rows = useWoznyStore((state) => state.rows);
    const columns = useWoznyStore((state) => state.columns);
    const issues = useWoznyStore((state) => state.issues);
    const setActiveTab = useWoznyStore((state) => state.setActiveTab);
    const updateCell = useWoznyStore((state) => state.updateCell);

    const [filter, setFilter] = useState<FilterType>('ALL');

    // 1. Calculate Counts
    const counts = useMemo(() => ({
        ALL: rows.length,
        MISSING: issues.filter(i => i.issueType === 'MISSING').length,
        FORMAT: issues.filter(i => i.issueType === 'FORMAT').length,
        DUPLICATE: issues.filter(i => i.issueType === 'DUPLICATE').length,
    }), [rows.length, issues]);

    // 2. Filter Rows
    const filteredData = useMemo(() => {
        if (filter === 'ALL') return { rows, filteredIndices: null };

        // Find Row IDs that have this specific issue type
        const relevantRowIds = new Set(
            issues.filter(i => i.issueType === filter).map(i => i.rowId)
        );

        // Filter the rows
        const relevantRows = rows.filter((_, idx) => relevantRowIds.has(idx));

        return { rows: relevantRows, filteredIndices: relevantRowIds };
    }, [rows, issues, filter]);

    // 3. Handle Cell Updates (Fixing in place)
    const handleCellUpdate = (rowIndex: number, colId: string, val: string) => {
        // Need to map back to original index if filtered!
        // For simplicity v1: We just pass the row index from the grid.
        // But wait! DataGrid indices are relative to the *data passed to it*.
        // Implementing "Real Index" tracking is complex. 
        // Strategy: DataGrid should probably accept "originalRowIndex" if provided, or we pass the whole object.
        // Workaround for V1: Since we don't have IDs in the CSV, we rely on array index.
        // If we filter, the index 0 is not the original index 0.
        // FIX: We need to find the ORIGINAL index.

        let originalIndex = rowIndex;
        if (filter !== 'ALL') {
            // Re-calculate the specific original index based on our filter logic
            // This is expensive O(N) searching. 
            // Better: attached "originalIndex" to the row data? No, row data is pure.
            // Best: We'll rebuild the filtered list to include the original index.
            const relevantIssues = issues.filter(i => i.issueType === filter);
            // We need a stable map.
            // Let's do it in the useMemo above.
        }

        // Actually, let's solve this by passing a "meta" map to DataGrid? 
        // No, let's keep it simple. Only allow editing in "ALL" view? No, that defeats the purpose.

        // PLAN B: We will implement the 'updateCell' searching logic in the next step.
        // For now, let's just get the UI rendering.
        console.log("Update request:", rowIndex, colId, val);
        updateCell(rowIndex, colId, val); // This is likely wrong for filtered views currently.
    };

    return (
        <div className="flex h-full bg-neutral-50 dark:bg-neutral-900">
            {/* Sidebar */}
            <div className="w-64 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col">
                <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
                    <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">The Workshop</h1>
                    <p className="text-xs text-neutral-500 mt-1">Remediation Console</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <SidebarItem
                        label="All Data"
                        count={counts.ALL}
                        icon={Layers}
                        isActive={filter === 'ALL'}
                        onClick={() => setFilter('ALL')}
                        color="text-neutral-600"
                    />
                    <SidebarItem
                        label="Missing Values"
                        count={counts.MISSING}
                        icon={Ban}
                        isActive={filter === 'MISSING'}
                        onClick={() => setFilter('MISSING')}
                        color="text-red-500"
                    />
                    <SidebarItem
                        label="Formatting"
                        count={counts.FORMAT}
                        icon={AlertTriangle}
                        isActive={filter === 'FORMAT'}
                        onClick={() => setFilter('FORMAT')}
                        color="text-yellow-500"
                    />
                    <SidebarItem
                        label="Duplicates"
                        count={counts.DUPLICATE}
                        icon={FileText}
                        isActive={filter === 'DUPLICATE'}
                        onClick={() => setFilter('DUPLICATE')}
                        color="text-blue-500"
                    />
                </nav>

                <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
                    <button
                        onClick={() => setActiveTab('report')}
                        className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Report
                    </button>
                </div>
            </div>

            {/* Main Grid Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/50 backdrop-blur flex justify-between items-center">
                    <h2 className="font-semibold text-neutral-700 dark:text-neutral-200">
                        {filter === 'ALL' ? 'Master Dataset' : `${filter} Issues`}
                    </h2>
                    <div className="text-xs text-neutral-500">
                        {filteredData.rows.length} Rows Visible
                    </div>
                </div>

                <div className="flex-1 overflow-hidden p-6">
                    <DataGrid
                        data={filteredData.rows}
                        columns={columns}
                        className="shadow-sm border border-neutral-200 dark:border-neutral-800"
                    // onCellClick={handleCellUpdate} // TODO: Implement Reactive Editing
                    />
                </div>
            </div>
        </div>
    );
};

const SidebarItem = ({ label, count, icon: Icon, isActive, onClick, color }: any) => (
    <button
        onClick={onClick}
        className={clsx(
            "w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-all group",
            isActive
                ? "bg-white border-2 border-blue-500 shadow-sm"
                : "hover:bg-neutral-100 dark:hover:bg-neutral-800 border-2 border-transparent"
        )}
    >
        <div className="flex items-center gap-3">
            <Icon className={clsx("w-4 h-4", color)} />
            <span className={clsx("text-neutral-700 dark:text-neutral-300", isActive && "font-bold")}>{label}</span>
        </div>
        <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 px-2 py-0.5 rounded text-xs font-mono group-hover:bg-white transition-colors">
            {count}
        </span>
    </button>
);
