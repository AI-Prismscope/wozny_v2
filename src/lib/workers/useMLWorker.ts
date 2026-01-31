import { useState, useEffect, useRef, useCallback } from 'react';
import { MLRequest, MLResponse } from './ml-types';

export const useMLWorker = () => {
    const workerRef = useRef<Worker | null>(null);
    const [status, setStatus] = useState<MLResponse['status']>('ready');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Initialize Worker
        if (!workerRef.current) {
            workerRef.current = new Worker(
                new URL('./ml-worker.ts', import.meta.url),
                { type: 'module' }
            );

            workerRef.current.onmessage = (event: MessageEvent<MLResponse>) => {
                const { status, progress, error, data } = event.data;

                if (status === 'error') {
                    setError(error || 'Unknown worker error');
                    setStatus('error');
                } else {
                    setStatus(status);
                    if (progress !== undefined) setProgress(progress);
                }
            };
        }

        return () => {
            // Cleanup if needed
        };
    }, []);

    const generateEmbeddings = useCallback((texts: string[]): Promise<Float32Array[]> => {
        return new Promise((resolve, reject) => {
            if (!workerRef.current) {
                reject('Worker not initialized');
                return;
            }

            const handler = (event: MessageEvent<MLResponse>) => {
                const { status, data, task, error } = event.data;
                if (status === 'complete' && task === 'feature-extraction') {
                    workerRef.current?.removeEventListener('message', handler);
                    resolve(data);
                } else if (status === 'error') {
                    workerRef.current?.removeEventListener('message', handler);
                    reject(error);
                }
            };

            workerRef.current.addEventListener('message', handler);

            workerRef.current.postMessage({
                type: 'feature-extraction',
                data: texts
            } as MLRequest);
        });
    }, []);

    const groupTexts = useCallback((texts: string[], k: number = 5): Promise<number[]> => {
        return new Promise((resolve, reject) => {
            if (!workerRef.current) {
                reject('Worker not initialized');
                return;
            }

            const handler = (event: MessageEvent<MLResponse>) => {
                const { status, data, task, error } = event.data;
                if (status === 'complete' && task === 'cluster-texts') {
                    workerRef.current?.removeEventListener('message', handler);
                    resolve(data);
                } else if (status === 'error') {
                    workerRef.current?.removeEventListener('message', handler);
                    reject(error);
                }
            };

            workerRef.current.addEventListener('message', handler);

            workerRef.current.postMessage({
                type: 'cluster-texts',
                data: texts,
                options: { k }
            } as MLRequest);
        });
    }, []);

    return {
        generateEmbeddings,
        groupTexts,
        status,
        progress,
        error
    };
};
