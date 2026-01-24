import { AppConfig, prebuiltAppConfig } from "@mlc-ai/web-llm";

// The Model we are locking to (Type A Build)
export const SELECTED_MODEL_ID = "Llama-3.2-3B-Instruct-q4f32_1-MLC";

// Custom Configuration if needed
export const appConfig: AppConfig = {
    useIndexedDBCache: true,
    ...prebuiltAppConfig
};
