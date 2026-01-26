'use client';

import React from 'react';
import { useWoznyStore } from '@/lib/store/useWoznyStore';
import { CheckCircle2, AlertTriangle, FileText, Ban } from 'lucide-react';

export const ReportView = () => {
    const fileName = useWoznyStore((state) => state.fileName);
    const rows = useWoznyStore((state) => state.rows);
    const setActiveTab = useWoznyStore((state) => state.setActiveTab);
    const issues = useWoznyStore((state) => state.issues);
    const ignoredColumns = useWoznyStore((state) => state.ignoredColumns);
    const toggleIgnoreColumn = useWoznyStore((state) => state.toggleIgnoreColumn);

    // Calculate Stats
    const stats = React.useMemo(() => {
        // Filter out ignored columns
        const activeIssues = issues.filter(i => !ignoredColumns.includes(i.column));

        const missing = activeIssues.filter(i => i.issueType === 'MISSING');
        const format = activeIssues.filter(i => i.issueType === 'FORMAT');
        const duplicate = activeIssues.filter(i => i.issueType === 'DUPLICATE');
        const total = activeIssues.length;

        // Analyze specific columns
        const formatColumnsList = [...new Set(format.map(i => i.column))];
        const missingColumns = [...new Set(missing.map(i => i.column))].slice(0, 3).join(", ");

        // Simple Health Score
        const cellCount = Math.max(rows.length * Object.keys(rows[0] || {}).length, 1);
        const ratio = 1 - (total / cellCount);
        let grad = 'F';
        if (ratio > 0.9) grad = 'A';
        else if (ratio > 0.8) grad = 'B';
        else if (ratio > 0.7) grad = 'C';
        else if (ratio > 0.6) grad = 'D';

        // Default Narrative (Deterministic)
        let narrative = `Analysis complete. Found ${total} issues across ${rows.length} rows. `;
        if (total === 0) {
            narrative += "The dataset appears clean.";
        } else {
            if (missing.length > 0) narrative += `Data is missing primarily in: [${missingColumns}]. `;
            if (format.length > 0) narrative += `Formatting inconsistencies detected in: [${formatColumnsList.slice(0, 3).join(", ")}].`;
        }

        return {
            healthScore: grad,
            missingCount: missing.length,
            formattingCount: format.length,
            duplicateCount: duplicate.length,
            formatColumnsList, // Return array for UI
            missingLabel: missingColumns ? `Missing in: ${missingColumns}` : "No missing values",
        };
    }, [issues, rows, ignoredColumns]);



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
                    <p className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">{stats.formattingCount}</p>

                    {/* Interactive Badges */}
                    <div className="flex flex-wrap gap-2">
                        {stats.formatColumnsList.map(col => (
                            <button
                                key={col}
                                onClick={() => toggleIgnoreColumn(col)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 text-xs rounded-full transition-colors group"
                                title="Ignore this column to improve score"
                            >
                                {col}
                                <span className="text-yellow-600 dark:text-yellow-400 group-hover:text-yellow-900 dark:group-hover:text-yellow-100">×</span>
                            </button>
                        ))}
                        {stats.formatColumnsList.length === 0 && <span className="text-sm text-neutral-500">No issues</span>}
                    </div>

                </div>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-xl shadow-sm dark:shadow-none">
                    <div className="flex items-center gap-3 mb-2 text-red-500 dark:text-red-400">
                        <Ban className="w-5 h-5" />
                        <h3 className="font-semibold">Missing Values</h3>
                    </div>
                    <p className="text-3xl font-bold text-neutral-900 dark:text-white">{stats.missingCount}</p>
                    <p className="text-sm text-neutral-500 truncate">{stats.missingLabel}</p>
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



            {/* Action Bar */}
            <div className="flex justify-end gap-4">
                <button
                    onClick={() => setActiveTab('workshop')}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
                >
                    Enter Workshop (Fix Issues)
                </button>
            </div>

        </div>
    );
};
