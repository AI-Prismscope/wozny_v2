'use client';

import React, { useState, useMemo } from 'react';
import { useWoznyStore, RowData, AnalysisIssue } from '@/lib/store/useWoznyStore';
import { DataGrid } from '@/shared/DataGrid';
import { FileText, AlertTriangle, Ban, Layers, Loader2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import clsx from 'clsx';

type FilterType = 'ALL' | 'MISSING' | 'FORMAT' | 'DUPLICATE' | 'USER_SELECTION';

export const WorkshopView = () => {
    const rows = useWoznyStore((state) => state.rows);
    const columns = useWoznyStore((state) => state.columns);
    const issues = useWoznyStore((state) => state.issues);
    const ignoredColumns = useWoznyStore((state) => state.ignoredColumns);
    const showHiddenColumns = useWoznyStore((state) => state.showHiddenColumns);

    const setActiveTab = useWoznyStore((state) => state.setActiveTab);
    const updateCell = useWoznyStore((state) => state.updateCell);
    const removeRow = useWoznyStore((state) => state.removeRow);
    const resolveDuplicates = useWoznyStore((state) => state.resolveDuplicates);
    const autoFormat = useWoznyStore((state) => state.autoFormat);
    const splitAddressColumn = useWoznyStore((state) => state.splitAddressColumn);

    // Filter Logic:
    // If showHiddenColumns is FALSE, we hide ignored columns from the View entirely.
    const visibleColumns = useMemo(() => {
        if (showHiddenColumns) return columns;
        return columns.filter(c => !ignoredColumns.includes(c));
    }, [columns, ignoredColumns, showHiddenColumns]);


    // Also filter issues to match visible columns
    const visibleIssues = useMemo(() => {
        if (showHiddenColumns) return issues;
        return issues.filter(i => !ignoredColumns.includes(i.column));
    }, [issues, ignoredColumns, showHiddenColumns]);

    // Bulk Edit State
    const userSelection = useWoznyStore((state) => state.userSelection);
    const clearUserSelection = useWoznyStore((state) => state.clearUserSelection);
    const bulkUpdate = useWoznyStore((state) => state.bulkUpdate);

    const [filter, setFilter] = useState<FilterType>(
        // Auto-select tab if arriving with selection
        useWoznyStore.getState().userSelection.length > 0 ? 'USER_SELECTION' : 'ALL'
    );

    const handleRemoveRow = (rowIndex: number) => {
        const globalIndex = globalIndexMap[rowIndex];
        if (globalIndex === undefined) return;
        removeRow(globalIndex);
    };

    // 1. Calculate Counts (Using Visible Issues)
    // NOTE: counts.ALL is unrelated to columns, it's rows.
    const counts = useMemo(() => ({
        ALL: rows.length,
        MISSING: visibleIssues.filter(i => i.issueType === 'MISSING').length,
        FORMAT: visibleIssues.filter(i => i.issueType === 'FORMAT').length,
        DUPLICATE: visibleIssues.filter(i => i.issueType === 'DUPLICATE').length,
        USER_SELECTION: userSelection.length
    }), [rows.length, visibleIssues, userSelection.length]);

    // 2. Filter Rows & Pre-compute Highlights
    const { filteredRows, issueMap, rowStateMap, globalIndexMap } = useMemo(() => {
        // Step A: Determine Rows allowed by Tab Filter
        let relevantRowIds: Set<number> | null = null;
        if (filter !== 'ALL') {
            if (filter === 'USER_SELECTION') {
                relevantRowIds = new Set(userSelection);
            } else {
                relevantRowIds = new Set(
                    visibleIssues.filter(i => i.issueType === filter).map(i => i.rowId)
                );
            }
        }

        // Step B: Get Candidate Indices (Global)
        const candidateIndices: number[] = [];
        rows.forEach((_, idx) => {
            if (relevantRowIds && !relevantRowIds.has(idx)) return;
            candidateIndices.push(idx);
        });

        // Step C: No AI Filter anymore
        let finalIndices = candidateIndices;

        // Step D: Construct Output
        const finalRows: RowData[] = [];
        const map: Record<number, Record<string, string>> = {};
        const stateMap: Record<number, 'DUPLICATE' | 'MULTIPLE'> = {};
        const indexMap: number[] = [];

        finalIndices.forEach((globalIndex, viewIndex) => {
            finalRows.push(rows[globalIndex]);
            indexMap.push(globalIndex);

            // Compute Highlight State for this View Row
            // Use visibleIssues here so ignored column highlights disappear
            const rowIssues = visibleIssues.filter(i => i.rowId === globalIndex);
            if (rowIssues.length > 0) {
                map[viewIndex] = {};
                rowIssues.forEach(issue => {
                    // Only show issues relevant to current view (or all if ALL)
                    // AND ensure the column is actually visible (redundant check but safe)
                    if (visibleColumns.includes(issue.column)) {
                        if (filter === 'ALL' || issue.issueType === filter) {
                            map[viewIndex][issue.column] = issue.issueType;
                        }
                    }
                });

                // Row-Level Status
                if (filter === 'DUPLICATE') stateMap[viewIndex] = 'DUPLICATE';
                else if (filter === 'ALL') {
                    if (rowIssues.length > 1) stateMap[viewIndex] = 'MULTIPLE';
                    else if (rowIssues[0].issueType === 'DUPLICATE') stateMap[viewIndex] = 'DUPLICATE';
                }
            }
        });

        return { filteredRows: finalRows, issueMap: map, rowStateMap: stateMap, globalIndexMap: indexMap };
    }, [rows, visibleIssues, filter, visibleColumns]);

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

    // Bulk Edit Handlers
    const [bulkCol, setBulkCol] = useState("");
    const [bulkVal, setBulkVal] = useState("");

    const handleBulkUpdate = () => {
        if (!bulkCol) return;
        bulkUpdate(userSelection, bulkCol, bulkVal);
        // We don't clear selection or value, allowing multiple edits
    };

    // Split Flow State
    const [splitConfirmation, setSplitConfirmation] = useState<string | null>(null);
    const [isSplitting, setIsSplitting] = useState(false);
    const [splitResult, setSplitResult] = useState<{ success: number; fail: number } | null>(null);

    // Sidebar State
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const handleSplitClick = (col: string) => {
        console.log("✂️ Split Clicked for:", col);
        setSplitConfirmation(col);
    };

    const confirmSplit = async () => {
        if (!splitConfirmation) return;
        const col = splitConfirmation;
        setIsSplitting(true); // Show Loading State

        // Use timeout to let UI render the loading state before blocking
        setTimeout(async () => {
            const result = await splitAddressColumn(col);
            setIsSplitting(false);
            setSplitConfirmation(null);
            setSplitResult(result); // Show Result Modal
        }, 100);
    };

    return (
        <div className="flex h-full bg-neutral-50 dark:bg-neutral-900 relative">
            {/* Sidebar */}
            <div className={clsx(
                "border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col transition-all duration-300",
                isSidebarCollapsed ? "w-16" : "w-64"
            )}>
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between h-[60px]">
                    {!isSidebarCollapsed && (
                        <div>
                            <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">Workshop</h1>
                            <p className="text-xs text-neutral-500">Remediation</p>
                        </div>
                    )}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                    </button>
                </div>

                <nav className="flex-1 p-2 space-y-2">
                    <SidebarItem
                        label="All Data"
                        count={counts.ALL}
                        icon={Layers}
                        isActive={filter === 'ALL'}
                        onClick={() => setFilter('ALL')}
                        color="text-neutral-600"
                        collapsed={isSidebarCollapsed}
                    />
                    <SidebarItem
                        label="Missing Values"
                        count={counts.MISSING}
                        icon={Ban}
                        isActive={filter === 'MISSING'}
                        onClick={() => setFilter('MISSING')}
                        color="text-red-500"
                        collapsed={isSidebarCollapsed}
                    />
                    <SidebarItem
                        label="Formatting"
                        count={counts.FORMAT}
                        icon={AlertTriangle}
                        isActive={filter === 'FORMAT'}
                        onClick={() => setFilter('FORMAT')}
                        color="text-yellow-500"
                        collapsed={isSidebarCollapsed}
                    />

                    {counts.USER_SELECTION > 0 && (
                        <SidebarItem
                            label="User Selection"
                            count={counts.USER_SELECTION}
                            icon={Layers}
                            isActive={filter === 'USER_SELECTION'}
                            onClick={() => setFilter('USER_SELECTION')}
                            color="text-purple-600"
                            collapsed={isSidebarCollapsed}
                        />
                    )}
                    <SidebarItem
                        label="Duplicates"
                        count={counts.DUPLICATE}
                        icon={FileText}
                        isActive={filter === 'DUPLICATE'}
                        onClick={() => setFilter('DUPLICATE')}
                        color="text-blue-500"
                        collapsed={isSidebarCollapsed}
                    />
                </nav>


            </div>

            {/* Main Grid Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/50 backdrop-blur flex justify-between items-center">
                    <h2 className="font-semibold text-neutral-700 dark:text-neutral-200">
                        {filter === 'ALL' ? 'Master Dataset' : `${filter} Issues`}
                    </h2>
                    <div className="flex items-center gap-3">
                        {/* Ask Wozny Search Bar Removed */}

                        {/* Bulk Edit Toolbar */}
                        {filter === 'USER_SELECTION' && (
                            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
                                <span className="text-xs font-medium text-neutral-500 uppercase">Bulk Edit:</span>

                                <select
                                    className="text-xs border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1 bg-white dark:bg-black"
                                    onChange={(e) => setBulkCol(e.target.value)}
                                    value={bulkCol}
                                >
                                    <option value="">Select Column...</option>
                                    {visibleColumns.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>

                                <input
                                    className="text-xs border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1 w-32 bg-white dark:bg-black"
                                    placeholder="New Value"
                                    value={bulkVal}
                                    onChange={(e) => setBulkVal(e.target.value)}
                                />

                                <button
                                    onClick={handleBulkUpdate}
                                    disabled={!bulkCol}
                                    className="text-xs font-bold bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 disabled:opacity-50"
                                >
                                    Apply
                                </button>

                                <div className="h-4 w-px bg-neutral-300 mx-1" />

                                <button
                                    onClick={() => {
                                        clearUserSelection();
                                        setFilter('ALL');
                                    }}
                                    className="text-xs text-red-500 hover:text-red-700 underline"
                                >
                                    Clear Selection
                                </button>
                            </div>
                        )}

                        {filter === 'FORMAT' && (
                            <button
                                onClick={() => autoFormat()}
                                className="text-xs font-medium bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 px-3 py-1.5 rounded-full border border-yellow-200 hover:shadow-sm transition-all flex items-center gap-2"
                            >
                                <span className="text-md">✨</span> Auto-Fix Format Issues
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
                        columns={visibleColumns}
                        issueMap={issueMap}
                        rowStateMap={rowStateMap}
                        columnWidths={useWoznyStore((state) => state.columnWidths)}
                        className="shadow-sm border border-neutral-200 dark:border-neutral-800"
                        onCellClick={filter === 'FORMAT' || filter === 'DUPLICATE' ? undefined : handleCellUpdate}
                        onDeleteRow={filter === 'DUPLICATE' || filter === 'MISSING' ? handleRemoveRow : undefined}
                        // Column Management
                        ignoredColumns={ignoredColumns}
                        onToggleIgnore={useWoznyStore((state) => state.toggleIgnoreColumn)}
                        onSplitColumn={handleSplitClick}
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
            {/* Confirmation Modal for Split */}
            {splitConfirmation && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl p-6 w-full max-w-sm border border-neutral-200 dark:border-neutral-800">
                        <h3 className="text-lg font-bold mb-2 text-neutral-900 dark:text-white">Smart Split Column?</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                            This will split <strong>"{splitConfirmation}"</strong> into 4 new columns:
                            <br />
                            <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">Street</code>,
                            <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">City</code>,
                            <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">State</code>,
                            <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">Zip</code>
                        </p>

                        {isSplitting ? (
                            <div className="flex flex-col items-center justify-center py-4 space-y-3">
                                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                                <span className="text-sm font-medium text-neutral-500">Processing Pattern Match...</span>
                            </div>
                        ) : (
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setSplitConfirmation(null)}
                                    className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmSplit}
                                    className="px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2"
                                >
                                    <Layers className="w-4 h-4" />
                                    Confirm Split
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Result Modal */}
            {splitResult && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl p-6 w-full max-w-sm border border-neutral-200 dark:border-neutral-800 text-center">
                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold mb-2 text-neutral-900 dark:text-white">Split Complete!</h3>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">{splitResult.success}</div>
                                <div className="text-xs text-green-700 uppercase font-bold">Success</div>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                                <div className="text-2xl font-bold text-amber-600">{splitResult.fail}</div>
                                <div className="text-xs text-amber-700 uppercase font-bold">Review</div>
                            </div>
                        </div>
                        <button
                            onClick={() => setSplitResult(null)}
                            className="w-full px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const SidebarItem = ({ label, count, icon: Icon, isActive, onClick, color, collapsed }: any) => (
    <button
        onClick={onClick}
        className={clsx(
            "w-full flex items-center p-2 rounded-lg text-sm font-medium transition-all group relative",
            collapsed ? "justify-center" : "justify-between",
            isActive
                ? "bg-white border-2 border-blue-500 shadow-sm"
                : "hover:bg-neutral-100 dark:hover:bg-neutral-800 border-2 border-transparent"
        )}
        title={collapsed ? `${label} (${count})` : undefined}
    >
        <div className={clsx("flex items-center gap-3", collapsed && "justify-center")}>
            <Icon className={clsx("w-5 h-5 shrink-0", color)} />
            {!collapsed && <span className={clsx("text-neutral-700 dark:text-neutral-300", isActive && "font-bold")}>{label}</span>}
        </div>
        {!collapsed && (
            <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 px-2 py-0.5 rounded text-xs font-mono group-hover:bg-white transition-colors">
                {count}
            </span>
        )}
        {collapsed && isActive && (
            <div className="absolute right-1 top-1 w-2 h-2 bg-blue-500 rounded-full" />
        )}
    </button>
);
