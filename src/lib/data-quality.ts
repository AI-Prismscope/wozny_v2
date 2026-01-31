import { RowData, AnalysisIssue } from './store/useWoznyStore';

// --- CONSTANTS & REGEX ---
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const NON_ISO_DATE_REGEX = /^(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4})|(?:\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?,? \d{4})$/i;
const CURRENCY_SYMBOL_REGEX = /[$€£¥₿]/;
const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const BROKEN_URL_REGEX = /^(www\.|[a-z0-9](d+[a-z0-9])+\.[a-z]{2,})/i;

const US_STATES = new Set(["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"]);

const US_STATES_FULL: Record<string, string> = { "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD", "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT", "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY", "district of columbia": "DC" };

const CITY_MAP: Record<string, string> = {
    "la": "Los Angeles", "sf": "San Francisco", "nyc": "New York City",
    "bklyn": "Brooklyn", "manh": "Manhattan", "philly": "Philadelphia",
    "atl": "Atlanta", "chi": "Chicago", "sea": "Seattle", "mia": "Miami",
    "bos": "Boston", "dal": "Dallas", "dc": "Washington D.C.", "sd": "San Diego",
    "pdx": "Portland", "austin": "Austin"
};

const NORMALIZATION_DICTIONARY: Record<string, string> = {
    "st": "Street", "st.": "Street", "ave": "Avenue", "ave.": "Avenue", "rd": "Road", "rd.": "Road", "blvd": "Boulevard", "blvd.": "Boulevard", "dr": "Drive", "dr.": "Drive", "ln": "Lane", "ln.": "Lane", "ct": "Court", "ct.": "Court", "pl": "Place", "pl.": "Place",
    "mgr": "Manager", "dept": "Department", "asst": "Assistant", "dir": "Director", "vp": "Vice President", "v.p.": "Vice President"
};

export type ColumnContext = 'CITY' | 'STATE' | 'GENERAL';

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

export const toTitleCase = (str: string): string => str.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substring(1).toLowerCase());

export const applyDictionary = (str: string, context: ColumnContext = 'GENERAL'): string => {
    if (!str) return str;
    return str.split(/(\s+|,|\.|\/)/).map(token => {
        const lo = token.toLowerCase();
        const clean = lo.endsWith('.') ? lo.slice(0, -1) : lo;

        // 1. Context-Specific City Expansion
        if (context === 'CITY') {
            if (CITY_MAP[lo]) return CITY_MAP[lo];
            if (CITY_MAP[clean]) return CITY_MAP[clean];
        }

        // 2. General Expansion (Address/Roles)
        return NORMALIZATION_DICTIONARY[lo] || NORMALIZATION_DICTIONARY[clean] || token;
    }).join('');
};

export const normalizeDate = (str: string): string => {
    const ts = Date.parse(str.trim());
    if (isNaN(ts)) {
        const match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
        if (match) {
            let [_, m, d, y] = match;
            y = y.length === 2 ? `20${y}` : y;
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        return str;
    }
    return new Date(ts).toISOString().split('T')[0];
};

export const normalizeCurrency = (str: string): string => {
    const num = parseFloat(str.replace(/[^\d.-]/g, ''));
    return !isNaN(num) ? (Math.round(num * 100) / 100).toFixed(2) : str;
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

export const runDeterministicAnalysis = (rows: RowData[], columns: string[]): AnalysisIssue[] => {
    const issues: AnalysisIssue[] = [];
    const contexts: Record<string, ColumnContext> = {};
    columns.forEach(c => contexts[c] = getColumnContext(rows.map(r => String(r[c] || '')), c));

    // Duplicate Check
    const idCols = columns.filter(c => c.toLowerCase().match(/name|address|email/));
    const exactMap = new Map<string, number[]>();

    rows.forEach((row, idx) => {
        const finger = columns.map(c => String(row[c] || '').trim().toLowerCase()).join('|');
        if (!exactMap.has(finger)) exactMap.set(finger, []);
        exactMap.get(finger)!.push(idx);
    });

    exactMap.forEach(indices => {
        if (indices.length > 1) indices.forEach((idx, i) => issues.push({ rowId: idx, column: columns[0], issueType: "DUPLICATE", suggestion: i === 0 ? "Original" : "Duplicate" }));
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