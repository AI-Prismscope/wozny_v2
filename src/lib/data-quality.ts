import { RowData, AnalysisIssue } from './store/useWoznyStore';

/**
 * Runs immediate, code-based checks on the dataset.
 * This replaces the "Hybrid" model where basic checks were delegated to AI.
 */
export const runDeterministicAnalysis = (rows: RowData[], columns: string[]): AnalysisIssue[] => {
    const issues: AnalysisIssue[] = [];
    const seenFingerprints = new Set<string>();

    rows.forEach((row, rowIndex) => {
        // 1. DUPLICATE CHECK (Normalized Fingerprint)
        const fingerprint = columns
            .map(col => String(row[col] || '').trim().toLowerCase())
            .join('|');

        if (seenFingerprints.has(fingerprint)) {
            issues.push({
                rowId: rowIndex,
                column: columns[0], // Anchor to first column
                issueType: "DUPLICATE",
                suggestion: "Remove duplicate row"
            });
        }
        seenFingerprints.add(fingerprint);

        columns.forEach(col => {
            const value = row[col];
            const strVal = String(value || '').trim();

            // 2. MISSING CHECK (Void Pattern)
            if (!value || strVal === '' || ['null', 'n/a', 'undefined', 'missing', 'tbd'].includes(strVal.toLowerCase())) {
                issues.push({
                    rowId: rowIndex,
                    column: col,
                    issueType: "MISSING",
                    suggestion: `Provide value for ${col}`
                });
                return; // Skip formatting check if missing
            }

            // 3. FORMAT CHECK (Casing Extremes)
            // Only applies to strings longer than 3 chars to avoid "ID" or "USA" being flagged.
            if (strVal.length > 3 && isNaN(Number(strVal))) {
                if (col.toLowerCase().includes('email')) {
                    // Simple Email Regex
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
                        issues.push({
                            rowId: rowIndex,
                            column: col,
                            issueType: "FORMAT",
                            suggestion: "Invalid email format"
                        });
                    }
                }
                else if (strVal === strVal.toUpperCase()) {
                    issues.push({
                        rowId: rowIndex,
                        column: col,
                        issueType: "FORMAT",
                        suggestion: "Convert to Title Case (All Caps detected)"
                    });
                }
                else if (strVal === strVal.toLowerCase()) {
                    issues.push({
                        rowId: rowIndex,
                        column: col,
                        issueType: "FORMAT",
                        suggestion: "Convert to Title Case (All lowercase detected)"
                    });
                }
            }
        });
    });

    return issues;
};
