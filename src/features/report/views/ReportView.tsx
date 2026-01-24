'use client';

import React from 'react';
import { useWoznyStore } from '@/lib/store/useWoznyStore';
import { CheckCircle2, AlertTriangle, FileText, Ban } from 'lucide-react';
import { EmptyState } from '@/shared/EmptyState';

export const ReportView = () => {
    const fileName = useWoznyStore((state) => state.fileName);
    const rows = useWoznyStore((state) => state.rows);
    const setActiveTab = useWoznyStore((state) => state.setActiveTab);

    if (rows.length === 0) {
        return <EmptyState description="Upload a CSV file to generate a report." />;
    }

    // MOCK STATS (To be replaced by real analysis data in Store)
    const stats = {
        healthScore: 'B+',
        missingCount: 15,
        formattingCount: 23,
        duplicateCount: 30,
        summary: "This dataset appears to be a **Sales Ledger** from Q3 2023. It contains customer contact details and transaction amounts. Primary issues involve inconsistent Date formats and missing email addresses."
    };

    return (
        <div className="p-8 max-w-5xl mx-auto h-full overflow-auto animate-in fade-in slide-in-from-bottom-4">

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Executive Report</h1>
                    <p className="text-neutral-500 dark:text-neutral-400">Analysis for <span className="text-neutral-700 dark:text-neutral-200 font-mono">{fileName}</span></p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Health Score</p>
                        <p className="text-4xl font-bold text-green-400">{stats.healthScore}</p>
                    </div>
                    <div className="w-16 h-16 rounded-full border-4 border-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-xl shadow-sm dark:shadow-none">
                    <div className="flex items-center gap-3 mb-2 text-yellow-600 dark:text-yellow-500">
                        <AlertTriangle className="w-5 h-5" />
                        <h3 className="font-semibold">Formatting Issues</h3>
                    </div>
                    <p className="text-3xl font-bold text-neutral-900 dark:text-white">{stats.formattingCount}</p>
                    <p className="text-sm text-neutral-500">Inconsistent dates/phones</p>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-xl shadow-sm dark:shadow-none">
                    <div className="flex items-center gap-3 mb-2 text-red-500 dark:text-red-400">
                        <Ban className="w-5 h-5" />
                        <h3 className="font-semibold">Missing Values</h3>
                    </div>
                    <p className="text-3xl font-bold text-neutral-900 dark:text-white">{stats.missingCount}</p>
                    <p className="text-sm text-neutral-500">Empty cells detected</p>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-xl shadow-sm dark:shadow-none">
                    <div className="flex items-center gap-3 mb-2 text-blue-500 dark:text-blue-400">
                        <FileText className="w-5 h-5" />
                        <h3 className="font-semibold">Duplicates</h3>
                    </div>
                    <p className="text-3xl font-bold text-neutral-900 dark:text-white">{stats.duplicateCount}</p>
                    <p className="text-sm text-neutral-500">Row collisions</p>
                </div>
            </div>

            {/* Narrative Summary */}
            <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 p-8 rounded-xl mb-8 shadow-sm dark:shadow-none">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">AI Narrative Analysis</h3>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed text-lg">
                    {stats.summary}
                </p>
            </div>

            {/* Action Bar */}
            <div className="flex justify-end gap-4">
                <button
                    onClick={() => setActiveTab('table')}
                    className="px-6 py-3 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                    View Raw Data
                </button>
                <button
                    onClick={() => setActiveTab('workshop')} // Need to implement workshop next
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
                >
                    Enter Workshop (Fix Issues)
                </button>
            </div>

        </div>
    );
};
