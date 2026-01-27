import { create } from 'zustand';
import * as webllm from "@mlc-ai/web-llm";

// Constants
// Using a small, fast model optimized for browsers.
// Llama-3-8B is great, but might be heavy. Qwen2.5-1.5B is tiny and fast.
// Let's stick to Llama-3.2-1B or 3B if available, otherwise Llama-3-8B-q4.
// Ideally user selects, but we need a default.
// Let's use "Llama-3.2-1B-Instruct-q4f16_1-MLC" for speed/quality balance.
const SELECTED_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

interface LLMState {
    engine: webllm.MLCEngineInterface | null;
    isLoading: boolean;
    progress: string;
    error: string | null;
    isReady: boolean;

    // Actions
    initialize: () => Promise<void>;
    generateText: (prompt: string, systemPrompt?: string) => Promise<string>;

    // Specialized Skills
    generateFilterCode: (columns: string[], userQuery: string) => Promise<string>;
    standardizeValues: (uniqueValues: string[]) => Promise<Record<string, string>>;
    enrichRow: (row: Record<string, string>, userPrompt: string) => Promise<string>;
}

export const useWoznyLLM = create<LLMState>((set, get) => ({
    engine: null,
    isLoading: false,
    progress: "",
    error: null,
    isReady: false,

    initialize: async () => {
        if (get().engine || get().isLoading) return;

        set({ isLoading: true, error: null });

        try {
            const initProgressCallback = (report: webllm.InitProgressReport) => {
                set({ progress: report.text });
            };

            const engine = await webllm.CreateMLCEngine(
                SELECTED_MODEL,
                { initProgressCallback }
            );

            set({ engine, isReady: true, isLoading: false, progress: "Ready" });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    generateText: async (prompt, systemPrompt) => {
        const engine = get().engine;
        if (!engine) throw new Error("Engine not initialized");

        const messages: webllm.ChatCompletionMessageParam[] = [];
        if (systemPrompt) {
            messages.push({ role: "system", content: systemPrompt });
        }
        messages.push({ role: "user", content: prompt });

        const reply = await engine.chat.completions.create({
            messages,
        });

        return reply.choices[0]?.message?.content || "";
    },

    generateFilterCode: async (columns, userQuery) => {
        const { generateText } = get();

        const systemPrompt = `You are a Javascript Expert. 
        Your task is to write a single Javascript ARROW FUNCTION that filters a row of data.
        The row object matches the CSV columns.
        
        Available Columns: ${JSON.stringify(columns)}
        
        Follow these rules strictly:
        1. OUTPUT RAW CODE ONLY. 
        2. USE STANDARD JAVASCRIPT ES5 SYNTAX. (No Type Annotations).
        3. ALWAYS USE BRACKET NOTATION with EXACT column names.
           Example: row['Certification Renewal Date']
        4. GUARD AGAINST MISSING DATA using logical AND (&&).
           Example: row['Name'] && row['Name'] === 'John'
        5. HANDLE QUOTES IN HEADERS by using double quotes for the key.
           Example: row["Client's Name"]
        6. NORMALIZE STRINGS: Use .trim() and .toLowerCase() for all comparisons.
        
        Examples:
        Input: "Show items with status Active"
        Output: (row) => row['Status'] && row['Status'].trim().toLowerCase() === 'active'

        Input: "Show rows where Email is missing"
        Output: (row) => !row['Email'] || row['Email'].trim() === ''
        `;

        const response = await generateText(userQuery, systemPrompt);

        // Clean up markdown code blocks if present
        let code = response.trim();
        if (code.startsWith('```javascript')) code = code.replace('```javascript', '').replace('```', '');
        if (code.startsWith('```js')) code = code.replace('```js', '').replace('```', '');
        if (code.startsWith('```')) code = code.replace('```', '').replace('```', '');

        return code.trim();
    },

    standardizeValues: async (uniqueValues) => {
        const { generateText } = get();

        const systemPrompt = `You are a Data Cleaning Assistant.
        You will receive a list of messy text strings.
        Your task is to group them into Standardized Terms.
        Return a JSON Map where keys are the messy string and values are the clean string.
        Return ONLY valid JSON.
        `;

        const prompt = `Values:\n${uniqueValues.join('\n')}`;

        const response = await generateText(prompt, systemPrompt);

        try {
            // Clean markdown
            let jsonStr = response.trim();
            if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace('```json', '').replace('```', '');
            if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace('```', '').replace('```', '');

            return JSON.parse(jsonStr);
        } catch (e) {
            console.error("Failed to parse LLM JSON", response);
            return {};
        }
    },

    enrichRow: async (row, userPrompt) => {
        const { generateText } = get();

        const systemPrompt = `You are a Data Extraction Expert.
        You will receive a JSON object representing a row of data.
        Your task is to extract or infer a specific value based on the User's Request.
        Return ONLY the extracted value. No explanations.
        User Request: "${userPrompt}"
        `;

        const rowStr = JSON.stringify(row);
        const response = await generateText(rowStr, systemPrompt);

        return response.trim();
    }
}));
