
import { pipeline, env, PipelineType } from '@huggingface/transformers';
import { MLRequest, MLResponse } from './ml-types';
import { kMeans } from './kmeans';

// Skip local model checks for browser environment
env.allowLocalModels = false;
env.useBrowserCache = true;

// Singleton to hold the pipeline
let extractor: any = null;
const DEFAULT_EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';

self.onmessage = async (event: MessageEvent<MLRequest>) => {
    const { type, data, options } = event.data;

    try {
        if (type === 'feature-extraction') {
            await handleFeatureExtraction(data || [], options, false);
        } else if (type === 'cluster-texts') {
            await handleClusterTexts(data || [], options);
        } else {
            throw new Error(`Unknown task type: ${type}`);
        }
    } catch (error: any) {
        self.postMessage({
            status: 'error',
            error: error.message
        } as MLResponse);
    }
};

async function getExtractor() {
    if (!extractor) {
        try {
            // Note: 'quantized' is not in PretrainedModelOptions type definition but is supported by the library
            extractor = await pipeline('feature-extraction', DEFAULT_EMBEDDING_MODEL, {
                quantized: true,
                progress_callback: (p: any) => {
                    if (p.status === 'progress') {
                        self.postMessage({ status: 'working', progress: p.progress } as MLResponse);
                    }
                }
            } as any);
            self.postMessage({ status: 'ready' } as MLResponse);
        } catch (e: any) {
            throw new Error(`Failed to load model: ${e.message}`);
        }
    }
    return extractor;
}

// Unified embedding function
async function computeEmbeddings(texts: string[], reportProgress = true): Promise<Float32Array[]> {
    const pipe = await getExtractor();
    const embeddings: any[] = [];
    const total = texts.length;

    for (let i = 0; i < total; i++) {
        const text = texts[i];
        if (text && text.trim().length > 0) {
            const output = await pipe(text, { pooling: 'mean', normalize: true });
            embeddings.push(output.data); // Float32Array
        } else {
            embeddings.push(null);
        }

        if (reportProgress && (i % 10 === 0 || i === total - 1)) {
            self.postMessage({
                status: 'working',
                task: 'feature-extraction',
                progress: Math.round(((i + 1) / total) * 100)
            } as MLResponse);
        }
    }
    return embeddings;
}

async function handleFeatureExtraction(texts: string[], options: any, reportCompletion = true) {
    const embeddings = await computeEmbeddings(texts);
    if (reportCompletion) {
        self.postMessage({
            status: 'complete',
            task: 'feature-extraction',
            data: embeddings
        } as MLResponse);
    }
    return embeddings;
}

async function handleClusterTexts(texts: string[], options: any) {
    // 1. Generate Embeddings
    self.postMessage({ status: 'working', progress: 0 } as MLResponse);
    const embeddings = await computeEmbeddings(texts);

    // 2. Perform K-Means
    const validVectors: Float32Array[] = [];
    const validIndices: number[] = [];

    embeddings.forEach((emb, idx) => {
        if (emb) {
            validVectors.push(emb);
            validIndices.push(idx);
        }
    });

    const k = options?.k || 5;
    const clusters = kMeans(validVectors, k);

    // 3. Map back to original row structure
    const result = new Array(texts.length).fill(-1);
    validIndices.forEach((originalIdx, i) => {
        result[originalIdx] = clusters[i];
    });

    self.postMessage({
        status: 'complete',
        task: 'cluster-texts',
        data: result // Array of cluster IDs
    } as MLResponse);
}
