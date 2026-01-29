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

    // 1. DUPLICATE CHECK (Two-Pass)
    // Pass 1: Build Maps
    const exactMap = new Map<string, number[]>();
    const partialMap = new Map<string, number[]>();

    rows.forEach((row, rowIndex) => {
        // Exact Fingerprint
        const exactFingerprint = columns
            .map(col => String(row[col] || '').trim().toLowerCase())
            .join('|');
        if (!exactMap.has(exactFingerprint)) exactMap.set(exactFingerprint, []);
        exactMap.get(exactFingerprint)!.push(rowIndex);

        // Partial Fingerprint
        if (canRunPartialCheck) {
            const partialFingerprint = identityCols
                .map(col => String(row[col] || '').trim().toLowerCase())
                .join('|');
            if (!partialMap.has(partialFingerprint)) partialMap.set(partialFingerprint, []);
            partialMap.get(partialFingerprint)!.push(rowIndex);
        }
    });

    // Pass 2: Analysis (Flagging)
    // A) Flag Exact Duplicates (All rows involved in a collision > 1)
    exactMap.forEach((rowIndices) => {
        if (rowIndices.length > 1) {
            rowIndices.forEach((rowIndex, i) => {
                issues.push({
                    rowId: rowIndex,
                    column: columns[0],
                    issueType: "DUPLICATE",
                    suggestion: i === 0 ? "Potential Duplicate (Original?)" : "Potential Duplicate (Copy)"
                });
            });
        }
    });

    // B) Flag Partial Duplicates
    partialMap.forEach((rowIndices) => {
        if (rowIndices.length > 1) {
            rowIndices.forEach((rowIndex, i) => {
                // If it's already an Exact Duplicate, skip Partial flag to avoid noise
                const isExact = issues.some(iss => iss.rowId === rowIndex && iss.issueType === 'DUPLICATE');
                if (!isExact) {
                    issues.push({
                        rowId: rowIndex,
                        column: identityCols[0],
                        issueType: "DUPLICATE",
                        suggestion: "Potential Partial Duplicate (Same Name/Address)"
                    });
                }
            });
        }
    });

    // Pass 3: Column Checks (Missing/Format)
    rows.forEach((row, rowIndex) => {
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
            const lowerCol = col.toLowerCase();

            // D) Phone Format Check (Strict)
            // Checked BEFORE numeric guard because phones often look like numbers.
            if (lowerCol.includes('phone') || lowerCol.includes('tel') || lowerCol.includes('cell')) {
                // Ignore short trash, but check anything substantial
                // Allow spaces or no spaces, but must match standard (XXX) XXX-XXXX
                if (strVal.length > 5 && !/^\(\d{3}\) \d{3}-\d{4}$/.test(strVal)) {
                    issues.push({
                        rowId: rowIndex,
                        column: col,
                        issueType: "FORMAT",
                        suggestion: "Standardize phone format"
                    });
                }
            }

            // General Text Checks
            // We skip if value is purely numeric (like "123") UNLESS it was a phone (handled above).
            // We allow length >= 3 to catch "Jon" (3 chars).
            else if (strVal.length >= 3 && isNaN(Number(strVal))) {

                // A) Email Format
                if (lowerCol.includes('email')) {
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
                // Strict rule: We flag abbreviations at the end of line.
                if (lowerCol.includes('address')) {
                    if (/\b(St|Ave|Rd|Blvd|Dr|Ln|Ct|Pl)\b\.?$/i.test(strVal)) {
                        issues.push({
                            rowId: rowIndex,
                            column: col,
                            issueType: "FORMAT",
                            suggestion: "Expand abbreviation (e.g. 'Street')"
                        });
                    }
                }

                // C) Casing Extremes (ALL CAPS or all lowercase)
                // Must contain at least one letter to be a casing issue (avoids phone numbers/zips)
                const hasLetters = /[a-zA-Z]/.test(strVal);

                if (hasLetters) {
                    if (strVal === strVal.toUpperCase()) {
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
            }
        });
    });

    return issues;
};

// --- AUTO-FIX UTILITIES ---

export const toTitleCase = (str: string): string => {
    return str.replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
};

export const normalizePhone = (str: string): string => {
    const cleaned = str.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    // If not standard 10 digit, return original (or maybe partial format?)
    // User asked for (555) 010-5678 format.
    return str;
};

export const expandAddress = (str: string): string => {
    // Regex matches St, Ave, etc at end of string ($) 
    // Case insensitive with optional period
    return str.replace(/\b(St|Ave|Rd|Blvd|Dr|Ln|Ct|Pl)\b\.?$/i, (match) => {
        // Normalize match to lower case key lookup
        const clean = match.replace('.', '').toLowerCase();
        const map: Record<string, string> = {
            'st': 'Street',
            'ave': 'Avenue',
            'rd': 'Road',
            'blvd': 'Boulevard',
            'dr': 'Drive',
            'ln': 'Lane',
            'ct': 'Court',
            'pl': 'Place'
        };
        // Preserve original start case? Usually we want Title Case for address suffix.
        return map[clean] || match;
    });
};

/**
 * Applies Rule 1-4 to a single row.
 * Returns a NEW row object.
 */
export const autoFixRow = (row: RowData, columns: string[]): RowData => {
    const newRow = { ...row };

    columns.forEach(col => {
        let val = newRow[col] || '';
        const lowerCol = col.toLowerCase();

        // Rule 4: Whitespace Trimming (Global)
        val = val.trim().replace(/\s+/g, ' ');

        // Rule 3: Email Sanitization
        if (lowerCol.includes('email')) {
            val = val.toLowerCase();
        }
        // Rule 2: Phone Normalization
        else if (lowerCol.includes('phone') || lowerCol.includes('tel') || lowerCol.includes('cell')) {
            val = normalizePhone(val);
        }
        // Rule 1: Title Casing
        // Applies to: Names, Address, City, Company
        else if (
            lowerCol.includes('name') ||
            lowerCol.includes('address') ||
            lowerCol.includes('city') ||
            lowerCol.includes('street') ||
            lowerCol.includes('company') ||
            lowerCol.includes('borough')
        ) {
            // Only apply if it looks like text (not numbers like "123")
            // Although address starts with numbers. Title Case handles "123 Main St" correctly.
            val = toTitleCase(val);

            // Special: Address Expansion (Rule 1b)
            if (lowerCol.includes('address') || lowerCol.includes('street')) {
                val = expandAddress(val);
            }
        }

        newRow[col] = val;
    });

    return newRow;
};
