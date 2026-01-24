import { RowData, AnalysisIssue } from './store/useWoznyStore';

/**
 * Runs immediate, code-based checks on the dataset.
 * This replaces the "Hybrid" model where basic checks were delegated to AI.
 */
export const runDeterministicAnalysis = (rows: RowData[], columns: string[]): AnalysisIssue[] => {
    const issues: AnalysisIssue[] = [];
    const seenFingerprints = new Set<string>();
    const seenPartialFingerprints = new Map<string, number>();

    // Heuristic: Identify potential "Identity" columns for partial matching
    // We look for First Name + Last Name + Address (or similar combo)
    const identityCols = columns.filter(c => {
        const lower = c.toLowerCase();
        return lower.includes('name') || lower.includes('address') || lower.includes('email');
    });

    // Only run partial check if we have at least 2 identity columns to match on
    const canRunPartialCheck = identityCols.length >= 2;

    rows.forEach((row, rowIndex) => {
        // 1a. EXACT DUPLICATE CHECK
        const exactFingerprint = columns
            .map(col => String(row[col] || '').trim().toLowerCase())
            .join('|');

        if (seenFingerprints.has(exactFingerprint)) {
            issues.push({
                rowId: rowIndex,
                column: columns[0],
                issueType: "DUPLICATE",
                suggestion: "Remove exact duplicate row"
            });
        }
        seenFingerprints.add(exactFingerprint);

        // 1b. PARTIAL DUPLICATE CHECK (Heuristic)
        if (canRunPartialCheck) {
            const partialFingerprint = identityCols
                .map(col => String(row[col] || '').trim().toLowerCase())
                .join('|');

            // If we've seen this PERSON before (Name+Address), but it wasn't caught by the Exact Check...
            // It means some other column (like ID or Phone) is different.
            if (seenPartialFingerprints.has(partialFingerprint)) {
                // Check if it was already flagged as Exact Duplicate (don't double flag)
                const isExact = issues.some(i => i.rowId === rowIndex && i.issueType === 'DUPLICATE');

                if (!isExact) {
                    issues.push({
                        rowId: rowIndex,
                        column: identityCols[0],
                        issueType: "DUPLICATE", // We use key "DUPLICATE" but with specific text
                        suggestion: "Potential Duplicate (Identity match)"
                    });
                }
            } else {
                seenPartialFingerprints.set(partialFingerprint, rowIndex);
            }
        }

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
