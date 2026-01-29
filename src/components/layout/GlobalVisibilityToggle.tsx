'use client';

import React from 'react';
import { useWoznyStore } from '@/lib/store/useWoznyStore';
import { Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

export const GlobalVisibilityToggle = () => {
    const showHiddenColumns = useWoznyStore((state) => state.showHiddenColumns);
    const toggleShowHiddenColumns = useWoznyStore((state) => state.toggleShowHiddenColumns);
    const ignoredCount = useWoznyStore((state) => state.ignoredColumns.length);

    // Don't show if nothing is ignored
    if (ignoredCount === 0) return null;

    return (
        <button
            onClick={toggleShowHiddenColumns}
            className={clsx(
                "p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium",
                showHiddenColumns
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200"
                    : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
            )}
            title={showHiddenColumns ? "Hide ignored columns" : "Show ignored columns"}
        >
            {showHiddenColumns ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>{ignoredCount} Hidden</span>
        </button>
    );
};
