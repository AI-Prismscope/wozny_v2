'use client';

import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { RowData } from '@/lib/store/useWoznyStore';
import clsx from 'clsx';

import { Trash2 } from 'lucide-react';

interface DataGridProps {
    data: RowData[];
    columns: string[];
    className?: string;
    onCellClick?: (rowIndex: number, columnId: string, value: string) => void;
    onDeleteRow?: (rowIndex: number) => void;
    issueMap?: Record<number, Record<string, string>>;
    rowStateMap?: Record<number, 'DUPLICATE' | 'MULTIPLE' | 'Loading'>;
}

export const DataGrid = React.forwardRef<HTMLDivElement, DataGridProps>(({ data, columns, className, onCellClick, onDeleteRow, issueMap, rowStateMap }, ref) => {
    const defaultRef = useRef<HTMLDivElement>(null);
    const parentRef = (ref as React.RefObject<HTMLDivElement>) || defaultRef;

    const rowVirtualizer = useVirtualizer({
        count: data.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 40,
        overscan: 10,
    });

    const HEADER_HEIGHT = 45;

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
                    {columns.map((col) => (
                        <div key={col} className="p-3 w-48 shrink-0 truncate border-r border-neutral-200 dark:border-neutral-800 last:border-r-0 flex items-center">
                            {col}
                        </div>
                    ))}
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
                                const isMissing = val === '[MISSING]';
                                const issueType = rowIssues ? rowIssues[col] : null;

                                return (
                                    <div
                                        key={`${virtualRow.index}-${col}`}
                                        className={clsx(
                                            "w-48 shrink-0 px-3 truncate border-r border-neutral-100 dark:border-neutral-800/50 last:border-r-0 h-full flex items-center transition-colors",
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
