import { pipeline, env } from '@huggingface/transformers';
import { MLRequest, MLResponse } from './ml-types';
import { kMeans } from './kmeans';

env.allowLocalModels = false;
env.useBrowserCache = true;

let extractor: any = null;
const DEFAULT_EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';

self.onmessage = async (event: MessageEvent<MLRequest>) => {
    const { type, data, options, requestId } = event.data;

    try {
        // Fallback to empty array if data is missing
        const inputData = data || [];

        switch (type) {
            case 'feature-extraction':
                // Narrowing: feature extraction specifically expects string[]
                if (Array.isArray(inputData) && typeof inputData[0] === 'string') {
                    await handleFeatureExtraction(inputData as string[], requestId);
                } else {
                    throw new Error("Feature extraction requires an array of strings.");
                }
                break;

            case 'cluster-texts':
                // Narrowing: clustering also expects string[] to generate embeddings first
                if (Array.isArray(inputData) && typeof inputData[0] === 'string') {
                    await handleClusterTexts(inputData as string[], options, requestId);
                } else {
                    throw new Error("Clustering requires an array of strings.");
                }
                break;

            default:
                throw new Error(`Unknown task type: ${type}`);
        }
    } catch (error: any) {
        self.postMessage({ requestId, status: 'error', error: error.message } as MLResponse);
    }
};

async function getExtractor(requestId: string) {
    if (!extractor) {
        // Attempt 1: Try WebGPU if available
        try {
            // Note: Transformers.js handles 'auto' well, but we want to be explicit for reporting
            extractor = await pipeline('feature-extraction', DEFAULT_EMBEDDING_MODEL, {
                quantized: true,
                device: 'webgpu',
                progress_callback: (p: any) => {
                    if (p.status === 'progress') {
                        self.postMessage({ requestId, status: 'working', progress: p.progress, task: 'loading-model' } as MLResponse);
                    }
                }
            } as any);
            // Verify if it actually used WebGPU (some versions might silently fallback, but we assume success if no throw)
            // In a real scenario we might check extractor.model.device
            self.postMessage({ requestId, status: 'ready', device: 'webgpu' } as any);

        } catch (e) {
            console.warn("WebGPU initialization failed, falling back to WASM/CPU", e);
            try {
                // Attempt 2: Fallback to WASM
                extractor = await pipeline('feature-extraction', DEFAULT_EMBEDDING_MODEL, {
                    quantized: true,
                    device: 'wasm',
                    progress_callback: (p: any) => {
                        if (p.status === 'progress') self.postMessage({ requestId, status: 'working', progress: p.progress, task: 'loading-model' } as MLResponse);
                    }
                } as any);
                self.postMessage({ requestId, status: 'ready', device: 'wasm' } as any);
            } catch (e2: any) {
                // Fatal Error
                self.postMessage({ requestId, status: 'error', error: "Model initialization failed: " + e2.message } as MLResponse);
                throw e2;
            }
        }
    }
    return extractor;
}

async function computeEmbeddings(texts: string[], requestId: string): Promise<Float32Array[]> {
    const pipe = await getExtractor(requestId);
    const embeddings: (Float32Array | null)[] = [];
    const total = texts.length;

    for (let i = 0; i < total; i++) {
        const text = texts[i]?.trim();
        if (text) {
            // Mean pooling and normalization are essential for K-Means similarity
            const output = await pipe(text, { pooling: 'mean', normalize: true });
            // Extract the raw buffer to ensure we aren't holding onto the full Tensor object
            embeddings.push(new Float32Array(output.data));
        } else {
            embeddings.push(null);
        }

        // Tactical throttle: Report every 5% or at the end
        if (i % Math.max(1, Math.floor(total / 20)) === 0 || i === total - 1) {
            self.postMessage({
                requestId,
                status: 'working',
                task: 'computing-embeddings',
                progress: Math.round(((i + 1) / total) * 100)
            } as MLResponse);
        }
    }
    return embeddings as Float32Array[];
}

async function handleFeatureExtraction(texts: string[], requestId: string) {
    const embeddings = await computeEmbeddings(texts, requestId);

    // Transferable logic: Pass the underlying buffers to avoid cloning
    const buffers = embeddings.filter(Boolean).map(e => e.buffer);

    self.postMessage({
        requestId,
        status: 'complete',
        task: 'feature-extraction',
        data: embeddings
    } as MLResponse, buffers as any);
}

async function handleClusterTexts(texts: string[], options: any, requestId: string) {
    // Pass requestId to computeEmbeddings so progress maps correctly
    const embeddings = await computeEmbeddings(texts, requestId);

    const validVectors: Float32Array[] = [];
    const validIndices: number[] = [];

    embeddings.forEach((emb, idx) => {
        if (emb) {
            validVectors.push(emb);
            validIndices.push(idx);
        }
    });

    if (validVectors.length === 0) throw new Error("No valid text data to cluster.");

    const k = options?.k || 5;
    const clusters = kMeans(validVectors, k);

    const result = new Int32Array(texts.length).fill(-1);
    validIndices.forEach((originalIdx, i) => {
        result[originalIdx] = clusters[i];
    });

    self.postMessage({
        requestId,
        status: 'complete',
        task: 'cluster-texts',
        data: result
    } as MLResponse, [result.buffer] as any);
}