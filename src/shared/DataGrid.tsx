'use client';

import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { RowData } from '@/lib/store/useWoznyStore';
import clsx from 'clsx';

interface DataGridProps {
    data: RowData[];
    columns: string[];
    className?: string;
    onCellClick?: (rowIndex: number, columnId: string, value: string) => void;
    issueMap?: Record<number, Record<string, string>>; // New Prop
}

export const DataGrid = React.forwardRef<HTMLDivElement, DataGridProps>(({ data, columns, className, onCellClick, issueMap }, ref) => {
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
                </div>

                {/* Virtualized Rows */}
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = data[virtualRow.index];
                    // IMPORTANT: The issueMap is keyed by the *filtered* list index because that is what we are rendering?
                    // NO. The issueMap we built in WorkshopView is keyed by the *original rowId*.
                    // The 'data' passed here IS the filtered list.
                    // But 'data' lacks the original index.
                    // ISSUE: We passed 'issueMap' keyed by ORIGINAL index, but we don't know the original index here.

                    // SOLUTION FOR V1: 
                    // To avoid massive refactor of passing {row, index} objects, 
                    // We will ASSUME for now that this 'issueMap' logic only works perfeclty when NOT filtered (Total view),
                    // OR we need to lookup the issue by content/fingerprint? No that's slow.

                    // WAIT. 
                    // In WorkshopView, I passed `filteredRows` and `issueMap`.
                    // But `filteredRows` is just an array of `rows`. It lost its ID.

                    // HOT FIX:
                    // Color highlighting relies on us knowing if THIS SPECIFIC row has an issue.
                    // We can check if *any* value in this row matches the issue heuristics AGAIN? No, double logic.

                    // BETTER FIX:
                    // The DataGrid doesn't know "Who am I?".
                    // Let's pass the issueType as a DIRECT PROPERTY of the cell value? No, strings only.

                    // OK, let's step back.
                    // The 'issueMap' from WorkshopView was keyed by `rowId`.
                    // But `rowId` assumes we know the index in the master `rows` array.
                    // When we map over `filteredRows`, `virtualRow.index` is 0, 1, 2... of the FILTERED list.

                    // Correct approach:
                    // The `issueMap` passed to DataGrid SHOULD be keyed by the INDICES OF THE PASSED DATA.
                    // So `WorkshopView` needs to re-key the map to match the filtered subset indices.

                    // I will implement the consumer side here assuming `issueMap[virtualRow.index]` is the source of truth.
                    // Then I will fix the producer (WorkshopView) to remap the keys.

                    const rowIssues = issueMap ? issueMap[virtualRow.index] : {};

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
                                "flex items-center text-sm border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors",
                                virtualRow.index % 2 === 0 ? "bg-white dark:bg-neutral-900/50" : "bg-neutral-50/50 dark:bg-neutral-900"
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
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
DataGrid.displayName = 'DataGrid';
