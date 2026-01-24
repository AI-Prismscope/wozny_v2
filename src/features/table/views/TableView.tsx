'use client';

import React from 'react';
import { useWoznyStore } from '@/lib/store/useWoznyStore';
import { DataGrid } from '@/shared/DataGrid';

export const TableView = () => {
    const rows = useWoznyStore((state) => state.rows);
    const columns = useWoznyStore((state) => state.columns);
    const fileName = useWoznyStore((state) => state.fileName);
    const setActiveTab = useWoznyStore((state) => state.setActiveTab);

    if (rows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-neutral-500 dark:text-neutral-400">
                <p className="text-lg font-medium">No data yet</p>
                <p className="text-sm">Upload a CSV file to view data.</p>
                <button
                    onClick={() => setActiveTab('upload')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                    Go to Upload
                </button>
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-neutral-500">
                No data loaded. <button onClick={() => setActiveTab('upload')} className="ml-2 text-blue-400 hover:underline">Go to Upload</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300">
            {/* Toolbar / Info Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm z-20">
                <div>
                    <h2 className="text-lg font-semibold text-white">{fileName}</h2>
                    <p className="text-sm text-neutral-400">
                        {rows.length.toLocaleString()} Rows x {columns.length} Columns
                    </p>
                </div>
                <div className="flex gap-4">
                    {/* Placeholder for future action buttons */}
                    <button
                        onClick={() => setActiveTab('upload')} // For now, allow "Back" to upload
                        className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
                    >
                        Back to Upload
                    </button>
                    <button
                        // Trigger Analysis
                        onClick={() => setActiveTab('analysis')}
                        className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-lg shadow-blue-500/20 transition-all"
                    >
                        Analyze Data
                    </button>
                </div>
            </div>

            {/* Grid Container */}
            <div className="flex-1 overflow-hidden p-6 pb-0">
                <DataGrid
                    data={rows}
                    columns={columns}
                    className="shadow-2xl"
                />
            </div>
        </div>
    );
};
