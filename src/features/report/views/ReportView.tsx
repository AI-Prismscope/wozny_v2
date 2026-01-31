
'use client';

import React, { useState } from 'react';
import { useWoznyStore } from '@/lib/store/useWoznyStore';
import { CheckCircle2, AlertTriangle, FileText, Ban, Sparkles, Layout } from 'lucide-react';
import { SmartAnalysisView } from './SmartAnalysisView';

type ViewMode = 'missing' | 'formatting' | 'duplicates' | 'smart';

export const ReportView = () => {
    const fileName = useWoznyStore((state) => state.fileName);
    const rows = useWoznyStore((state) => state.rows);
    const issues = useWoznyStore((state) => state.issues);
    const ignoredColumns = useWoznyStore((state) => state.ignoredColumns);
    const toggleIgnoreColumn = useWoznyStore((state) => state.toggleIgnoreColumn);
    const setActiveTab = useWoznyStore((state) => state.setActiveTab);

    const [activeView, setActiveView] = useState<ViewMode>('missing');

    // Calculate Stats
    const stats = React.useMemo(() => {
        const activeIssues = issues.filter(i => !ignoredColumns.includes(i.column));
        const missing = activeIssues.filter(i => i.issueType === 'MISSING');
        const format = activeIssues.filter(i => i.issueType === 'FORMAT');
        const duplicate = activeIssues.filter(i => i.issueType === 'DUPLICATE');
        const total = activeIssues.length;

        const cellCount = Math.max(rows.length * Object.keys(rows[0] || {}).length, 1);
        const ratio = 1 - (total / cellCount);
        let grad = 'F';
        if (ratio > 0.9) grad = 'A';
        else if (ratio > 0.8) grad = 'B';
        else if (ratio > 0.7) grad = 'C';
        else if (ratio > 0.6) grad = 'D';

        return {
            healthScore: grad,
            missingCount: missing.length,
            formattingCount: format.length,
            duplicateCount: duplicate.length,
            missingList: missing,
            formatList: format,
            formatColumns: [...new Set(format.map(i => i.column))],
            missingColumns: [...new Set(missing.map(i => i.column))]
        };
    }, [issues, rows, ignoredColumns]);

    const renderIssueContent = () => {
        if (activeView === 'smart') {
            return <SmartAnalysisView />;
        }

        let title = '';
        let count = 0;
        let columns: string[] = [];
        let color = '';
        let list: any[] = [];

        if (activeView === 'missing') {
            title = 'Missing Values';
            count = stats.missingCount;
            columns = stats.missingColumns;
            color = 'text-red-500';
            list = stats.missingList;
        } else if (activeView === 'formatting') {
            title = 'Formatting Issues';
            count = stats.formattingCount;
            columns = stats.formatColumns;
            color = 'text-yellow-600';
            list = stats.formatList;
        } else if (activeView === 'duplicates') {
            title = 'Duplicates';
            count = stats.duplicateCount;
            color = 'text-blue-500';
        }

        return (
            <div className="h-full flex flex-col p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className={`text-2xl font-bold ${color} mb-1`}>{title}</h2>
                        <p className="text-4xl font-bold text-neutral-900 dark:text-white">
                            {count} <span className="text-lg font-normal text-neutral-400">issues</span>
                        </p>
                    </div>
                </div>

                {/* Column Breakdown (if applicable) */}
                {columns.length > 0 && (
                    <div className="flex-1 overflow-y-auto">
                        <h3 className="text-sm font-semibold uppercase text-neutral-500 mb-3 tracking-wider">Affected Columns</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {columns.map(col => {
                                const countForCol = list.filter(i => i.column === col).length;
                                return (
                                    <div key={col} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg group">
                                        <span className="font-medium">{col}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-neutral-400">{countForCol} issues</span>
                                            <button
                                                onClick={() => toggleIgnoreColumn(col)}
                                                className="text-xs px-2 py-1 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded text-neutral-600 dark:text-neutral-300 transition-colors"
                                            >
                                                Ignore
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {count === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-neutral-400">
                        <CheckCircle2 className="w-12 h-12 mb-4 opacity-50" />
                        <p>No issues found in this category.</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex h-full bg-white dark:bg-black">
            {/* Sidebar (Master) */}
            <div className="w-64 flex-none border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/20 flex flex-col">
                <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
                    <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Executive Report</h1>
                    <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-mono text-neutral-500 break-all leading-tight" title={fileName || ''}>{fileName}</span>
                            <span className={`text-2xl font-bold leading-none ${stats.healthScore === 'A' ? 'text-green-500' : stats.healthScore === 'F' ? 'text-red-500' : 'text-yellow-500'}`}>
                                {stats.healthScore}
                            </span>
                        </div>
                        <div className="inline-flex items-center gap-2 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded text-xs font-medium text-neutral-600 dark:text-neutral-400">
                            <Layout className="w-3 h-3" />
                            {rows.length} rows x {useWoznyStore(state => state.columns).length} columns
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-4 space-y-2">
                    <SidebarItem
                        active={activeView === 'missing'}
                        onClick={() => setActiveView('missing')}
                        icon={Ban}
                        label="Missing Values"
                        count={stats.missingCount}
                        color="text-red-500"
                    />
                    <SidebarItem
                        active={activeView === 'formatting'}
                        onClick={() => setActiveView('formatting')}
                        icon={AlertTriangle}
                        label="Formatting"
                        count={stats.formattingCount}
                        color="text-yellow-600"
                    />
                    <SidebarItem
                        active={activeView === 'duplicates'}
                        onClick={() => setActiveView('duplicates')}
                        icon={FileText}
                        label="Duplicates"
                        count={stats.duplicateCount}
                        color="text-blue-500"
                    />

                    <div className="my-4 border-t border-neutral-200 dark:border-neutral-800" />

                    <SidebarItem
                        active={activeView === 'smart'}
                        onClick={() => setActiveView('smart')}
                        icon={Sparkles}
                        label="Smart Analysis"
                        color="text-purple-500"
                    />
                </div>

                <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
                    <button
                        onClick={() => setActiveTab('workshop')}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition-colors text-sm"
                    >
                        Enter Workshop
                    </button>
                </div>
            </div>

            {/* Content (Detail) */}
            <div className="flex-1 min-w-0 bg-white dark:bg-neutral-950">
                {renderIssueContent()}
            </div>
        </div>
    );
};

const SidebarItem = ({ active, onClick, icon: Icon, label, count, color }: any) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${active
            ? 'bg-white dark:bg-neutral-800 shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-700'
            : 'hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50'
            }`}
    >
        <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 ${color}`} />
            <span className={`text-sm font-medium ${active ? 'text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>
                {label}
            </span>
        </div>
        {count !== undefined && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${active ? 'bg-neutral-100 dark:bg-neutral-700' : 'bg-transparent text-neutral-400'}`}>
                {count}
            </span>
        )}
    </button>
);
