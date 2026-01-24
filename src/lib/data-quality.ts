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
            // Explicitly handle the '[MISSING]' tag injected by the parser
            if (!value || strVal === '' || strVal === '[MISSING]' || ['null', 'n/a', 'undefined', 'missing', 'tbd'].includes(strVal.toLowerCase())) {
                issues.push({
                    rowId: rowIndex,
                    column: col,
                    issueType: "MISSING",
                    suggestion: `Provide value for ${col}` // Generic, but accurate
                });
                return; // STOP. Do not check formatting on a missing cell.
            }

            // 3. FORMAT CHECK (Casing & Consistency)
            // Only applies to strings longer than 3 chars to avoid "ID" or "USA" being flagged.
            if (strVal.length > 3 && isNaN(Number(strVal))) {

                // A) Email Format
                if (col.toLowerCase().includes('email')) {
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
                        issues.push({
                            rowId: rowIndex,
                            column: col,
                            issueType: "FORMAT",
                            suggestion: "Invalid email format"
                        });
                    }
                }

                // B) Street Address Consistency (St vs Street)
                // Just flagging abbreviations for now as "Potential Abbreviation"
                if (col.toLowerCase().includes('address')) {
                    if (/\b(St|Ave|Rd|Blvd)\b\.?$/i.test(strVal)) {
                        issues.push({
                            rowId: rowIndex,
                            column: col,
                            issueType: "FORMAT",
                            suggestion: "Expand abbreviation (e.g. 'Street')"
                        });
                    }
                }

                // C) Casing Extremes (ALL CAPS or all lowercase)
                // We skip this check if it looks like a state code (2 chars) but we already check length > 3
                else if (strVal === strVal.toUpperCase()) {
                    issues.push({
                        rowId: rowIndex,
                        column: col,
                        issueType: "FORMAT",
                        suggestion: "Convert to Title Case"
                    });
                }
                else if (strVal === strVal.toLowerCase()) {
                    issues.push({
                        rowId: rowIndex,
                        column: col,
                        issueType: "FORMAT",
                        suggestion: "Convert to Title Case"
                    });
                }
            }
        });
    });

    return issues;
};
