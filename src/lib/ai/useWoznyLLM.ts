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
    generateFilterCode: (columns: string[], userQuery: string, rows?: Record<string, string>[]) => Promise<string>;
    standardizeValues: (uniqueValues: string[]) => Promise<Record<string, string>>;
    enrichRow: (row: Record<string, string>, userPrompt: string) => Promise<string>;

    // New Cleaning Skills
    normalizeDates: (dates: string[]) => Promise<Record<string, string>>;
    normalizeCurrency: (values: string[]) => Promise<Record<string, string>>;
    standardizeStateCodes: (values: string[]) => Promise<Record<string, string>>;
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

    generateFilterCode: async (columns, userQuery, rows = []) => {
        const { generateText } = get();

        // 1. Build Schema Context
        // We want to give the LLM a hint about the data, especially generic "Group" columns.
        let schemaSummary = "AVAILABLE COLUMNS:\n";
        columns.forEach(col => {
            schemaSummary += `- "${col}"`;

            // If we have rows, maybe peek at unique values for "Group" or "Status" columns?
            // Limit to columns with few unique values (categorical)
            if (rows.length > 0) {
                const uniqueValues = new Set<string>();
                for (let i = 0; i < Math.min(rows.length, 500); i++) { // Scan first 500 rows
                    const val = rows[i][col];
                    if (val) uniqueValues.add(String(val).trim());
                    if (uniqueValues.size > 10) break; // Too many values, ignore
                }

                if (uniqueValues.size > 0 && uniqueValues.size <= 10) {
                    schemaSummary += ` (Values: ${Array.from(uniqueValues).join(', ')})`;
                }
            }
            schemaSummary += "\n";
        });

        const systemPrompt = `
        You are a JavaScript Logic Generator. 
        Task: Convert user requests into raw arrow functions to filter data.
        Requirement: Output ONLY the arrow function code.

        ${schemaSummary}

        DATA REFERENCE:
        - Missing string: "[MISSING]"
        - Column name mapping: Use EXACT column names from the list above.
        
        EXAMPLES:
        Input: "show rows with missing data in telephone"
        Output: (row) => row["telephone"] === "[MISSING]"

        Input: "filter for Certification_Renewal_Date missing"
        Output: (row) => row["Certification_Renewal_Date"] === "[MISSING]"

        Input: "find blank entries in Ethnicity"
        Output: (row) => row["Ethnicity"] === "[MISSING]"

        Input: "Show me missing in Certification_Renewal_Date"
        Output: (row) => row["Certification_Renewal_Date"] === "[MISSING]"

        Input: "missing in column 4"
        Output: (row) => Object.values(row)[3] === "[MISSING]"

        Input: "Show rows that have a Phone Number"
        Output: (row) => row['Phone'] !== '[MISSING]'
        
        Input: "Show cluster 1"
        Output: (row) => row['Account Manager Group'] === 'Cluster 1'
        `;

        const response = await generateText(userQuery, systemPrompt, {
            temperature: 0.0, // Minimum randomness
            top_p: 1.0,       // Consider all likely options, but temperature 0.0 will override
            max_tokens: 256,  // Hard limit on output length
        });

        let code = response.trim();

        // Simple markdown cleanup: Remove backticks if the model ignores the "no markdown" rule
        // (Even with temp=0.0, some models are hard-wired to use markdown)
        if (code.startsWith('```')) {
            code = code.replace(/^```(javascript|js)?\s*/i, '').replace(/\s*```$/, '');
        }

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
    },

    // --- NEW SKILLS ---

    normalizeDates: async (dates) => {
        const { generateText } = get();
        const systemPrompt = `You are a Date Normalization Bot.
        Task: Convert diverse date strings into ISO 8601 format (YYYY-MM-DD).
        Input: A list of date strings.
        Output: A JSON Map { "Original String": "YYYY-MM-DD" }.
        Rules:
        - If invalid or ambiguous, return null.
        - "Jan 1, 2024" -> "2024-01-01"
        - "12/31/23" -> "2023-12-31"
        - Return ONLY JSON.
        `;

        const prompt = `Dates to Fix:\n${dates.join('\n')}`;
        const response = await generateText(prompt, systemPrompt, { temperature: 0.1 }); // Low temp for logic

        try {
            let jsonStr = response.trim();
            if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace('```json', '').replace('```', '');
            if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace('```', '').replace('```', '');
            return JSON.parse(jsonStr);
        } catch (e) { return {}; }
    },

    normalizeCurrency: async (values) => {
        const { generateText } = get();
        const systemPrompt = `You are a Currency Normalization Bot.
        Task: Clean currency strings to a standard numeric format (1234.56).
        Input: A list of price strings.
        Output: A JSON Map { "Original": "Cleaned" }.
        Rules:
        - Remove symbols ($, €, £).
        - Ensure 2 decimal places if applicable.
        - "1,000.00" -> "1000.00"
        - "$50" -> "50.00"
        - Return ONLY JSON.
        `;

        const prompt = `Values to Fix:\n${values.join('\n')}`;
        const response = await generateText(prompt, systemPrompt, { temperature: 0.1 });

        try {
            let jsonStr = response.trim();
            if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace('```json', '').replace('```', '');
            if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace('```', '').replace('```', '');
            return JSON.parse(jsonStr);
        } catch (e) { return {}; }
    },

    standardizeStateCodes: async (values) => {
        const { generateText } = get();
        const systemPrompt = `You are a US Geography Bot.
        Task: Convert State names to 2-Letter ISO Codes (New York -> NY).
        Input: List of state names/codes.
        Output: JSON Map { "Original": "Code" }.
        Rules:
        - "California" -> "CA"
        - "mass." -> "MA"
        - "NY" -> "NY" (Keep as is)
        - Return ONLY JSON.
        `;

        const prompt = `States to Fix:\n${values.join('\n')}`;
        const response = await generateText(prompt, systemPrompt, { temperature: 0.1 });

        try {
            let jsonStr = response.trim();
            if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace('```json', '').replace('```', '');
            if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace('```', '').replace('```', '');
            return JSON.parse(jsonStr);
        } catch (e) { return {}; }
    }
}));
