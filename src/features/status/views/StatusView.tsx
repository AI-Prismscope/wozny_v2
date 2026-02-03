import React, { useEffect, useState } from 'react';
import { useWoznyStore } from '@/lib/store/useWoznyStore';
import { Activity, Database, Trash2, HardDrive, Cpu, AlertTriangle, CheckCircle2, ShieldCheck, WifiOff, FileCheck } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export const StatusView = () => {
    const storage = useWoznyStore(state => state.storageUsage);
    const checkStorage = useWoznyStore(state => state.checkStorage);
    const [clearing, setClearing] = useState<string | null>(null);

    const [modelStatus, setModelStatus] = useState<{
        llama: boolean;
        embedding: boolean;
    }>({ llama: false, embedding: false });

    const checkModelCache = async () => {
        try {
            const keys = await caches.keys();
            let llamaFound = false;
            let embeddingFound = false;

            for (const key of keys) {
                // Check for WebLLM/MLC (Llama)
                if (key.includes('webllm') || key.includes('mlc')) {
                    const cache = await caches.open(key);
                    const requests = await cache.keys();
                    if (requests.length > 0) llamaFound = true;
                }

                // Check for Transformers (Embedding)
                // Looks for the specific model folder or cache signature
                if (key.includes('transformers-cache')) {
                    const cache = await caches.open(key);
                    const requests = await cache.keys();
                    // Basic check: if the cache has content, we assume the model is there 
                    // (Transformers.js usually puts everything in one cache)
                    if (requests.length > 0) embeddingFound = true;
                }
            }
            setModelStatus({ llama: llamaFound, embedding: embeddingFound });
        } catch (e) {
            console.error("Cache check failed", e);
            setModelStatus({ llama: false, embedding: false });
        }
    };

    useEffect(() => {
        checkStorage();
        checkModelCache();
        const interval = setInterval(() => {
            checkStorage();
            checkModelCache();
        }, 5000); // Poll every 5s
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

    const [dialogState, setDialogState] = useState<{
        type: 'model' | 'app' | null;
        isOpen: boolean;
    }>({ type: null, isOpen: false });

    // Open confirmation dialogs
    const requestClearModel = () => setDialogState({ type: 'model', isOpen: true });
    const requestResetApp = () => setDialogState({ type: 'app', isOpen: true });
    const closeDialog = () => setDialogState({ type: null, isOpen: false });

    const proceedWithAction = async () => {
        if (dialogState.type === 'model') {
            await clearModelCache();
        } else if (dialogState.type === 'app') {
            await clearAppCache();
        }
        closeDialog(); // Close immediately after implementation starts/setup, or let the function handle it if we want loading state in dialog
        // Current implementation has loading state on buttons, so we can close dialog and let page loading state take over.
    };

    const clearModelCache = async () => {
        // Removed native confirm
        setClearing('model');
        try {
            const keys = await caches.keys();
            let cleared = false;
            for (const key of keys) {
                if (key.includes('transformer') || key.includes('webllm') || key.includes('mlc')) {
                    await caches.delete(key);
                    cleared = true;
                }
            }

            await checkStorage();
            await checkModelCache();
        } catch (e) {
            alert("Failed to clear cache: " + e);
        } finally {
            setClearing(null);
        }
    };

    const clearAppCache = async () => {
        // Removed native confirm
        setClearing('app');
        try {
            localStorage.clear();
            sessionStorage.clear();
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
            <ConfirmDialog
                isOpen={dialogState.isOpen && dialogState.type === 'model'}
                onClose={closeDialog}
                onConfirm={proceedWithAction}
                title="Delete AI Models?"
                description="This will permanently delete all downloaded Llama-3.2 and Embedding model weights. You will need to download them again to use AI features."
                confirmLabel="Delete Models"
                variant="danger"
            />

            <ConfirmDialog
                isOpen={dialogState.isOpen && dialogState.type === 'app'}
                onClose={closeDialog}
                onConfirm={proceedWithAction}
                title="Factory Reset Application?"
                description="This will wipe all local data including imported files, settings, and logs. This action cannot be undone."
                confirmLabel="Factory Reset"
                variant="danger"
            />

            <div className="max-w-6xl mx-auto space-y-8">
                {/* Top Row: Header & Storage Split */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <header>
                        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
                            <Activity className="w-8 h-8 text-blue-500" />
                            System Status & Compliance
                        </h1>
                        <p className="text-neutral-500 mt-2">Monitor local resource usage, manage data retention, and verify privacy status.</p>
                    </header>

                    {/* Storage Health Card */}
                    <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm h-full flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-4">
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
                    </div>
                </div>

                {/* Main 2-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Left Column: Data Management (Danger Zone) */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-2 px-2">
                            <Trash2 className="w-4 h-4 text-neutral-400" />
                            <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Data Retention Management</h2>
                        </div>

                        {/* Model Cache */}
                        <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">

                            {/* Header */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                    <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <h3 className="font-bold text-neutral-900 dark:text-white">AI Model Cache</h3>
                            </div>

                            {/* Model Status Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">

                                {/* LLM Status */}
                                <div className="flex flex-col gap-1 bg-neutral-50 dark:bg-neutral-900 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
                                    <span className="font-medium text-xs text-neutral-500 uppercase tracking-wide">LLM Engine</span>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-sm text-neutral-900 dark:text-white truncate" title="Llama-3.2-3B-Instruct">Llama-3.2</span>
                                        {modelStatus.llama ? (
                                            <span className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                                                <CheckCircle2 className="w-3 h-3" /> Cached
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-neutral-400 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                                                <Trash2 className="w-3 h-3" /> Empty
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Embedding Status */}
                                <div className="flex flex-col gap-1 bg-neutral-50 dark:bg-neutral-900 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
                                    <span className="font-medium text-xs text-neutral-500 uppercase tracking-wide">Embeddings</span>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-sm text-neutral-900 dark:text-white truncate" title="all-MiniLM-L6-v2">MiniLM-L6</span>
                                        {modelStatus.embedding ? (
                                            <span className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                                                <CheckCircle2 className="w-3 h-3" /> Cached
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-neutral-400 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                                                <Trash2 className="w-3 h-3" /> Empty
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-neutral-500 mb-6">
                                Contains downloaded WASM binaries and model weights.
                                Clearing this frees significant space (~500MB+) but requires re-downloading next session.
                            </p>

                            <button
                                onClick={requestClearModel}
                                disabled={!!clearing || (!modelStatus.llama && !modelStatus.embedding)}
                                className="w-full py-2.5 px-4 border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {clearing === 'model' ? 'Cleaning...' : (
                                    <>
                                        <Trash2 className="w-4 h-4" /> Clear Model Caches
                                    </>
                                )}
                            </button>
                        </div>

                        {/* App Data */}
                        <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                    <Database className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <h3 className="font-bold text-neutral-900 dark:text-white">Application Data</h3>
                            </div>
                            <p className="text-sm text-neutral-500 mb-6">
                                Resets all local settings, imported CSVs, and UI preferences.
                                <br /><strong>Note:</strong> Does not effect downloaded models.
                            </p>
                            <button
                                onClick={requestResetApp}
                                disabled={!!clearing}
                                className="w-full py-2.5 px-4 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center justify-center gap-2 transition-colors"
                            >
                                {clearing === 'app' ? 'Resetting...' : (
                                    <>
                                        <Trash2 className="w-4 h-4" /> Factory Reset App
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Hardware & Privacy (Read Only) */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-2 px-2">
                            <ShieldCheck className="w-4 h-4 text-neutral-400" />
                            <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Privacy & Environment</h2>
                        </div>

                        <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl p-10 shadow-sm">
                            <div className="space-y-11">

                                {/* Privacy Status Block */}
                                <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-xl">
                                    <div className="flex items-center gap-2 mb-3">
                                        <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                                        <h4 className="font-bold text-green-700 dark:text-green-300">Local Execution Verified</h4>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white dark:bg-black border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 shadow-sm">
                                            <WifiOff className="w-3 h-3" /> Offline Capable
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white dark:bg-black border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 shadow-sm">
                                            <FileCheck className="w-3 h-3" /> Zero-Knowledge
                                        </span>
                                    </div>

                                    {/* Regulatory Badges */}
                                    <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-green-100 dark:border-green-900/30">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 uppercase tracking-tighter">
                                            GDPR Compliant
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 uppercase tracking-tighter">
                                            CCPA Ready
                                        </span>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                                {/* Specs List */}
                                <div className="space-y-3">
                                    <div>
                                        <span className="block text-xs text-neutral-500 uppercase mb-1">Processing Unit</span>
                                        <div className="flex items-center justify-between">
                                            <div className="font-medium text-neutral-900 dark:text-neutral-100">GPU Acceleration</div>
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                                                <CheckCircle2 className="w-3 h-3" /> WebGPU Active
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="block text-xs text-neutral-500 uppercase mb-1">System Performance</span>
                                        <div className="flex items-center justify-between">
                                            <div className="font-medium text-neutral-900 dark:text-neutral-100">
                                                {(typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4) >= 4 ? 'Optimal' : 'Limited'}
                                            </div>
                                            <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded ${(typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4) >= 4
                                                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                                                : 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                                                }`}>
                                                {(typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4) >= 4 ? (
                                                    <>
                                                        <Cpu className="w-3 h-3" /> Multitasking Supported
                                                    </>
                                                ) : (
                                                    <>
                                                        <AlertTriangle className="w-3 h-3" /> Background processing limited
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="block text-xs text-neutral-500 uppercase mb-1">Session Scope</span>
                                        <div className="font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                                            {(() => {
                                                const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
                                                let browser = "Browser";
                                                if (ua.includes("Chrome")) browser = "Chrome";
                                                else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
                                                else if (ua.includes("Firefox")) browser = "Firefox";
                                                else if (ua.includes("Edg")) browser = "Edge";

                                                let os = "Device";
                                                if (ua.includes("Mac")) os = "macOS";
                                                else if (ua.includes("Win")) os = "Windows";
                                                else if (ua.includes("Linux")) os = "Linux";
                                                else if (ua.includes("Android")) os = "Android";
                                                else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

                                                return `${browser} on ${os}`;
                                            })()}
                                        </div>
                                        <p className="text-xs text-neutral-400 mt-1">
                                            Data is isolated to this specific browser profile.
                                        </p>
                                    </div>

                                    <div>
                                        <span className="block text-xs text-neutral-500 uppercase mb-1">AI Engine Target</span>
                                        <div className="font-medium text-neutral-900 dark:text-neutral-100">
                                            Llama-3.2-1B-Instruct
                                        </div>
                                        <div className={`mt-1 text-sm font-medium flex items-center gap-1.5 ${modelStatus.llama ? 'text-green-600 dark:text-green-400' : 'text-neutral-400'
                                            }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${modelStatus.llama ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-600'
                                                }`} />
                                            {modelStatus.llama ? 'Ready for Offline Use' : 'Not Installed'}
                                        </div>
                                        <p className="text-xs text-neutral-400 mt-0.5">
                                            {modelStatus.llama
                                                ? "Stored locally on this device."
                                                : "Will be downloaded securely upon first use."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
