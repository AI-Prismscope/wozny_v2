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
    generateText: (prompt: string, systemPrompt?: string, options?: { temperature?: number; top_p?: number; max_tokens?: number }) => Promise<string>;

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

    generateText: async (prompt, systemPrompt, options) => {
        const engine = get().engine;
        if (!engine) throw new Error("Engine not initialized");

        const messages: webllm.ChatCompletionMessageParam[] = [];
        if (systemPrompt) {
            messages.push({ role: "system", content: systemPrompt });
        }
        messages.push({ role: "user", content: prompt });

        const reply = await engine.chat.completions.create({
            messages,
            temperature: options?.temperature ?? 0.7,
            top_p: options?.top_p,
            max_tokens: options?.max_tokens,
        });

        return reply.choices[0]?.message?.content || "";
    },

    generateFilterCode: async (columns, userQuery) => {
        const { generateText } = get();

        const systemPrompt = `You are a precise, technical execution engine.
        Your task is to write a single line of Javascript code to filter a data row.
        The row object matches the CSV columns.
        
        Available Columns: ${JSON.stringify(columns)}
        
        Rules:
        1. NEVER use introductory phrases (e.g., "Sure," "Here is," "I can help with that").
        2. NEVER use concluding phrases (e.g., "Hope this helps," "Let me know if you need more").
        3. OUTPUT RAW CODE ONLY in direct Markdown format.
        4. RETURN AN ARROW FUNCTION: (row) => ...
        5. ALWAYS USE BRACKET NOTATION: row['Column Name']
        6. HANDLE MISSING VALUES:
           - In this data, missing values are exactly the string "[MISSING]"
           - To find missing rows: row['Col'] === '[MISSING]'
        7. STRING MATCHING:
           - Always use .trim() and .toLowerCase()
           - Example: row['Status'] && row['Status'].trim().toLowerCase() === 'active'
        
        Examples:
        Input: "Show rows where email is missing"
        Output: (row) => row['Email'] === '[MISSING]'

        Input: "Show rows where City is New York"
        Output: (row) => row['City'] && row['City'] !== '[MISSING]' && row['City'].trim().toLowerCase() === 'new york'
        `;

        const response = await generateText(userQuery, systemPrompt, {
            temperature: 0.0, // Minimum randomness
            top_p: 1.0,       // Consider all likely options, but temperature 0.0 will override
            max_tokens: 256,  // Hard limit on output length
        });

        // --- Robust Code Extraction Strategy ---
        // 1. Try to find a code block first (```javascript ... ```)
        // 2. Fallback: Try to find an arrow function signature (row) => ...

        let code = response.trim();

        const codeBlockRegex = /```(?:javascript|js)?\s*([\s\S]*?)```/i;
        const arrowFuncRegex = /(\(row\)\s*=>\s*[\s\S]*)/i; // Naive but often works for simple one-liners

        const codeBlockMatch = code.match(codeBlockRegex);
        if (codeBlockMatch && codeBlockMatch[1]) {
            code = codeBlockMatch[1].trim();
        } else {
            // No code block? Look for the arrow function anywhere in the text
            const arrowMatch = code.match(arrowFuncRegex);
            if (arrowMatch && arrowMatch[1]) {
                code = arrowMatch[1].trim();
            }
        }

        // Additional cleanup for "trailing characters" from the AI writing a full script like .filter(...)
        // If the code ends with ");", it likely belongs to a wrapper function.
        // We only want the Arrow Function expression.
        // This is hard to regex perfectly without an AST.
        // But we can try to trust the prompt + temp=0.0 first.

        return code;
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
