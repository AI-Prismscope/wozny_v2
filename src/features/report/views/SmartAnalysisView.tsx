
import React, { useState } from 'react';
import { useWoznyStore } from '@/lib/store/useWoznyStore';
import { useMLWorker } from '@/lib/workers/useMLWorker';
import { Sparkles, Play, Check, Loader2 } from 'lucide-react';

export const SmartAnalysisView = () => {
    const columns = useWoznyStore((state) => state.columns);
    const rows = useWoznyStore((state) => state.rows);
    const addColumn = useWoznyStore((state) => state.addColumn);
    const { groupTexts, status, progress } = useMLWorker();

    const [analyzingColumn, setAnalyzingColumn] = useState<string | null>(null);

    const ignoredColumns = useWoznyStore((state) => state.ignoredColumns);

    // Filter for "interesting" text columns (has more than 5 unique values, logic could be improved)
    const textColumns = columns.filter(col => {
        // Skip ignored columns
        if (ignoredColumns.includes(col)) return false;

        // Just a simple heuristic: is it a string?
        // CSV is always string. Maybe skip 'ID' columns?
        return true;
    });

    const handleAnalyze = async (col: string) => {
        setAnalyzingColumn(col);
        const texts = rows.map(r => r[col] || '');

        try {
            // Run K-Means (k=5 default for now)
            const clusterIds = await groupTexts(texts, 5);

            // Map IDs to Group Names (e.g., "Group 1", "Group 2")
            // In a real app, we'd find the centermost text and name it "Like 'Google'"
            const groupValues = clusterIds.map(id => `Cluster ${id + 1}`);

            // Add to store
            addColumn(`${col} Group`, groupValues);

        } catch (e) {
            console.error(e);
            alert("Analysis failed. See console.");
        } finally {
            setAnalyzingColumn(null);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    Smart Analysis
                </h2>
                <p className="text-neutral-500 text-sm">
                    Use machine learning to discover patterns, group similar items, and clean your data automatically.
                </p>
            </div>

            <div className="space-y-4">
                {textColumns.map(col => (
                    <div key={col} className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold">{col}</h3>
                            <p className="text-xs text-neutral-400">
                                {rows.length} entries
                            </p>
                        </div>

                        {analyzingColumn === col ? (
                            <div className="flex items-center gap-3">
                                <div className="text-xs text-purple-500 font-medium">
                                    {status === 'working' ? `Analyzing ${progress}%` : 'Finalizing...'}
                                </div>
                                <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                            </div>
                        ) : (
                            <button
                                onClick={() => handleAnalyze(col)}
                                disabled={status === 'working'}
                                className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                                <Play className="w-4 h-4" />
                                Group by Similarity
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
