import { MLCEngineInterface } from "@mlc-ai/web-llm";
import { AnalysisIssue } from "@/lib/store/useWoznyStore";

export const generateInsight = async (
    engine: MLCEngineInterface,
    issues: AnalysisIssue[],
    rowCount: number,
    onProgress: (percent: number) => void
): Promise<string> => {

    // 1. Summarize Issues for the AI (Metadata only)
    const missing = issues.filter(i => i.issueType === 'MISSING');
    const formatting = issues.filter(i => i.issueType === 'FORMAT');
    const duplicates = issues.filter(i => i.issueType === 'DUPLICATE');

    const missingCols = [...new Set(missing.map(i => i.column))].join(", ");
    const formatCols = [...new Set(formatting.map(i => i.column))].join(", ");

    const summary = `
    Dataset Size: ${rowCount} Rows.
    Total Issues: ${issues.length}.
    - Missing Values: ${missing.length} (Columns: ${missingCols || 'None'})
    - Formatting Issues: ${formatting.length} (Columns: ${formatCols || 'None'})
    - Duplicates: ${duplicates.length}
    `;

    console.log("[Insight] Sending Summary to AI:", summary);
    onProgress(10); // Checkpoint

    try {
        const reply = await engine.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a Senior Data Consultant. 
Your goal is to explain the data quality issues to a business executive in 2-3 concise sentences.
Do not list every error. Focus on the *impact* and *trends*.
    
Tone: Professional, Direct, Solution-Oriented.
Format: Plain text (no markdown).`
                },
                {
                    role: "user",
                    content: `Here is the data quality summary:\n${summary}\n\nWrite the Executive Narrative:`
                }
            ],
            temperature: 0.3, // Slightly higher for better writing
            max_tokens: 256
        });

        onProgress(100);
        return reply.choices[0].message.content || "Analysis complete.";

    } catch (e) {
        console.error("Insight generation failed", e);
        return "Could not generate AI insight.";
    }
};
