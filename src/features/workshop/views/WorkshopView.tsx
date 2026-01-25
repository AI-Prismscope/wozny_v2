'use client';

import React, { useState, useMemo } from 'react';
import { useWoznyStore, RowData, AnalysisIssue } from '@/lib/store/useWoznyStore';
import { DataGrid } from '@/shared/DataGrid';
import { FileText, AlertTriangle, Ban, Layers, ArrowLeft, Download } from 'lucide-react';
import clsx from 'clsx';
import { downloadCleanCsv } from '@/lib/export-utils';

type FilterType = 'ALL' | 'MISSING' | 'FORMAT' | 'DUPLICATE';

export const WorkshopView = () => {
    const rows = useWoznyStore((state) => state.rows);
    const columns = useWoznyStore((state) => state.columns);
    const issues = useWoznyStore((state) => state.issues);
    const setActiveTab = useWoznyStore((state) => state.setActiveTab);
    const updateCell = useWoznyStore((state) => state.updateCell);
    const removeRow = useWoznyStore((state) => state.removeRow);
    const resolveDuplicates = useWoznyStore((state) => state.resolveDuplicates);
    const autoFormat = useWoznyStore((state) => state.autoFormat);

    const [filter, setFilter] = useState<FilterType>('ALL');

    const handleRemoveRow = (rowIndex: number) => {
        const globalIndex = globalIndexMap[rowIndex];
        if (globalIndex === undefined) return;
        removeRow(globalIndex);
    };

    // 1. Calculate Counts
    const counts = useMemo(() => ({
        ALL: rows.length,
        MISSING: issues.filter(i => i.issueType === 'MISSING').length,
        FORMAT: issues.filter(i => i.issueType === 'FORMAT').length,
        DUPLICATE: issues.filter(i => i.issueType === 'DUPLICATE').length,
    }), [rows.length, issues]);

    // 2. Filter Rows & Pre-compute Highlights
    const { filteredRows, issueMap, rowStateMap, globalIndexMap } = useMemo(() => {
        // Find Row IDs that have this specific issue type
        let relevantRowIds: Set<number> | null = null;
        if (filter !== 'ALL') {
            relevantRowIds = new Set(
                issues.filter(i => i.issueType === filter).map(i => i.rowId)
            );
        }

        // Filter the rows
        // If ALL, we keep all. If Filtered, we keep only relevant ones.
        const relevantRows = rows.filter((_, idx) => relevantRowIds ? relevantRowIds.has(idx) : true);

        // CREATE MAPPING: Filtered Index -> Global Index
        const map: Record<number, Record<string, string>> = {};
        const stateMap: Record<number, 'DUPLICATE' | 'MULTIPLE'> = {};
        const indexMap: number[] = [];

        let filteredIndex = 0;
        rows.forEach((_, globalIndex) => {
            if (relevantRowIds && !relevantRowIds.has(globalIndex)) return; // Skip if filtered out

            indexMap.push(globalIndex);

            // This global row IS in the filtered list at 'filteredIndex'.
            // Find issues for this global row
            const rowIssues = issues.filter(i => i.rowId === globalIndex);

            if (rowIssues.length > 0) {
                map[filteredIndex] = {};
                rowIssues.forEach(issue => {
                    // EXCLUSIVE FILTERING LOGIC
                    if (filter === 'DUPLICATE') {
                        if (issue.issueType === 'DUPLICATE') {
                            map[filteredIndex][issue.column] = issue.issueType;
                        }
                    }
                    else if (filter === 'FORMAT') {
                        if (issue.issueType === 'FORMAT') {
                            map[filteredIndex][issue.column] = issue.issueType;
                        }
                    }
                    else if (filter === 'MISSING') {
                        if (issue.issueType === 'MISSING') {
                            map[filteredIndex][issue.column] = issue.issueType;
                        }
                    }
                    else {
                        map[filteredIndex][issue.column] = issue.issueType;
                    }
                });

                // --- VISUAL HIERARCHY LOGIC ---
                if (filter === 'DUPLICATE') {
                    stateMap[filteredIndex] = 'DUPLICATE';
                }
                else if (filter === 'ALL') {
                    if (rowIssues.length > 1) {
                        stateMap[filteredIndex] = 'MULTIPLE';
                    } else if (rowIssues[0].issueType === 'DUPLICATE') {
                        stateMap[filteredIndex] = 'DUPLICATE';
                    }
                }
            }

            filteredIndex++;
        });

        return { filteredRows: relevantRows, issueMap: map, rowStateMap: stateMap, globalIndexMap: indexMap };
    }, [rows, issues, filter]);

    // 3. Editing State
    const [editingCell, setEditingCell] = useState<{ globalRowIndex: number, colId: string, currentValue: string } | null>(null);
    const [editValue, setEditValue] = useState("");

    // 4. Handle Cell Click -> Open Modal
    const handleCellUpdate = (rowIndex: number, colId: string, val: string) => {
        const globalIndex = globalIndexMap[rowIndex];
        if (globalIndex === undefined) {
            console.error("Could not find global index for local index", rowIndex);
            return;
        }

        setEditingCell({ globalRowIndex: globalIndex, colId, currentValue: val });
        setEditValue(val);
    };

    const saveEdit = () => {
        if (!editingCell) return;
        updateCell(editingCell.globalRowIndex, editingCell.colId, editValue);
        setEditingCell(null);
    };

    return (
        <div className="flex h-full bg-neutral-50 dark:bg-neutral-900 relative">
            {/* ... Sidebar ... */}

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

                <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
                    <button
                        onClick={() => downloadCleanCsv(rows, columns)}
                        className="w-full flex items-center justify-center gap-2 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-black py-2.5 rounded-lg hover:opacity-90 transition-all shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        Export Clean Data
                    </button>

                    <button
                        onClick={() => setActiveTab('report')}
                        className="flex items-center justify-center w-full gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors py-2"
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
                    <div className="flex items-center gap-3">
                        {filter === 'FORMAT' && (
                            <button
                                onClick={() => autoFormat()}
                                className="text-xs font-medium bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 px-3 py-1.5 rounded-full border border-yellow-200 hover:shadow-sm transition-all flex items-center gap-2"
                            >
                                <span className="text-md">✨</span> Auto-Fix Casing & Phones
                            </button>
                        )}
                        {filter === 'DUPLICATE' && (
                            <button
                                onClick={() => resolveDuplicates()}
                                className="text-xs font-medium bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 px-3 py-1.5 rounded-full border border-blue-200 hover:shadow-sm transition-all flex items-center gap-2"
                            >
                                <span className="text-md">✨</span> Remove All Copies
                            </button>
                        )}
                        <div className="text-xs text-neutral-500">
                            {filteredRows.length} Rows Visible
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden p-6">
                    <DataGrid
                        data={filteredRows}
                        columns={columns}
                        issueMap={issueMap}
                        rowStateMap={rowStateMap}
                        className="shadow-sm border border-neutral-200 dark:border-neutral-800"
                        onCellClick={filter === 'FORMAT' || filter === 'DUPLICATE' ? undefined : handleCellUpdate}
                        onDeleteRow={filter === 'DUPLICATE' || filter === 'MISSING' ? handleRemoveRow : undefined}
                    />
                </div>
            </div>

            {/* Simple Edit Modal Overlay */}
            {editingCell && (
                <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl p-6 w-full max-w-md border border-neutral-200 dark:border-neutral-800">
                        <h3 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">Edit Cell</h3>

                        <div className="mb-4">
                            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Column</label>
                            <div className="text-sm font-mono bg-neutral-100 dark:bg-neutral-800 p-2 rounded">
                                {editingCell.colId}
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Value</label>
                            <input
                                autoFocus
                                className="w-full p-3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setEditingCell(null)}
                                className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveEdit}
                                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
