import { pipeline, env } from '@huggingface/transformers';
import { MLRequest, MLResponse } from './ml-types';
import { kMeans } from './kmeans';

env.allowLocalModels = false;
env.useBrowserCache = true;

let extractor: any = null;
const DEFAULT_EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';

self.onmessage = async (event: MessageEvent<MLRequest>) => {
    const { type, data, options } = event.data;

    try {
        switch (type) {
            case 'feature-extraction':
                await handleFeatureExtraction(data || []);
                break;
            case 'cluster-texts':
                await handleClusterTexts(data || [], options);
                break;
            default:
                throw new Error(`Unknown task type: ${type}`);
        }
    } catch (error: any) {
        self.postMessage({ status: 'error', error: error.message } as MLResponse);
    }
};

async function getExtractor() {
    if (!extractor) {
        extractor = await pipeline('feature-extraction', DEFAULT_EMBEDDING_MODEL, {
            quantized: true,
            progress_callback: (p: any) => {
                if (p.status === 'progress') {
                    self.postMessage({ status: 'working', progress: p.progress, task: 'loading-model' } as MLResponse);
                }
            }
        } as any);
        self.postMessage({ status: 'ready' } as MLResponse);
    }
    return extractor;
}

async function computeEmbeddings(texts: string[]): Promise<Float32Array[]> {
    const pipe = await getExtractor();
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
                status: 'working',
                task: 'computing-embeddings',
                progress: Math.round(((i + 1) / total) * 100)
            } as MLResponse);
        }
    }
    return embeddings as Float32Array[];
}

async function handleFeatureExtraction(texts: string[]) {
    const embeddings = await computeEmbeddings(texts);

    // Transferable logic: Pass the underlying buffers to avoid cloning
    const buffers = embeddings.filter(Boolean).map(e => e.buffer);

    self.postMessage({
        status: 'complete',
        task: 'feature-extraction',
        data: embeddings
    } as MLResponse, buffers as any);
}

async function handleClusterTexts(texts: string[], options: any) {
    const embeddings = await computeEmbeddings(texts);

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

    const result = new Array(texts.length).fill(-1);
    validIndices.forEach((originalIdx, i) => {
        result[originalIdx] = clusters[i];
    });

    self.postMessage({
        status: 'complete',
        task: 'cluster-texts',
        data: result
    } as MLResponse);
}