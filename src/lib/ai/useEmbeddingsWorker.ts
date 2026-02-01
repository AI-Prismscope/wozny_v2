import { useState, useEffect, useCallback } from 'react';
import { MLRequest, MLResponse } from './ml-types';

// --- SINGLETON WORKER STATE ---
let globalWorker: Worker | null = null;
let activeConsumers = 0;
let retentionTimeout: NodeJS.Timeout | null = null;

const WORKER_RETENTION_MS = 1000; // Keep worker alive for 1s during navigation

export const useMLWorker = () => {
    const [status, setStatus] = useState<MLResponse['status']>('ready');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [device, setDevice] = useState<'cpu' | 'webgpu' | 'wasm' | 'unknown'>('unknown');
    const [workerId, setWorkerId] = useState(0); // Used to force re-render/re-init

    useEffect(() => {
        // 1. Cancel destruction if we're remounting/navigating quickly
        if (retentionTimeout) {
            clearTimeout(retentionTimeout);
            retentionTimeout = null;
        }

        // 2. Initialize Worker if needed
        if (!globalWorker) {
            globalWorker = new Worker(
                new URL('./embeddings.worker.ts', import.meta.url),
                { type: 'module' }
            );
            console.log("[ML Worker] Initialized Singleton");
        }

        activeConsumers++;

        // 3. Status Listener (Shared / Global Updates)
        // This listener handles generic "error" or "ready" states that might affect everyone
        // NOTE: Request-specific progress is better handled in the promise, to avoid noise
        const globalHandler = (event: MessageEvent<MLResponse>) => {
            const { status, error, data } = event.data;
            if (status === 'error' && !event.data.requestId) {
                // Global worker error (not specific to a request)
                setError(error || 'Unknown global worker error');
                setStatus('error');
            }
            // Listen for device info
            if (status === 'ready' && (event.data as any).device) {
                setDevice((event.data as any).device);
            }
        };

        globalWorker.addEventListener('message', globalHandler);

        // 4. Cleanup
        return () => {
            if (globalWorker) {
                globalWorker.removeEventListener('message', globalHandler);
            }

            activeConsumers--;

            if (activeConsumers === 0) {
                // Start grace period before termination
                retentionTimeout = setTimeout(() => {
                    if (activeConsumers === 0 && globalWorker) {
                        console.log("[ML Worker] Terminating Zombie");
                        globalWorker.terminate();
                        globalWorker = null;
                        setDevice('unknown');
                    }
                }, WORKER_RETENTION_MS);
            }
        };
    }, [workerId]); // Re-run when workerId changes (forced reset)

    const resetWorker = useCallback(() => {
        if (globalWorker) {
            globalWorker.terminate();
            globalWorker = null;
        }
        activeConsumers = 0; // Reset count
        if (retentionTimeout) clearTimeout(retentionTimeout);
        setWorkerId(prev => prev + 1); // Force effect to re-run
        setError(null);
        setStatus('ready');
        setDevice('unknown');
    }, []);

    const generateEmbeddings = useCallback((texts: string[]): Promise<Float32Array[]> => {
        return new Promise((resolve, reject) => {
            if (!globalWorker) {
                reject('Worker not initialized');
                return;
            }

            const requestId = Math.random().toString(36).substring(7);

            const handler = (event: MessageEvent<MLResponse>) => {
                const { status, data, task, error, requestId: resId, progress } = event.data;

                // IGNORE messages not for this request
                if (resId !== requestId) return;

                if (status === 'complete' && task === 'feature-extraction') {
                    globalWorker?.removeEventListener('message', handler);
                    resolve(data);
                    setStatus('ready');
                } else if (status === 'error') {
                    globalWorker?.removeEventListener('message', handler);
                    reject(error);
                    setError(error || 'Calculation failed');
                    setStatus('error');
                } else if (status === 'working') {
                    setStatus('working');
                    // Only update progress for this specific request
                    if (progress !== undefined) setProgress(progress);
                }
            };

            globalWorker.addEventListener('message', handler);

            globalWorker.postMessage({
                type: 'feature-extraction',
                data: texts,
                requestId
            } as MLRequest);
        });
    }, []);

    const groupTexts = useCallback((texts: string[], k: number = 5): Promise<Int32Array> => {
        return new Promise((resolve, reject) => {
            if (!globalWorker) {
                reject('Worker not initialized');
                return;
            }

            const requestId = Math.random().toString(36).substring(7);

            const handler = (event: MessageEvent<MLResponse>) => {
                const { status, data, task, error, requestId: resId, progress } = event.data;

                // IGNORE messages not for this request
                if (resId !== requestId) return;

                if (status === 'complete' && task === 'cluster-texts') {
                    globalWorker?.removeEventListener('message', handler);
                    resolve(data);
                    setStatus('ready');
                } else if (status === 'error') {
                    globalWorker?.removeEventListener('message', handler);
                    reject(error);
                    setError(error || 'Clustering failed');
                    setStatus('error');
                } else if (status === 'working') {
                    setStatus('working');
                    if (progress !== undefined) setProgress(progress);
                }
            };

            globalWorker.addEventListener('message', handler);

            globalWorker.postMessage({
                type: 'cluster-texts',
                data: texts,
                options: { k },
                requestId
            } as MLRequest);
        });
    }, []);

    return {
        generateEmbeddings,
        groupTexts,
        status,
        progress,
        error,
        device,
        resetWorker
    };
};
