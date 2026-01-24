import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";
import { appConfig, SELECTED_MODEL_ID } from "./config";
import { SYSTEM_PROMPTS, constructUserPrompt } from "./prompts";

// The handler instantiates the engine internally in this version
const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg: MessageEvent) => {
    // Intercept custom 'ANALYZE_BATCH' messages
    if (msg.data.type === 'ANALYZE_BATCH') {
        handleAnalysisBatch(msg.data.payload);
    } else {
        // Pass standard messages (init, reload, chat) to the library handler
        handler.onmessage(msg);
    }
};

async function handleAnalysisBatch(payload: { chunkId: string, csvData: string }) {
    try {
        // Access the engine managed by the handler
        const engine = handler.engine;

        if (!engine) {
            throw new Error("Engine not initialized");
        }

        // 2. Construct Prompt
        const userPrompt = constructUserPrompt(payload.csvData);

        // 3. Inference
        const reply = await engine.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_PROMPTS.ANALYST },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.1, // Deterministic
            max_tokens: 1024, // Limit per chunk
            response_format: { type: "json_object" } // Force JSON if supported
        });

        // 4. Send Result back
        self.postMessage({
            type: 'BATCH_COMPLETE',
            payload: {
                chunkId: payload.chunkId,
                result: reply.choices[0].message.content
            }
        });

    } catch (e) {
        self.postMessage({
            type: 'BATCH_ERROR',
            payload: { chunkId: payload.chunkId, error: String(e) }
        });
    }
}
