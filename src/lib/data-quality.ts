import { RowData, AnalysisIssue } from './store/useWoznyStore';

// --- CONSTANTS ---
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const NON_ISO_DATE_REGEX = /^(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4})|(?:\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?,? \d{4})$/i;

const CURRENCY_SYMBOL_REGEX = /[$€£¥₿]/;
const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const BROKEN_URL_REGEX = /^(www\.|[a-z0-9](d+[a-z0-9])+\.[a-z]{2,})/i;

const US_STATES = new Set([
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    "DC"
]);

const US_STATES_FULL = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA",
    "colorado": "CO", "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA",
    "hawaii": "HI", "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA",
    "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS", "missouri": "MO",
    "montana": "MT", "nebraska": "NE", "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ",
    "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", "ohio": "OH",
    "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT", "vermont": "VT",
    "virginia": "VA", "washington": "WA", "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY",
    "district of columbia": "DC"
};

// --- HELPER FUNCTIONS ---

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
    return str;
};

export const expandAddress = (str: string): string => {
    return str.replace(/\b(St|Ave|Rd|Blvd|Dr|Ln|Ct|Pl)\b\.?$/i, (match) => {
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
        return map[clean] || match;
    });
};

export const normalizeDate = (str: string): string => {
    const trimmed = str.trim();
    if (!trimmed) return str;

    // 1. Try native Date.parse
    const timestamp = Date.parse(trimmed);
    if (!isNaN(timestamp)) {
        const d = new Date(timestamp);
        return d.toISOString().split('T')[0];
    }

    // 2. Fallback: Manual numeric parse (MM/DD/YYYY or DD/MM/YYYY)
    // We assume US-style MM/DD for ambiguity unless we want to get more complex
    const numericMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (numericMatch) {
        let [_, m, d, y] = numericMatch;
        if (y.length === 2) y = `20${y}`; // 21st century bias
        const pad = (n: string) => n.length === 1 ? `0${n}` : n;
        return `${y}-${pad(m)}-${pad(d)}`;
    }

    return str;
};

/**
 * Applies cleaning rules to a single row.
 * Returns a NEW row object.
 * Only touches columns that have a FORMAT issue.
 */
export const autoFixRow = (row: RowData, columns: string[], rowIssues: AnalysisIssue[]): RowData => {
    const newRow = { ...row };

    columns.forEach(col => {
        let val = newRow[col] || '';
        const lowerCol = col.toLowerCase();

        // Skip if it's a MISSING placeholder
        if (val.startsWith('[') && val.endsWith(']')) return;

        // ONLY touch columns that actually have a FORMAT issue
        const hasIssue = rowIssues.some(i => i.column === col && i.issueType === 'FORMAT');
        if (!hasIssue) return;

        // Rule 4: Whitespace Trimming
        val = val.trim().replace(/\s+/g, ' ');

        // Rule 3: Email Sanitization
        if (lowerCol.includes('email')) {
            val = val.toLowerCase();
        }
        // Rule 2: Phone Normalization
        else if (lowerCol.includes('phone') || lowerCol.includes('tel') || lowerCol.includes('cell')) {
            val = normalizePhone(val);
        }
        // State Special Rule (Extracted columns or original)
        else if (lowerCol === 'state' || lowerCol === 'st' || lowerCol.endsWith('_state')) {
            // Force 2-letter uppercase if valid
            if (val.length === 2) {
                val = val.toUpperCase();
            } else if ((US_STATES_FULL as any)[val.toLowerCase()]) {
                val = (US_STATES_FULL as any)[val.toLowerCase()];
            }
        }
        // Rule 1: Title Casing
        else if (
            lowerCol.includes('name') ||
            lowerCol.includes('address') ||
            lowerCol.includes('city') ||
            lowerCol.includes('street') ||
            lowerCol.includes('company') ||
            lowerCol.includes('borough') ||
            lowerCol.includes('method') ||
            lowerCol.includes('type') ||
            lowerCol.includes('status') ||
            lowerCol.includes('category') ||
            lowerCol.includes('payment') ||
            lowerCol.includes('role')
        ) {
            val = toTitleCase(val);
            if (lowerCol.includes('address') || lowerCol.includes('street')) {
                val = expandAddress(val);
            }
        }
        // Rule 5: Date Normalization
        else if (lowerCol.includes('date') || lowerCol.includes('dob') || lowerCol.includes('start') || lowerCol.includes('end') || lowerCol.includes('joined')) {
            val = normalizeDate(val);
        }

        newRow[col] = val;
    });

    return newRow;
};

// --- MAIN ANALYSIS FUNCTION ---

export const runDeterministicAnalysis = (rows: RowData[], columns: string[]): AnalysisIssue[] => {
    const issues: AnalysisIssue[] = [];

    // Heuristic: Identify potential "Identity" columns for partial matching
    const identityCols = columns.filter(c => {
        const lower = c.toLowerCase();
        return lower.includes('name') || lower.includes('address') || lower.includes('email');
    });

    const canRunPartialCheck = identityCols.length >= 2;

    // 1. DUPLICATE CHECK (Two-Pass)
    const exactMap = new Map<string, number[]>();
    const partialMap = new Map<string, number[]>();

    rows.forEach((row, rowIndex) => {
        const exactFingerprint = columns
            .map(col => String(row[col] || '').trim().toLowerCase())
            .join('|');
        if (!exactMap.has(exactFingerprint)) exactMap.set(exactFingerprint, []);
        exactMap.get(exactFingerprint)!.push(rowIndex);

        if (canRunPartialCheck) {
            const partialFingerprint = identityCols
                .map(col => String(row[col] || '').trim().toLowerCase())
                .join('|');
            if (!partialMap.has(partialFingerprint)) partialMap.set(partialFingerprint, []);
            partialMap.get(partialFingerprint)!.push(rowIndex);
        }
    });

    // Pass 2: Analysis (Flagging)
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

    partialMap.forEach((rowIndices) => {
        if (rowIndices.length > 1) {
            rowIndices.forEach((rowIndex, i) => {
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

    // Pass 3: Column Checks (Missing, Format, Validity)
    rows.forEach((row, rowIndex) => {
        columns.forEach(col => {
            const value = row[col];
            const strVal = String(value || '').trim();
            const lowerCol = col.toLowerCase();

            // 2. MISSING CHECK
            const isPlaceholder = strVal.startsWith('[') && strVal.endsWith(']');
            const isMissingTerm = ['null', 'n/a', 'undefined', 'missing', 'tbd'].includes(strVal.toLowerCase().replace(/[\[\]]/g, ''));

            if (!value || strVal === '' || isPlaceholder || isMissingTerm) {
                issues.push({
                    rowId: rowIndex,
                    column: col,
                    issueType: "MISSING",
                    suggestion: `Provide value for ${col}`
                });
                return;
            }

            // 3. FORMAT & VALIDITY CHECK

            // A) Phone Format (Strict)
            if (lowerCol.includes('phone') || lowerCol.includes('tel') || lowerCol.includes('cell')) {
                if (strVal.length > 5 && !/^\(\d{3}\) \d{3}-\d{4}$/.test(strVal)) {
                    issues.push({
                        rowId: rowIndex,
                        column: col,
                        issueType: "FORMAT",
                        suggestion: "Standardize phone format"
                    });
                }
            }

            // B) Date Format (ISO 8601)
            else if (lowerCol.includes('date') || lowerCol.includes('dob') || lowerCol.includes('start') || lowerCol.includes('end') || lowerCol.includes('joined')) {
                if (!ISO_DATE_REGEX.test(strVal)) {
                    // Check if it's a parseable date but not ISO
                    if (NON_ISO_DATE_REGEX.test(strVal) || !isNaN(Date.parse(strVal))) {
                        issues.push({
                            rowId: rowIndex,
                            column: col,
                            issueType: "FORMAT",
                            suggestion: "Convert to YYYY-MM-DD"
                        });
                    }
                }
            }

            // C) Currency Format
            else if (lowerCol.includes('price') || lowerCol.includes('cost') || lowerCol.includes('amount') || lowerCol.includes('fee') || lowerCol.includes('revenue') || lowerCol.includes('salary')) {
                if (CURRENCY_SYMBOL_REGEX.test(strVal)) {
                    issues.push({
                        rowId: rowIndex,
                        column: col,
                        issueType: "FORMAT",
                        suggestion: "Remove currency symbol"
                    });
                }
            }

            // D) URL Validation
            else if (lowerCol.includes('url') || lowerCol.includes('website') || lowerCol.includes('link')) {
                if (strVal.length > 3 && !URL_REGEX.test(strVal)) {
                    if (BROKEN_URL_REGEX.test(strVal)) {
                        issues.push({
                            rowId: rowIndex,
                            column: col,
                            issueType: "FORMAT",
                            suggestion: "Add http:// prefix"
                        });
                    } else {
                        issues.push({
                            rowId: rowIndex,
                            column: col,
                            issueType: "FORMAT",
                            suggestion: "Invalid URL format"
                        });
                    }
                }
            }

            // E) US State Validation
            else if (lowerCol === 'state' || lowerCol === 'st' || lowerCol.includes('state code') || lowerCol.endsWith('_state')) {
                if (strVal.length === 2) {
                    if (!US_STATES.has(strVal.toUpperCase())) {
                        issues.push({
                            rowId: rowIndex,
                            column: col,
                            issueType: "VALIDITY",
                            suggestion: "Unknown State Code"
                        });
                    }
                }
                else if (strVal.length > 2) {
                    if ((US_STATES_FULL as any)[strVal.toLowerCase()]) {
                        issues.push({
                            rowId: rowIndex,
                            column: col,
                            issueType: "FORMAT",
                            suggestion: "Convert to 2-letter Code"
                        });
                    }
                }
            }

            // F) General Text Checks
            else if (strVal.length >= 3 && isNaN(Number(strVal))) {
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
                else if (lowerCol.includes('address')) {
                    if (/\b(St|Ave|Rd|Blvd|Dr|Ln|Ct|Pl)\b\.?$/i.test(strVal)) {
                        issues.push({
                            rowId: rowIndex,
                            column: col,
                            issueType: "FORMAT",
                            suggestion: "Expand abbreviation"
                        });
                    }
                }
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
