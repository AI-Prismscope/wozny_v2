/**
 * All valid task identifiers for the ML Worker.
 */
export type MLTaskType =
    | 'feature-extraction'
    | 'cluster-texts'
    | 'loading-model'
    | 'computing-embeddings';

/**
 * Structured request for the ML Worker.
 */
export interface MLRequest {
    type: MLTaskType;
    modelId?: string;
    data?: string[] | Float32Array[]; // Explicitly typed for embeddings or raw text
    options?: {
        k?: number; // Number of clusters for K-Means
    };
}

/**
 * Structured response from the ML Worker.
 */
export interface MLResponse {
    status: 'ready' | 'working' | 'complete' | 'error';
    task?: MLTaskType; // Now includes sub-tasks like 'loading-model'
    data?: any; // The result (e.g., cluster IDs or embeddings)
    error?: string;
    progress?: number; // 0 to 100
}