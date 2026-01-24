/**
 * Checks if the current environment supports WebGPU.
 * Returns true if supported, false otherwise.
 */
export const checkWebGPU = async (): Promise<boolean> => {
    if (typeof navigator === 'undefined') return false; // Server-side
    if (!navigator.gpu) return false;

    try {
        const adapter = await navigator.gpu.requestAdapter();
        return !!adapter;
    } catch (e) {
        return false;
    }
};
