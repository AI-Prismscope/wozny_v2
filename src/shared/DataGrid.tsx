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
}

export const DataGrid = React.forwardRef<HTMLDivElement, DataGridProps>(({ data, columns, className, onCellClick }, ref) => {
    const defaultRef = useRef<HTMLDivElement>(null);
    const parentRef = (ref as React.RefObject<HTMLDivElement>) || defaultRef;

    const rowVirtualizer = useVirtualizer({
        count: data.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 40, // Standard row height
        overscan: 10,
    });

    return (
        <div
            ref={parentRef}
            className={clsx("w-full h-full overflow-auto bg-white dark:bg-neutral-900 border rounded-lg border-neutral-200 dark:border-neutral-800", className)}
        >
            <div
                style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
                className="min-w-max" // Ensure full width scrolling
            >
                {/* Header Row (Sticky) */}
                <div className="sticky top-0 z-10 flex bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 font-medium text-neutral-500 dark:text-neutral-400 text-sm">
                    {columns.map((col) => (
                        <div key={col} className="p-3 w-48 shrink-0 truncate border-r border-neutral-200 dark:border-neutral-800 last:border-r-0">
                            {col}
                        </div>
                    ))}
                </div>

                {/* Virtualized Rows */}
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = data[virtualRow.index];
                    return (
                        <div
                            key={virtualRow.key}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `40px`, // Fixed height matches estimate
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                            className={clsx(
                                "flex items-center text-sm border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors",
                                virtualRow.index % 2 === 0 ? "bg-white dark:bg-neutral-900/50" : "bg-neutral-50/50 dark:bg-neutral-900"
                            )}
                        >
                            {columns.map((col) => {
                                const val = row[col];
                                const isMissing = val === '[MISSING]';
                                return (
                                    <div
                                        key={`${virtualRow.index}-${col}`}
                                        className="w-48 shrink-0 px-3 truncate border-r border-neutral-100 dark:border-neutral-800/50 last:border-r-0 h-full flex items-center"
                                        onClick={() => onCellClick?.(virtualRow.index, col, val)}
                                    >
                                        {isMissing ? (
                                            <span className="text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10 px-2 py-0.5 rounded text-xs italic">
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
