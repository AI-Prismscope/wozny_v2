'use client';

import React, { useState, useMemo } from 'react';
import { useWoznyStore } from '@/lib/store/useWoznyStore';
import { DataGrid } from '@/shared/DataGrid';
import { AlertTriangle, Ban, FileText, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

export const WorkshopView = () => {
    const rows = useWoznyStore((state) => state.rows);
    const columns = useWoznyStore((state) => state.columns);
    const issues = useWoznyStore((state) => state.issues);
    const updateCell = useWoznyStore((state) => state.updateCell);
    const setActiveTab = useWoznyStore((state) => state.setActiveTab);

    const [filterType, setFilterType] = useState<'ALL' | 'MISSING' | 'FORMAT' | 'DUPLICATE'>('ALL');

    // Counts
    const counts = useMemo(() => ({
        MISSING: issues.filter(i => i.issueType === 'MISSING').length,
        FORMAT: issues.filter(i => i.issueType === 'FORMAT').length,
        DUPLICATE: issues.filter(i => i.issueType === 'DUPLICATE').length,
    }), [issues]);

    // Filter Logic
    // We need to show only rows that have the specific issue type
    const filteredRows = useMemo(() => {
        if (filterType === 'ALL') return rows;

        // Find row IDs that match the filter
        const rowIdsWithIssue = new Set(
            issues.filter(i => i.issueType === filterType).map(i => i.rowId)
        );

        // We map over original rows to preserve index integrity for updates? 
        // No, DataGrid uses index. If we filter, index changes.
        // Solution: DataGrid needs to know the "Original Index" or we need to pass a subset.
        // For MVP, passing subset works visually, but updates need to map back to original index.
        // Hack: We attach original index to the row object? Or just filter by index.

        return rows.map((r, i) => ({ ...r, _originalIndex: i.toString() })) // Convert to string to satisfy RowData
            .filter((r) => rowIdsWithIssue.has(Number(r._originalIndex))) as unknown as any[];

    }, [rows, issues, filterType]);

    return (
        <div className="flex h-full animate-in fade-in">
            {/* Sidebar */}
            <div className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col">
                <div className="p-6 border-b border-neutral-800">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">The Workshop</h2>
                    <p className="text-xs text-neutral-500 mt-1">Remediation Console</p>
                </div>

                <div className="flex-1 p-4 space-y-2">
                    <FilterButton
                        active={filterType === 'ALL'}
                        label="All Data"
                        count={rows.length}
                        onClick={() => setFilterType('ALL')}
                        icon={<FileText className="w-4 h-4" />}
                    />
                    <FilterButton
                        active={filterType === 'MISSING'}
                        label="Missing Values"
                        count={counts.MISSING}
                        onClick={() => setFilterType('MISSING')}
                        color="text-red-400"
                        icon={<Ban className="w-4 h-4" />}
                    />
                    <FilterButton
                        active={filterType === 'FORMAT'}
                        label="Formatting"
                        count={counts.FORMAT}
                        onClick={() => setFilterType('FORMAT')}
                        color="text-yellow-500"
                        icon={<AlertTriangle className="w-4 h-4" />}
                    />
                    <FilterButton
                        active={filterType === 'DUPLICATE'}
                        label="Duplicates"
                        count={counts.DUPLICATE}
                        onClick={() => setFilterType('DUPLICATE')}
                        color="text-blue-400"
                        icon={<FileText className="w-4 h-4" />}
                    />
                </div>

                <div className="p-4 border-t border-neutral-800">
                    <button
                        onClick={() => setActiveTab('diff')} // Go to Step 6
                        className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Review & Export
                    </button>
                </div>
            </div>

            {/* Main Grid */}
            <div className="flex-1 p-0 overflow-hidden bg-neutral-900/50">
                <DataGrid
                    data={filteredRows}
                    columns={columns}
                    // We need to handle updates mapping back to original index
                    onCellClick={(idx, col, val) => {
                        const row = filteredRows[idx] as any; // Using 'any' for simplicity, but RowData & { _originalIndex?: string } is more precise
                        const realIdx = row._originalIndex ? parseInt(row._originalIndex) : idx;
                        const newVal = prompt("Edit Cell:", val);
                        if (newVal !== null) {
                            updateCell(realIdx, col, newVal);
                        }
                    }}
                />
            </div>
        </div>
    );
};

// Helper Component
function FilterButton({ active, label, count, onClick, icon, color }: any) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "w-full flex items-center justify-between px-3 py-2 rounded-md transition-all text-sm",
                active ? "bg-neutral-800 text-white shadow-sm" : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
            )}
        >
            <div className={clsx("flex items-center gap-2", color)}>
                {icon}
                <span className={active ? "font-medium" : ""}>{label}</span>
            </div>
            <span className="bg-neutral-900 px-2 py-0.5 rounded text-xs border border-neutral-800">{count}</span>
        </button>
    )
}
