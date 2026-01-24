import React from 'react';
import { useWoznyStore } from '@/lib/store/useWoznyStore';

interface EmptyStateProps {
    title?: string;
    description?: string;
}

export const EmptyState = ({
    title = "No data yet",
    description = "Upload a CSV file to get started."
}: EmptyStateProps) => {
    const setActiveTab = useWoznyStore((state) => state.setActiveTab);

    return (
        <div className="flex flex-col items-center justify-center h-full text-neutral-500 dark:text-neutral-400 animate-in fade-in zoom-in-95 duration-300">
            <p className="text-lg font-medium">{title}</p>
            <p className="text-sm">{description}</p>
            <button
                onClick={() => setActiveTab('upload')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
            >
                Go to Upload
            </button>
        </div>
    );
};
