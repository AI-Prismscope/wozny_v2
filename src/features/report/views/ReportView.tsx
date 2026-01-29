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
        console.log('ReportView v0.1.1 rendering');
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
            missingColumnsList: [...new Set(missing.map(i => i.column))], // Return array for UI
            missingLabel: missingColumns ? `Missing in: ${missingColumns}` : "No missing values",
        };
    }, [issues, rows, ignoredColumns]);



    return (
        <div className="flex flex-col h-full max-w-6xl mx-auto p-6 overflow-hidden">

            {/* Header */}
            <div className="flex-none flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Executive Report</h1>
                    <div className="flex items-center gap-3">
                        <p className="text-neutral-500 dark:text-neutral-400">Analysis for <span className="text-neutral-700 dark:text-neutral-200 font-mono">{fileName}</span></p>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                            {rows.length.toLocaleString()} Rows × {Object.keys(rows[0] || {}).length} Columns
                        </span>
                    </div>
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

            {/* KPI Cards (Flexible Middle) */}
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

                {/* Formatting Issues Card */}
                <div className="flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-xl shadow-sm dark:shadow-none h-full overflow-hidden">
                    <div className="flex-none flex items-center gap-3 mb-2 text-yellow-600 dark:text-yellow-500">
                        <AlertTriangle className="w-5 h-5" />
                        <h3 className="font-semibold">Formatting Issues</h3>
                    </div>
                    <p className="flex-none text-3xl font-bold text-neutral-900 dark:text-white mb-4">{stats.formattingCount}</p>

                    {/* Scrollable Badges Area */}
                    <div className="flex-1 overflow-y-auto min-h-0 pr-2">
                        <div className="flex flex-wrap gap-2 content-start">
                            {stats.formatColumnsList.map(col => (
                                <button
                                    key={col}
                                    onClick={() => toggleIgnoreColumn(col)}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 text-xs rounded-full transition-colors group shrink-0"
                                    title="Ignore this column to improve score"
                                >
                                    {col}
                                    <span className="text-yellow-600 dark:text-yellow-400 group-hover:text-yellow-900 dark:group-hover:text-yellow-100">×</span>
                                </button>
                            ))}
                            {stats.formatColumnsList.length === 0 && <span className="text-sm text-neutral-500">No issues</span>}
                        </div>
                    </div>
                </div>

                {/* Missing Values Card */}
                <div className="flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-xl shadow-sm dark:shadow-none h-full overflow-hidden">
                    <div className="flex-none flex items-center gap-3 mb-2 text-red-500 dark:text-red-400">
                        <Ban className="w-5 h-5" />
                        <h3 className="font-semibold">Missing Values</h3>
                    </div>
                    <p className="flex-none text-3xl font-bold text-neutral-900 dark:text-white mb-4">{stats.missingCount}</p>

                    {/* Scrollable Badges Area */}
                    <div className="flex-1 overflow-y-auto min-h-0 pr-2">
                        <div className="flex flex-wrap gap-2 content-start">
                            {stats.missingColumnsList.map(col => (
                                <button
                                    key={col}
                                    onClick={() => toggleIgnoreColumn(col)}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-800 dark:text-red-200 text-xs rounded-full transition-colors group shrink-0"
                                    title="Ignore this column to improve score"
                                >
                                    {col}
                                    <span className="text-red-600 dark:text-red-400 group-hover:text-red-900 dark:group-hover:text-red-100">×</span>
                                </button>
                            ))}
                            {stats.missingColumnsList.length === 0 && <span className="text-sm text-neutral-500">No missing values</span>}
                        </div>
                    </div>
                </div>

                {/* Duplicates Card */}
                <div className="flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-xl shadow-sm dark:shadow-none h-full overflow-hidden">
                    <div className="flex-none flex items-center gap-3 mb-2 text-blue-500 dark:text-blue-400">
                        <FileText className="w-5 h-5" />
                        <h3 className="font-semibold">Duplicates</h3>
                    </div>
                    <p className="flex-none text-3xl font-bold text-neutral-900 dark:text-white">{stats.duplicateCount}</p>
                    <div className="flex-1">
                        <p className="text-sm text-neutral-500">Row collisions</p>
                    </div>
                </div>
            </div>

            {/* Footer / Action Bar (Fixed) */}
            <div className="flex-none flex justify-end gap-4 p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-black/20 backdrop-blur-sm -mx-6 -mb-6">
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
