import React, { useEffect, useState } from 'react';
import { useWoznyStore } from '@/lib/store/useWoznyStore';
import { Activity, Database, Trash2, HardDrive, Cpu, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { env } from '@huggingface/transformers';

export const StatusView = () => {
    const storage = useWoznyStore(state => state.storageUsage);
    const checkStorage = useWoznyStore(state => state.checkStorage);
    const [clearing, setClearing] = useState<string | null>(null);

    useEffect(() => {
        checkStorage();
        const interval = setInterval(checkStorage, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getHealthColor = (percent: number) => {
        if (percent > 80) return 'bg-red-500 text-red-600';
        if (percent > 60) return 'bg-yellow-500 text-yellow-600';
        return 'bg-green-500 text-green-600';
    };

    const clearModelCache = async () => {
        if (!confirm("This will delete all downloaded AI models. You will need to re-download them next time. Continue?")) return;
        setClearing('model');
        try {
            // Transformers.js uses the 'transformers-cache' name by default
            const cacheName = 'transformers-cache';
            if (await caches.has(cacheName)) {
                await caches.delete(cacheName);
            }
            // Also try clearing standard browser caches just in case
            const keys = await caches.keys();
            for (const key of keys) {
                if (key.includes('transformer')) await caches.delete(key);
            }
            await checkStorage();
            alert("Model cache cleared successfully.");
        } catch (e) {
            alert("Failed to clear cache: " + e);
        } finally {
            setClearing(null);
        }
    };

    const clearAppCache = async () => {
        if (!confirm("This will reset all application settings and data. Continue?")) return;
        setClearing('app');
        try {
            localStorage.clear();
            sessionStorage.clear();
            // Clear IndexedDB for WebLLM if it exists
            const dbs = await window.indexedDB.databases();
            dbs.forEach(db => {
                if (db.name) window.indexedDB.deleteDatabase(db.name);
            });
            window.location.reload();
        } catch (e) {
            alert("Failed to clear data: " + e);
            setClearing(null);
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-neutral-50 dark:bg-neutral-900 p-8">
            <div className="max-w-4xl mx-auto space-y-8">

                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
                        <Activity className="w-8 h-8 text-blue-500" />
                        System Status
                    </h1>
                    <p className="text-neutral-500 mt-2">Monitor local resource usage and manage device storage.</p>
                </header>

                {/* Storage Health Card */}
                <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <HardDrive className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Storage Quota</h3>
                                <p className="text-sm text-neutral-500">Browser-allocated space for this origin</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-mono font-bold">
                                {storage ? formatBytes(storage.used) : '...'}
                            </span>
                            <span className="text-neutral-400 text-sm ml-2">
                                / {storage ? formatBytes(storage.quota) : '...'}
                            </span>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {storage && (
                        <div className="w-full h-4 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mb-2">
                            <div
                                className={`h-full transition-all duration-500 ${getHealthColor(storage.percent).split(' ')[0]}`}
                                style={{ width: `${Math.max(2, storage.percent)}%` }}
                            />
                        </div>
                    )}

                    <div className="flex justify-between text-xs font-medium text-neutral-500 uppercase tracking-wide">
                        <span>Low Usage</span>
                        <span>Critical Limit</span>
                    </div>

                    {storage && storage.percent > 80 && (
                        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <div className="text-sm">
                                <span className="font-bold block mb-1">Storage Critical</span>
                                Your browser storage is nearly full. Please clear the Model Cache to prevent download failures.
                            </div>
                        </div>
                    )}
                </div>

                {/* Cache Management */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Model Cache */}
                    <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Database className="w-5 h-5 text-purple-500" />
                            <h3 className="font-bold">AI Model Cache</h3>
                        </div>
                        <p className="text-sm text-neutral-500 mb-6 min-h-[40px]">
                            Contains downloaded WASM binaries and model weights (Transformers.js). Clearing this frees up significant space (~50MB+).
                        </p>
                        <button
                            onClick={clearModelCache}
                            disabled={!!clearing}
                            className="w-full py-2 px-4 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center justify-center gap-2 transition-colors text-red-600 dark:text-red-400"
                        >
                            {clearing === 'model' ? 'Cleaning...' : (
                                <>
                                    <Trash2 className="w-4 h-4" /> Clear Model Cache
                                </>
                            )}
                        </button>
                    </div>

                    {/* App Data */}
                    <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Database className="w-5 h-5 text-orange-500" />
                            <h3 className="font-bold">Application Data</h3>
                        </div>
                        <p className="text-sm text-neutral-500 mb-6 min-h-[40px]">
                            Resets all local settings, imported CSVs, and UI preferences. Use this if the application state gets stuck.
                        </p>
                        <button
                            onClick={clearAppCache}
                            disabled={!!clearing}
                            className="w-full py-2 px-4 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center justify-center gap-2 transition-colors"
                        >
                            {clearing === 'app' ? 'Resetting...' : (
                                <>
                                    <Trash2 className="w-4 h-4" /> Factory Reset App
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Device Info (Read Only) */}
                <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Cpu className="w-5 h-5 text-neutral-500" />
                        <h3 className="font-bold">Hardware & Environment</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                            <span className="block text-xs text-neutral-500 uppercase mb-1">GPU Acceleration</span>
                            <div className="flex items-center gap-2 font-medium text-green-600 dark:text-green-400">
                                <CheckCircle2 className="w-4 h-4" />
                                WebGPU Enabled
                            </div>
                        </div>
                        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                            <span className="block text-xs text-neutral-500 uppercase mb-1">Parallel Workers</span>
                            <div className="font-mono text-sm">
                                {typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4} Threads
                            </div>
                        </div>
                        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                            <span className="block text-xs text-neutral-500 uppercase mb-1">User Agent</span>
                            <div className="font-mono text-xs text-neutral-600 truncate" title={typeof navigator !== 'undefined' ? navigator.userAgent : ''}>
                                {typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'}
                            </div>
                        </div>
                        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                            <span className="block text-xs text-neutral-500 uppercase mb-1">Model Config</span>
                            <div className="font-mono text-sm">
                                Quantized (q4f32)
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
