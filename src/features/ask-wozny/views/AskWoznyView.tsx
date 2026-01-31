'use client';

import React, { useState, useMemo } from 'react';
import { useWoznyStore, RowData, AnalysisIssue } from '@/lib/store/useWoznyStore';
import { DataGrid } from '@/shared/DataGrid';
import { EmptyState } from '@/shared/EmptyState';
import { Wand2, Loader2, X, Download, ArrowLeft } from 'lucide-react';
import { useWoznyLLM } from '@/lib/ai/useWoznyLLM';
import clsx from 'clsx';
import { downloadCleanCsv } from '@/lib/export-utils';

export const AskWoznyView = () => {
    const rows = useWoznyStore((state) => state.rows);
    const columns = useWoznyStore((state) => state.columns);
    const fileName = useWoznyStore((state) => state.fileName);
    const setActiveTab = useWoznyStore((state) => state.setActiveTab);
    const setUserSelection = useWoznyStore((state) => state.setUserSelection);

    // AI Hooks
    const { initialize, generateFilterCode, isReady, isLoading: isEngineLoading, progress } = useWoznyLLM();
    const [aiQuery, setAiQuery] = useState("");
    const [aiFilterCode, setAiFilterCode] = useState<string | null>(null);
    const [isThinking, setIsThinking] = useState(false);

    if (rows.length === 0) {
        return <EmptyState description="Upload a CSV file first." />;
    }

    // Handle AI Filter
    const handleAskWozny = async () => {
        if (!aiQuery.trim()) return;

        if (!isReady) {
            await initialize();
        }

        setIsThinking(true);
        try {
            const code = await generateFilterCode(columns, aiQuery, rows);
            console.log("AI Code:", code);
            setAiFilterCode(code);
        } catch (e) {
            console.error("AI Error:", e);
        } finally {
            setIsThinking(false);
        }
    };

    const clearAiFilter = () => {
        setAiQuery("");
        setAiFilterCode(null);
    };

    const handleSendToWorkshop = () => {
        // Map current filtered row objects back to their global index
        // Note: rows[i] === row by reference
        const indices = filteredRows.map(row => rows.indexOf(row));
        setUserSelection(indices);
        setActiveTab('workshop');
    };

    // Filter Logic
    const filteredRows = useMemo(() => {
        if (!aiFilterCode) return rows;

        try {
            // 1. Extract Code Block (Smarter Extraction)
            // The AI often wraps code in markdown or prefixes text.
            let cleanCode = aiFilterCode.trim();

            // Regex to find code inside ``` ... ```
            const markdownMatch = cleanCode.match(/```(?:javascript|js)?\s*([\s\S]*?)\s*```/);
            if (markdownMatch) {
                cleanCode = markdownMatch[1].trim();
            } else {
                // Fallback A: Look for the specific Arrow Function signature
                // The AI prompt demands "(row) =>", so we can reliably look for it.
                const arrowIndex = cleanCode.indexOf('(row) =>');
                if (arrowIndex !== -1) {
                    cleanCode = cleanCode.substring(arrowIndex);
                }

                // Fallback B: Basic cleanup if no signature found (rare, effectively assumes pure code)
                cleanCode = cleanCode.replace(/```javascript/g, '').replace(/```js/g, '').replace(/```/g, '').trim();
            }

            // 2. Handle generic variable declarations
            // Remove "const filter =", "let f =", "var x ="
            cleanCode = cleanCode.replace(/^(const|let|var)\s+\w+\s*=\s*/, '');

            // 3. Remove trailing semicolons
            cleanCode = cleanCode.replace(/;$/, '');
            cleanCode = cleanCode.trim();

            console.log("Raw AI Code:", aiFilterCode);
            console.log("Parsed Code:", cleanCode);

            // 4. Create Fuzzy Proxy Helper
            const createFuzzyRowProxy = (targetRow: RowData) => {
                return new Proxy(targetRow, {
                    get: (target, prop) => {
                        if (typeof prop !== 'string') return Reflect.get(target, prop);

                        // 1. Exact match
                        if (prop in target) return target[prop];

                        // 2. Case-insensitive match
                        const exactKeys = Object.keys(target);
                        const lowerProp = prop.toLowerCase();
                        const key = exactKeys.find(k => k.toLowerCase() === lowerProp);
                        if (key) return target[key];

                        // 3. Fallback (maybe Levenshtein later?)
                        return undefined;
                    }
                });
            };

            // 5. Create the filter function
            const expressionFn = new Function('row', `return (${cleanCode})(row)`);

            return rows.filter(row => {
                try {
                    // Wrap row in proxy to handle casing issues like "Account manager" vs "Account Manager"
                    const proxyRow = createFuzzyRowProxy(row);
                    return expressionFn(proxyRow);
                } catch (e) { return false; }
            });
        } catch (e) {
            console.error("Invalid Filter Code", e);
            // On error, return all rows (safe fallback) or maybe empty? 
            // Returning all rows is safer to avoid empty screen panic.
            return rows;
        }
    }, [rows, aiFilterCode]);

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300 bg-neutral-50 dark:bg-neutral-900">
            {/* Toolbar / Search Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 z-20">
                <div className="flex items-center gap-6">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2 text-neutral-900 dark:text-white">
                            <Wand2 className="w-5 h-5 text-purple-600" />
                            Ask Wozny
                        </h2>
                        <p className="text-xs text-neutral-500">Natural Language Filter Tool</p>
                    </div>

                    {/* AI Search Bar */}
                    <div className="relative group">
                        <div className={clsx(
                            "flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-2 border border-transparent transition-all w-96 focus-within:w-[32rem] focus-within:border-purple-500 focus-within:bg-white dark:focus-within:bg-black shadow-sm",
                            aiFilterCode && "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                        )}>
                            {isThinking || (isEngineLoading && !isReady) ? (
                                <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                            ) : (
                                <Wand2 className={clsx("w-5 h-5", aiFilterCode ? "text-purple-600" : "text-neutral-400")} />
                            )}

                            <input
                                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-neutral-400"
                                placeholder={!isReady ? "Initializing AI..." : "Example: Show me users from NY with missing emails..."}
                                value={aiQuery}
                                onChange={(e) => setAiQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAskWozny()}
                                disabled={!isReady && isEngineLoading}
                            />

                            {aiFilterCode && (
                                <button onClick={clearAiFilter} className="text-neutral-400 hover:text-neutral-900">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {(!isReady && isEngineLoading) && (
                            <div className="absolute top-full left-0 mt-2 text-xs text-neutral-500 bg-white p-2 rounded shadow-lg border z-50 whitespace-nowrap">
                                {progress}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-sm text-neutral-500 font-mono">
                        {filteredRows.length} / {rows.length} Rows
                    </div>

                    <button
                        onClick={handleSendToWorkshop}
                        disabled={filteredRows.length === 0}
                        className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Wand2 className="w-4 h-4" />
                        Send to Workshop
                    </button>

                    <button
                        onClick={() => downloadCleanCsv(filteredRows, columns)}
                        className="px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Grid Container */}
            <div className="flex-1 overflow-hidden p-6 pb-0">
                {filteredRows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-500 animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-full mb-4">
                            <Wand2 className="w-8 h-8 text-neutral-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-200">No results found</h3>
                        <p className="text-sm max-w-xs text-center mt-2">
                            We couldn't find any rows matching "{aiQuery}". Try rephrasing your search.
                        </p>
                        <button
                            onClick={clearAiFilter}
                            className="mt-6 text-sm font-medium text-purple-600 hover:text-purple-700 hover:underline"
                        >
                            Clear Filter
                        </button>
                    </div>
                ) : (
                    <DataGrid
                        data={filteredRows}
                        columns={columns}
                        className="shadow-sm border border-neutral-200 dark:border-neutral-800"
                    />
                )}
            </div>
        </div>
    );
};
