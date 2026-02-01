import { RowData, AnalysisIssue } from './store/useWoznyStore';
import {
    US_STATES,
    US_STATES_FULL,
    toTitleCase,
    applyDictionary,
    normalizeDate,
    normalizeCurrency,
    ColumnContext
} from './normalizers';

// --- CONSTANTS & REGEX ---
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const NON_ISO_DATE_REGEX = /^(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4})|(?:\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?,? \d{4})$/i;
const CURRENCY_SYMBOL_REGEX = /[$€£¥₿]/;
const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const BROKEN_URL_REGEX = /^(www\.|[a-z0-9](d+[a-z0-9])+\.[a-z]{2,})/i;

// --- UTILITIES ---

export const getColumnContext = (values: string[], columnName: string): ColumnContext => {
    const lo = columnName.toLowerCase();
    if (lo.includes('city') || lo.includes('borough') || lo.includes('town')) return 'CITY';
    if (lo.includes('state') || lo === 'st' || lo.includes('code')) return 'STATE';

    const sample = values.slice(0, 50).filter(Boolean);
    if (sample.length === 0) return 'GENERAL';

    const stateMatches = sample.filter(v => /^[A-Z]{2}$/.test(v)).length;
    return (stateMatches > sample.length * 0.7) ? 'STATE' : 'GENERAL';
};

// --- ANALYSIS & FIXING ---

export const autoFixRow = (row: RowData, columns: string[], rowIssues: AnalysisIssue[]): RowData => {
    const newRow = { ...row };
    columns.forEach(col => {
        let val = String(newRow[col] || '').trim().replace(/\s+/g, ' ');
        if (!val || (val.startsWith('[') && val.endsWith(']'))) return;
        if (!rowIssues.some(i => i.column === col && i.issueType === 'FORMAT')) return;

        const loCol = col.toLowerCase();
        const context = getColumnContext([], col);

        if (loCol.includes('email')) val = val.toLowerCase();
        else if (loCol.match(/phone|tel|cell/)) val = val.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
        else if (loCol.match(/state|^st$|_state/)) {
            val = val.length === 2 ? val.toUpperCase() : (US_STATES_FULL[val.toLowerCase()] || val);
        }
        else if (loCol.match(/date|dob|start|end|joined/)) val = normalizeDate(val);
        else if (loCol.match(/price|cost|amount|fee|revenue|salary/)) val = normalizeCurrency(val);
        else if (loCol.match(/name|address|city|street|company|borough|role|dept|title|status|method|payment|category|type|industry|product|service|gender|level|group|source|country|region|county|brand|model|color|material|tag|office|position|org/)) {
            val = toTitleCase(applyDictionary(val, context));
        }
        newRow[col] = val;
    });
    return newRow;
};

// Shared Duplicate Detection Logic
export const findDuplicateGroups = (rows: RowData[], columns: string[]): number[][] => {
    const groups: number[][] = [];
    const processedRows = new Set<number>();

    // 1. Exact Duplicates
    const exactMap = new Map<string, number[]>();
    rows.forEach((row, idx) => {
        const finger = columns.map(c => String(row[c] || '').trim().toLowerCase()).join('|');
        if (!exactMap.has(finger)) exactMap.set(finger, []);
        exactMap.get(finger)!.push(idx);
    });

    exactMap.forEach(indices => {
        if (indices.length > 1) {
            groups.push(indices);
            indices.forEach(i => processedRows.add(i));
        }
    });

    // 2. Partial Duplicates
    const keyCols = columns.filter(c => {
        const lo = c.toLowerCase();
        return lo.includes('email') || lo.includes('phone') || (lo.includes('name') && !lo.includes('last'));
    });

    if (keyCols.length > 0) {
        keyCols.forEach(keyCol => {
            const keyMap = new Map<string, number[]>();
            rows.forEach((row, idx) => {
                if (processedRows.has(idx)) return; // Skip if already grouped
                const val = String(row[keyCol] || '').trim().toLowerCase();
                if (!val || val.length < 3) return;

                if (!keyMap.has(val)) keyMap.set(val, []);
                keyMap.get(val)!.push(idx);
            });

            keyMap.forEach(indices => {
                if (indices.length > 1) {
                    groups.push(indices);
                    indices.forEach(i => processedRows.add(i));
                }
            });
        });
    }

    return groups;
};

export const runDeterministicAnalysis = (rows: RowData[], columns: string[]): AnalysisIssue[] => {
    const issues: AnalysisIssue[] = [];
    const contexts: Record<string, ColumnContext> = {};
    columns.forEach(c => contexts[c] = getColumnContext(rows.map(r => String(r[c] || '')), c));

    // Duplicate Check using shared logic
    const duplicateGroups = findDuplicateGroups(rows, columns);
    duplicateGroups.forEach(group => {
        group.forEach((idx, i) => {
            issues.push({
                rowId: idx,
                column: columns[0],
                issueType: "DUPLICATE",
                suggestion: i === 0 ? "Original" : "Duplicate Row"
            });
        });
    });

    // Per-Cell Logic
    rows.forEach((row, idx) => {
        columns.forEach(col => {
            const val = String(row[col] || '').trim();
            const loVal = val.toLowerCase();
            const loCol = col.toLowerCase();

            if (!val || ['null', 'n/a', 'undefined', 'missing', 'tbd'].includes(loVal.replace(/[\[\]]/g, ''))) {
                issues.push({ rowId: idx, column: col, issueType: "MISSING", suggestion: `Missing ${col}` });
                return;
            }

            // Formatting Checks
            if (loCol.match(/phone|tel|cell/) && !/^\(\d{3}\) \d{3}-\d{4}$/.test(val)) issues.push({ rowId: idx, column: col, issueType: "FORMAT", suggestion: "Standardize Phone" });
            else if (loCol.match(/date|dob|start|end|joined/) && !ISO_DATE_REGEX.test(val)) issues.push({ rowId: idx, column: col, issueType: "FORMAT", suggestion: "Use YYYY-MM-DD" });
            else if (loCol.match(/price|cost|amount|fee|revenue|salary/) && (CURRENCY_SYMBOL_REGEX.test(val) || !/^-?\d+\.\d{2}$/.test(val.replace(/[$,€£¥\s,]/g, '')))) {
                issues.push({ rowId: idx, column: col, issueType: "FORMAT", suggestion: "Standardize Currency" });
            }
            else if (loCol.match(/state|^st$|_state/)) {
                if (val.length === 2 && !US_STATES.has(val.toUpperCase())) issues.push({ rowId: idx, column: col, issueType: "VALIDITY", suggestion: "Invalid State" });
                else if (val.length > 2 && US_STATES_FULL[loVal]) issues.push({ rowId: idx, column: col, issueType: "FORMAT", suggestion: "Use 2-letter Code" });
            }
            else if (loCol.match(/url|website|link/) && !URL_REGEX.test(val)) issues.push({ rowId: idx, column: col, issueType: "FORMAT", suggestion: "Fix URL" });
            else if (/[a-zA-Z]/.test(val)) {
                const normalized = toTitleCase(applyDictionary(val, contexts[col]));
                if (val !== normalized) issues.push({ rowId: idx, column: col, issueType: "FORMAT", suggestion: "Fix Casing/Abbr" });
            }
        });
    });

    return issues;
};