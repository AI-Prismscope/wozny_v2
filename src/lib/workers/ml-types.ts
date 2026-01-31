
export type MLTaskType = 'feature-extraction' | 'clustering' | 'cluster-texts';

export interface MLRequest {
    type: MLTaskType;
    modelId?: string;
    data?: any; // strings[] usually, or embeddings[]
    options?: {
        k?: number; // For clustering
    };
}

export interface MLResponse {
    status: 'ready' | 'working' | 'complete' | 'error';
    task?: MLTaskType;
    data?: any;
    error?: string;
    progress?: number;
}
