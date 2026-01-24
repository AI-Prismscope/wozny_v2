'use client';

import React, { useCallback, useState } from 'react';
import { useWoznyStore } from '@/lib/store/useWoznyStore';
import { parseCsvFile } from '../utils/parser';
import { UploadCloud, FileSpreadsheet, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export const UploadView = () => {
    const setCsvData = useWoznyStore((state) => state.setCsvData);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFile = useCallback(async (file: File) => {
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            setError('Invalid file type. Please upload a .csv file.');
            return;
        }

        setIsParsing(true);
        setError(null);
        try {
            const { data, columns } = await parseCsvFile(file);
            if (data.length > 5000) {
                // Warning or blocking? Spec says "Max 5000 rows approx".
                // We will allow it but warn.
                console.warn('Large file detected');
            }
            setCsvData(file.name, data, columns);
        } catch (e) {
            setError('Failed to parse CSV. Check file format.');
            console.error(e);
        } finally {
            setIsParsing(false);
        }
    }, [setCsvData]);

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const onDragLeave = () => {
        setIsDragOver(false);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 animate-in fade-in duration-500">
            <div className="max-w-xl w-full text-center space-y-8">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tighter bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                        Wozny v2
                    </h1>
                    <p className="text-neutral-600 dark:text-neutral-400">
                        Secure, Private, AI-Powered Data Cleaning.
                    </p>
                </div>

                <div
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    className={clsx(
                        "border-2 border-dashed rounded-3xl p-12 transition-all duration-300 cursor-pointer flex flex-col items-center gap-4 group",
                        isDragOver
                            ? "border-blue-500 bg-blue-500/10 scale-105 shadow-xl shadow-blue-500/20"
                            : "border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    )}
                >
                    <div className="p-4 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 group-hover:scale-110 transition-transform">
                        {isParsing ? (
                            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                        ) : (
                            <UploadCloud className="w-8 h-8 text-neutral-400 group-hover:text-blue-400" />
                        )}
                    </div>
                    <div className="space-y-1">
                        <p className="text-lg font-medium text-neutral-700 dark:text-neutral-200">
                            {isParsing ? "Analyzing file structure..." : "Drop your CSV here"}
                        </p>
                        <p className="text-sm text-neutral-500">
                            or click to browse locally
                        </p>
                    </div>
                    <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        id="file-upload"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                    <label
                        htmlFor="file-upload"
                        className="absolute inset-0 cursor-pointer"
                    />
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};
