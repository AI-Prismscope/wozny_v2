'use client';

import React, { useEffect, useState } from 'react';
import { useWoznyStore } from '@/lib/store/useWoznyStore';
import { getEngine } from '@/lib/ai/client';
import { runAnalysis } from '@/lib/ai/analysis-runner';
import { Loader2, BrainCircuit } from 'lucide-react';
import { InitProgressReport } from '@mlc-ai/web-llm';

export const AnalysisView = () => {
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("Initializing AI Engine...");
    const rows = useWoznyStore((state) => state.rows);
    const columns = useWoznyStore((state) => state.columns);
    const setActiveTab = useWoznyStore((state) => state.setActiveTab);

    useEffect(() => {
        let isMounted = true;
        let timerId: NodeJS.Timeout;

        const startJob = async () => {
            try {
                // 1. Load Engine
                const engine = await getEngine((report: InitProgressReport) => {
                    if (isMounted) {
                        setStatusText(report.text);
                        // Engine load is 0-50% of the visual progress
                        setProgress(report.progress * 50);
                    }
                });

                // 2. Run Analysis
                if (isMounted) setStatusText("Analyzing Rows (This may take a moment)...");

                const results = await runAnalysis(engine, rows, columns, (p) => {
                    if (isMounted) setProgress(50 + (p * 0.5)); // 50-100%
                });

                // 3. Store Results
                console.log("Analysis Complete", results);
                const setAnalysisResults = useWoznyStore.getState().setAnalysisResults;
                const issuesList: any[] = [];

                results.forEach((jsonStr) => {
                    if (!jsonStr) return;
                    try {
                        // Robust JSON Extraction: Find the array [ ... ] pattern
                        // This handles conversational text ("Here is the data:") and markdown blocks
                        const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);

                        if (jsonMatch) {
                            const cleanJson = jsonMatch[0];
                            const parsed = JSON.parse(cleanJson);
                            if (Array.isArray(parsed)) {
                                issuesList.push(...parsed);
                            }
                        } else {
                            console.warn("No JSON array found in response:", jsonStr);
                        }
                    } catch (err) {
                        console.warn("Failed to parse batch result:", jsonStr, err);
                    }
                });

                // Add unique keys if missing, or ensure structure
                // Logic assumes runner returns valid AnalysisIssue structure, but rowId might be loose.
                // We'll trust the runner + system prompt for now. 
                setAnalysisResults(issuesList);

                // 4. Navigate to Report
                if (isMounted) setActiveTab('report');

            } catch (e) {
                console.error(e);
                if (isMounted) setStatusText("Error: " + String(e));
            }
        };

        // React 18 Strict Mode Fix:
        // Mount 1 -> Schedule -> Unmount 1 -> Clear -> (Job never starts)
        // Mount 2 -> Schedule -> (Job starts)
        // This ensures the job only runs on the persistent mount.
        timerId = setTimeout(() => {
            startJob();
        }, 500);

        return () => {
            isMounted = false;
            clearTimeout(timerId);
        };
    }, [rows, columns, setActiveTab]);

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 animate-in fade-in">
            <div className="w-full max-w-md text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                    <BrainCircuit className="w-8 h-8 text-blue-400 animate-pulse" />
                </div>

                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">AI Analysis in Progress</h2>

                <div className="space-y-2">
                    <div className="h-2 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 font-mono">{statusText} ({Math.round(progress)}%)</p>
                </div>

                <div className="p-4 bg-neutral-100 dark:bg-neutral-900/50 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-500 text-left space-y-1">
                    <p>• Engine: Llama-3.2-3B (WebGPU)</p>
                    <p>• Strategy: Batched Inference</p>
                    <p>• Privacy: Local Processing Only</p>
                </div>
            </div>
        </div>
    );
};
