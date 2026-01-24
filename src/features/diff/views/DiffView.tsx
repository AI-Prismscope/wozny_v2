'use client';

import React from 'react';
import { useWoznyStore } from '@/lib/store/useWoznyStore';
import { DataGrid } from '@/shared/DataGrid';
import { Download, ArrowRight } from 'lucide-react';
import Papa from 'papaparse';

export const DiffView = () => {
    const rawRows = useWoznyStore((state) => state.rawRows);
    const rows = useWoznyStore((state) => state.rows);
    const columns = useWoznyStore((state) => state.columns);
    const fileName = useWoznyStore((state) => state.fileName);

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
            <div className="flex items-center justify-between px-6 py-4 bg-neutral-900 border-b border-neutral-800">
                <div>
                    <h2 className="text-xl font-bold text-white">Review & Export</h2>
                    <p className="text-sm text-neutral-400">Compare original vs cleaned data</p>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg shadow-green-500/20 transition-all hover:scale-105"
                >
                    <Download className="w-5 h-5" />
                    Download Cleaned CSV
                </button>
            </div>

            {/* Split View */}
            <div className="flex-1 flex overflow-hidden">
                {/* Original */}
                <div className="flex-1 flex flex-col border-r border-neutral-800">
                    <div className="p-2 bg-neutral-900/50 text-center text-xs font-mono text-neutral-500 uppercase tracking-widest border-b border-neutral-800">
                        Original Source
                    </div>
                    <div className="flex-1 overflow-hidden pointer-events-none opacity-60 grayscale">
                        <DataGrid data={rawRows} columns={columns} />
                    </div>
                </div>

                {/* Arrow Divider */}
                <div className="w-12 bg-neutral-950 flex items-center justify-center border-r border-neutral-800">
                    <ArrowRight className="text-neutral-700" />
                </div>

                {/* Cleaned */}
                <div className="flex-1 flex flex-col">
                    <div className="p-2 bg-blue-900/10 text-center text-xs font-mono text-blue-400 uppercase tracking-widest border-b border-neutral-800">
                        Cleaned Output
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <DataGrid data={rows} columns={columns} />
                    </div>
                </div>
            </div>
        </div>
    );
};
