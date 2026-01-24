import { MLCEngineInterface } from "@mlc-ai/web-llm";
import { RowData } from "@/lib/store/useWoznyStore";

export const runAnalysis = async (
    engine: MLCEngineInterface,
    rows: RowData[],
    columns: string[],
    onProgress: (percent: number) => void
) => {
    const BATCH_SIZE = 10; // Small batch for local GPU memory safety
    const totalRows = rows.length;
    const batches = Math.ceil(totalRows / BATCH_SIZE);

    // Create worker ref (we need the raw worker to postMessage, not just the engine interface)
    // Since 'engine' is an interface, we might need to expose the worker from the client.ts
    // For now, we'll assume we pass the Worker instance or use the custom message channel.

    // NOTE: The @mlc-ai/web-llm library abstracts the worker interaction. 
    // To send custom messages, we need to bypass the engine interface or use `engine.chat.completions.create` loop directly.

    // Strategy Update: Since accessing the raw worker is tricky with the library abstraction,
    // we will run the loop HERE on the main thread, but calling the ASYNC engine methods.
    // The computation still happens in the worker/GPU, so UI won't freeze.

    const results = [];

    // --- HEALTH CHECK ---
    try {
        console.log("[Analysis] Running Engine Health Check...");
        const healthCheck = await engine.chat.completions.create({
            messages: [{ role: "user", content: "Say 'OK'" }],
            max_tokens: 5,
        });
        console.log("[Analysis] Health Check Passed:", healthCheck.choices[0].message.content);
    } catch (e) {
        console.error("[Analysis] Health Check FAILED. Engine is unresponsive.", e);
        throw new Error("AI Engine failed health check.");
    }
    // --------------------

    for (let i = 0; i < batches; i++) {
        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, totalRows);
        const chunk = rows.slice(start, end);

        // Convert to CSV string
        const csvString = chunk.map(row => columns.map(c => row[c]).join(',')).join('\n');

        try {
            console.log(`[Analysis] Processing Batch ${i + 1}/${batches}`);
            // We use the standard chat interface but with our structured prompts
            // This triggers the 'handleAnalysisBatch' logic implicitly via the engine, or we just rely on standard completion
            // Standard completion is safer with the library.

            const reply = await engine.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are a data cleaner. Analyze the CSV rows provided by the user.

Rules:
1. Only flag REAL issues. Do not hallucinate.
2. If a cell is valid, do not output anything for it.
3. Max 1 issue per cell.

Identify issues:
- MISSING: Empty string, "null", "N/A".
- FORMAT:
  - Phone numbers MUST have separators (e.g. "555-010-1234"). Flag "5550101234" or "555.010.1234".
  - Names should be Title Case. Flag ALL CAPS ("JOHN") or lowercase ("john").
- DUPLICATE: Exact row matches.

Output strictly a JSON array of objects.
Schema:
[ { "rowId": number, "column": string, "issueType": "MISSING" | "FORMAT" | "DUPLICATE", "suggestion": string } ]

Example Input:
Name,Phone
John,555-010-1234
,5550101234
JOHN,555-010-5678

Example Output:
[
  { "rowId": 1, "column": "Name", "issueType": "MISSING", "suggestion": "Enter Name" },
  { "rowId": 1, "column": "Phone", "issueType": "FORMAT", "suggestion": "Format as 555-xxx-xxxx" },
  { "rowId": 2, "column": "Name", "issueType": "FORMAT", "suggestion": "Title Case" }
]

IMPORTANT: "rowId" is the 0-based index relative to the provided chunk (Row 0 is the first data row shown below).`
                    },
                    { role: "user", content: `Analyze these rows (starting at rowId ${start}):\n${csvString}` }
                ],
                temperature: 0.1,
                top_p: 0.1,
                max_tokens: 1024
            });
            console.log(`[Analysis] Batch ${i + 1} completed`);

            results.push(reply.choices[0].message.content);
            onProgress(((i + 1) / batches) * 100);

        } catch (e) {
            console.error("Batch failed", e);
        }
    }

    return results;
};
