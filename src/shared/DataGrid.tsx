'use client';

import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { RowData } from '@/lib/store/useWoznyStore';
import clsx from 'clsx';

import { Trash2, Eye, EyeOff, Scissors } from 'lucide-react';

interface DataGridProps {
    data: RowData[];
    columns: string[];
    className?: string;
    onCellClick?: (rowIndex: number, columnId: string, value: string) => void;
    onDeleteRow?: (rowIndex: number) => void;
    issueMap?: Record<number, Record<string, string>>;
    rowStateMap?: Record<number, 'DUPLICATE' | 'MULTIPLE' | 'Loading'>;
    ignoredColumns?: string[];
    onToggleIgnore?: (col: string) => void;
    onSplitColumn?: (col: string) => void;
    splittableColumns?: Record<string, 'ADDRESS' | 'NAME' | 'NONE'>;
    columnWidths?: Record<string, number>;
}

export const DataGrid = React.forwardRef<HTMLDivElement, DataGridProps>(({
    data, columns, className, onCellClick, onDeleteRow, issueMap, rowStateMap,
    ignoredColumns = [], onToggleIgnore, onSplitColumn, splittableColumns = {}, columnWidths = {}
}, ref) => {
    const defaultRef = useRef<HTMLDivElement>(null);
    const parentRef = (ref as React.RefObject<HTMLDivElement>) || defaultRef;

    const rowVirtualizer = useVirtualizer({
        count: data.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 40,
        overscan: 10,
    });

    const HEADER_HEIGHT = 56;

    // Smart Column Sizing Heuristic
    const getColumnWidth = (col: string) => {
        // Source of Truth: Store-calculated dynamic widths
        if (columnWidths[col]) return columnWidths[col];

        const lower = col.toLowerCase();
        if (lower.includes('address') || lower.includes('description') || lower.includes('note') || lower.includes('summary')) return 320;
        if (lower.includes('email') || lower.includes('url') || lower.includes('link') || lower.includes('title')) return 240;

        // Name Logic
        if (lower.includes('manager')) return 200; // Account Manager usually long
        if (lower === 'name' || lower === 'full name' || lower === 'fullname') return 200;
        if (lower.includes('name')) return 140; // First Name, Last Name -> Narrower

        if (lower.includes('state') || lower.includes('zip') || lower.includes('year') || lower.includes('id') || lower === 'xx') return 100;
        if (lower.includes('phone') || lower.includes('date')) return 140;
        return 180; // Default
    };

    return (
        <div
            ref={parentRef}
            className={clsx("w-full h-full overflow-auto bg-white dark:bg-neutral-900 border rounded-lg border-neutral-200 dark:border-neutral-800", className)}
        >
            <div
                style={{
                    height: `${rowVirtualizer.getTotalSize() + HEADER_HEIGHT}px`,
                    width: '100%',
                    position: 'relative',
                }}
                className="min-w-max"
            >
                {/* Header Row (Sticky) */}
                <div
                    style={{ height: HEADER_HEIGHT }}
                    className="sticky top-0 z-10 flex bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 font-medium text-neutral-500 dark:text-neutral-400 text-sm box-border"
                >
                    {columns.map((col) => {
                        const isIgnored = ignoredColumns.includes(col);
                        const width = getColumnWidth(col);
                        return (
                            <div
                                key={col}
                                style={{ width }}
                                className="shrink-0 border-r border-neutral-200 dark:border-neutral-800 last:border-r-0 flex items-center justify-between px-3 group"
                            >
                                <span className={clsx("whitespace-normal line-clamp-2 leading-tight py-1", isIgnored && "opacity-50 line-through")}>
                                    {col.split('_').join('_\u200B')}
                                </span>

                                {onSplitColumn && splittableColumns[col] && splittableColumns[col] !== 'NONE' && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSplitColumn(col);
                                        }}
                                        className="text-neutral-400 hover:text-purple-600 dark:hover:text-purple-400 p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 mr-1"
                                        title={`Smart Split ${splittableColumns[col] === 'ADDRESS' ? 'Address' : 'Name'}`}
                                    >
                                        <Scissors className="w-4 h-4" />
                                    </button>
                                )}

                                {onToggleIgnore && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleIgnore(col);
                                        }}
                                        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title={isIgnored ? "Restore Column" : "Ignore Column"}
                                    >
                                        {isIgnored ? (
                                            <EyeOff className="w-4 h-4 text-red-500" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                    {onDeleteRow && (
                        <div className="p-3 w-12 shrink-0 border-l border-neutral-200 dark:border-neutral-800 flex items-center justify-center sticky right-0 bg-neutral-100 dark:bg-neutral-900">
                            <span className="sr-only">Actions</span>
                        </div>
                    )}
                </div>

                {/* Virtualized Rows */}
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = data[virtualRow.index];
                    const rowIssues = issueMap ? issueMap[virtualRow.index] : {};
                    const rowState = rowStateMap ? rowStateMap[virtualRow.index] : null;

                    return (
                        <div
                            key={virtualRow.key}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `40px`,
                                transform: `translateY(${virtualRow.start + HEADER_HEIGHT}px)`,
                            }}
                            className={clsx(
                                "flex items-center text-sm border-b border-neutral-100 dark:border-neutral-800 transition-colors",
                                // Row-Level Highlighting Priority
                                rowState === 'DUPLICATE'
                                    ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                    : rowState === 'MULTIPLE'
                                        ? "bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                                        : virtualRow.index % 2 === 0
                                            ? "bg-white dark:bg-neutral-900/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                                            : "bg-neutral-50/50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            )}
                        >
                            {columns.map((col) => {
                                const val = row[col];
                                const isMissing = val?.toString().toUpperCase() === '[MISSING]';
                                const issueType = rowIssues ? rowIssues[col] : null;
                                const width = getColumnWidth(col);

                                return (
                                    <div
                                        key={`${virtualRow.index}-${col}`}
                                        style={{ width }}
                                        className={clsx(
                                            "shrink-0 px-3 truncate border-r border-neutral-100 dark:border-neutral-800/50 last:border-r-0 h-full flex items-center transition-colors",
                                            // Interactive Cursor
                                            onCellClick && "cursor-[cell]",
                                            // Apply Highlight Class
                                            issueType === 'MISSING' && "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 ring-inset ring-1 ring-red-200 dark:ring-red-800",
                                            issueType === 'FORMAT' && "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 ring-inset ring-1 ring-yellow-200 dark:ring-yellow-800",
                                            issueType === 'DUPLICATE' && "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-inset ring-1 ring-blue-200 dark:ring-blue-800"
                                        )}
                                        onClick={() => onCellClick?.(virtualRow.index, col, val)}
                                    >
                                        {isMissing ? (
                                            <span className="text-inherit opacity-75 italic text-xs">
                                                Missing
                                            </span>
                                        ) : (
                                            <span className="text-neutral-700 dark:text-neutral-300">{val}</span>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Action Column */}
                            {onDeleteRow && (
                                <div className="w-12 shrink-0 h-full flex items-center justify-center border-l border-neutral-100 dark:border-neutral-800 sticky right-0 bg-inherit transition-all">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteRow(virtualRow.index);
                                        }}
                                        className="p-1.5 rounded-md hover:bg-red-100 text-neutral-400 hover:text-red-600 transition-colors"
                                        title="Delete Row"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
DataGrid.displayName = 'DataGrid';
