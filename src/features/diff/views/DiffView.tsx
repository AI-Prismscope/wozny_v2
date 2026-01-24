'use client';

import React from 'react';
import { useWoznyStore } from '@/lib/store/useWoznyStore';
import { DataGrid } from '@/shared/DataGrid';
import { Download, ArrowRight } from 'lucide-react';
import Papa from 'papaparse';
import { EmptyState } from '@/shared/EmptyState';

export const DiffView = () => {
    const rawRows = useWoznyStore((state) => state.rawRows);
    const rows = useWoznyStore((state) => state.rows);
    const columns = useWoznyStore((state) => state.columns);
    const fileName = useWoznyStore((state) => state.fileName);
    const setActiveTab = useWoznyStore((state) => state.setActiveTab);

    if (rows.length === 0) {
        return <EmptyState description="Upload a CSV file to export results." />;
    }

    const sourceRef = React.useRef<HTMLDivElement>(null);
    const cleanRef = React.useRef<HTMLDivElement>(null);
    const isScrolling = React.useRef(false);

    // Synchronize Scroll
    React.useEffect(() => {
        const sourceCtx = sourceRef.current;
        const cleanCtx = cleanRef.current;

        if (!sourceCtx || !cleanCtx) return;

        const handleScroll = (e: Event) => {
            if (isScrolling.current) return;
            isScrolling.current = true;

            const target = e.target as HTMLDivElement;
            const other = target === sourceCtx ? cleanCtx : sourceCtx;

            other.scrollTop = target.scrollTop;
            other.scrollLeft = target.scrollLeft;

            // Reset lock after frame
            requestAnimationFrame(() => {
                isScrolling.current = false;
            });
        };

        sourceCtx.addEventListener('scroll', handleScroll);
        cleanCtx.addEventListener('scroll', handleScroll);

        return () => {
            sourceCtx.removeEventListener('scroll', handleScroll);
            cleanCtx.removeEventListener('scroll', handleScroll);
        };
    }, [rows]); // Re-attach if data changes (e.g. upload new file)

    const handleExport = () => {
        const csv = Papa.unparse(rows);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Cleaned_${fileName || 'data.csv'}`;
        link.click();
    };

    return (
        <div className="h-full flex flex-col animate-in fade-in">
            {/* Header / Actions */}
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                <div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Review & Export</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Compare original vs cleaned data</p>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg shadow-green-500/20 transition-all hover:scale-105"
                >
                    <Download className="w-5 h-5" />
                    Download Cleaned CSV
                </button>
            </div>

            {/* Split View (Top/Bottom) */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Original */}
                <div className="flex-1 flex flex-col border-b border-neutral-200 dark:border-neutral-800 min-h-0">
                    <div className="p-2 bg-neutral-100 dark:bg-neutral-900/50 text-center text-xs font-mono text-neutral-500 uppercase tracking-widest border-b border-neutral-200 dark:border-neutral-800">
                        Original Source
                    </div>
                    <div className="flex-1 overflow-hidden opacity-75">
                        <DataGrid ref={sourceRef} data={rawRows} columns={columns} />
                    </div>
                </div>

                {/* Arrow Divider */}
                <div className="h-8 bg-white dark:bg-neutral-950 flex items-center justify-center border-b border-neutral-200 dark:border-neutral-800 z-10">
                    <ArrowRight className="text-neutral-400 dark:text-neutral-700 rotate-90" />
                </div>

                {/* Cleaned */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/10 text-center text-xs font-mono text-blue-600 dark:text-blue-400 uppercase tracking-widest border-b border-neutral-200 dark:border-neutral-800">
                        Cleaned Output
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <DataGrid ref={cleanRef} data={rows} columns={columns} />
                    </div>
                </div>
            </div>
        </div>
    );
};
