import { CreateWebWorkerMLCEngine, MLCEngineInterface, InitProgressReport } from "@mlc-ai/web-llm";
import { appConfig, SELECTED_MODEL_ID } from "./config";

let enginePromise: Promise<MLCEngineInterface> | null = null;

export const getEngine = async (
    onProgress?: (report: InitProgressReport) => void
): Promise<MLCEngineInterface> => {
    if (enginePromise) {
        return enginePromise;
    }

    // Check WebGPU support
    if (!navigator.gpu) {
        throw new Error("WebGPU is not supported on this browser.");
    }

    const worker = new Worker(
        new URL("./worker.ts", import.meta.url),
        { type: "module" }
    );

    enginePromise = CreateWebWorkerMLCEngine(
        worker,
        SELECTED_MODEL_ID,
        {
            appConfig,
            initProgressCallback: onProgress
        }
    );

    return enginePromise;
};
