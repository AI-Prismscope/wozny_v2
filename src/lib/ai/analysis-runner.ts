import { MLCEngineInterface } from "@mlc-ai/web-llm";
import { RowData } from "@/lib/store/useWoznyStore";

// Helper for Deterministic Duplicate Detection
const findDuplicates = (rows: RowData[], columns: string[]): any[] => {
    const issues: any[] = [];
    const seenFingerprints = new Set<string>();

    rows.forEach((row, index) => {
        // Create Normalized Fingerprint (lowercase + trim)
        const fingerprint = columns
            .map(col => String(row[col] || '').trim().toLowerCase())
            .join('|');

        if (seenFingerprints.has(fingerprint)) {
            // Found Duplicate
            issues.push({
                rowId: index,
                column: columns[0], // Mark first column as the anchor
                issueType: "DUPLICATE",
                suggestion: "Remove duplicate row"
            });
        } else {
            seenFingerprints.add(fingerprint);
        }
    });

    return issues;
};

export const runAnalysis = async (
    engine: MLCEngineInterface,
    rows: RowData[],
    columns: string[],
    onProgress: (percent: number) => void
) => {
    const BATCH_SIZE = 10;
    const totalRows = rows.length;
    const batches = Math.ceil(totalRows / BATCH_SIZE);

    // STEP 1: Fast Code Checks (Duplicates)
    console.log("[Analysis] Running Deterministic Checks...");
    const duplicateIssues = findDuplicates(rows, columns);
    const results = [JSON.stringify(duplicateIssues)]; // Pre-fill results with duplicates

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
        const csvString = chunk.map(row => columns.map(c => row[c]).join(',')).join('\n');

        try {
            console.log(`[Analysis] Processing Batch ${i + 1}/${batches}`);
            const reply = await engine.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are a data cleaner. 

Task: Scan the provided rows. Extract and list only the values that match these specific Outlier Patterns:

1. VOID: Empty cells, "null", "N/A", or "undefined".
2. FORMAT ANOMALY: 
   - Phone numbers lacking separators (e.g. "5550101234").
   - Text that doesn't match the column's typical format (e.g. text in a price column).
3. CASING EXTREME: All-caps ("JOHN") or all-lowercase ("john") in names/addresses.

If a cell is valid, IGNORE it. Do not output anything for it.
Do not output conversational text like "Here is the JSON". Start immediately with '['.

Output strictly a JSON array of objects.
Schema:
[ { "rowId": number, "column": string, "issueType": "MISSING" | "FORMAT", "suggestion": string } ]

Example Input:
ID,Name,Phone
1,John,555-010-1234
2,,5550101234
3,JOHN,555-010-5678

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
                max_tokens: 4096
            });
            console.log(`[Analysis] Batch ${i + 1} completed`);

            results.push(reply.choices[0].message.content || "[]");
            onProgress(((i + 1) / batches) * 100);

        } catch (e) {
            console.error("Batch failed", e);
        }
    }

    return results;
};
