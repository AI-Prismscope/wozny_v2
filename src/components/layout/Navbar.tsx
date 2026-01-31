'use client';

import React from 'react';
import { useWoznyStore } from '@/lib/store/useWoznyStore';
import clsx from 'clsx';
import { UploadCloud, Table, FileText, Wrench, Download, Wand2, HelpCircle } from 'lucide-react';

export const Navbar = () => {
    const activeTab = useWoznyStore((state) => state.activeTab);
    const setActiveTab = useWoznyStore((state) => state.setActiveTab);
    const rows = useWoznyStore((state) => state.rows);
    const hasData = rows.length > 0;

    const tabs = [
        { id: 'upload', label: 'Upload', icon: UploadCloud, hidden: false },
        { id: 'report', label: 'Report', icon: FileText, hidden: false },
        { id: 'workshop', label: 'Workshop', icon: Wrench, hidden: false },
        { id: 'ask-wozny', label: 'Ask Wozny', icon: Wand2, hidden: false },
        { id: 'diff', label: 'Review & Export', icon: Download, hidden: false },
        { id: 'about', label: 'About', icon: HelpCircle, hidden: false },
        // Hidden / Deprecated
        { id: 'analysis', label: 'Analysis', icon: FileText, hidden: true },
        { id: 'table', label: 'Table Data', icon: Table, hidden: true },
    ] as const;

    return (
        <nav className="flex items-center space-x-1">
            {tabs.filter(t => !t.hidden).map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative",
                            isActive
                                ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {isActive && (
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-full" />
                        )}
                    </button>
                );
            })}
        </nav>
    );
};
