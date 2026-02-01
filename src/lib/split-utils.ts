import { ZIP_LOOKUP } from './us-data';
import { US_STATES, toTitleCase } from './normalizers';

export type SplitType = 'ADDRESS' | 'NAME' | 'NONE';
export interface AddressComponents { Street: string; City: string; State: string; Zip: string; }
export interface NameComponents { First: string; Middle: string; Last: string; }

// Internal Utility to keep UI consistent

// Keywords that suggest a column is Categorical/Business, not a Person's Name
const BUSINESS_KEYWORDS = new Set([
    'corp', 'inc', 'llc', 'group', 'firm', 'public', 'private', 'organization', 'org', 'practice', 'nonprofit', 'company', 'associates', 'limited', 'ltd', 'dept', 'department', 'trust', 'partners'
]);

export const getSplittableType = (values: string[]): SplitType => {
    if (!values?.length) return 'NONE';
    const sample = values.slice(0, 30).filter(Boolean); // Slightly larger sample for cardinality
    if (sample.length < 5) return 'NONE';

    // 1. Cardinality Check (Categorical vs Unique)
    // If we have many repeating values in a small sample, it's definitely Categorical.
    const uniqueValues = new Set(sample.map(v => v.trim().toLowerCase()));
    const uniquenessRatio = uniqueValues.size / sample.length;
    if (uniquenessRatio < 0.7) return 'NONE'; // Too many repeats = Categorical

    let addressCount = 0, nameCount = 0;

    sample.forEach(val => {
        const lo = val.toLowerCase();

        // Address: Ends in Zip OR has Street Suffix
        if (/\b\d{5}(-\d{4})?\b$/.test(val) || /\b(St|Ave|Rd|Blvd|Ln|Dr|Way|Ct|Pl|Street|Avenue|Road)\b/i.test(val)) {
            addressCount++;
        }
        // Name: 2-3 words, no numbers, NO business keywords
        else if (/^[^\d]+$/.test(val)) {
            const parts = val.trim().split(/\s+/);
            const hasBusinessKeyword = parts.some(p => BUSINESS_KEYWORDS.has(p.toLowerCase()));

            if (parts.length >= 2 && parts.length <= 3 && !hasBusinessKeyword) {
                nameCount++;
            }
        }
    });

    if (addressCount > sample.length * 0.4) return 'ADDRESS';
    if (nameCount > sample.length * 0.4) return 'NAME';
    return 'NONE';
};

export const parseFullName = (raw: string): NameComponents | null => {
    if (!raw || raw.length < 2) return null;
    const clean = raw.replace(/\b(Mr|Ms|Mrs|Dr|Prof)\.?\s+/i, '').trim();
    const parts = clean.split(/\s+/).filter(p => p.length > 0);

    const res = {
        First: toTitleCase(parts[0] || ''),
        Middle: parts.length > 2 ? toTitleCase(parts.slice(1, -1).join(' ')) : '',
        Last: toTitleCase(parts[parts.length - 1] || '')
    };
    return res.First ? res : null;
};

export const parseAddress = (raw: string): AddressComponents => {
    const fallback: AddressComponents = { Street: raw, City: '[MISSING]', State: '[MISSING]', Zip: '[MISSING]' };

    // Security: Truncate or reject extremely long strings to prevent ReDoS
    if (!raw || raw.length < 5 || raw.length > 200) return fallback;

    const clean = raw.trim();

    // 1. ZIP ANCHOR STRATEGY (Highest Accuracy)
    const zipMatch = clean.match(/\b(\d{5}(?:-\d{4})?)\b$/);
    if (zipMatch) {
        const zip = zipMatch[1];
        const lookup = ZIP_LOOKUP[zip];
        if (lookup) {
            // HYBRID STRATEGY: 
            // 1. Try to use Suffix Pattern to physically separate Street from "City in Text" (e.g. "Manhattan")
            // This is critical because "text city" (Manhattan) might differ from "lookup city" (New York),
            // and simple string replacement would fail to remove "Manhattan".
            // ROBUSTNESS UPDATE: Added \.? to handle "Blvd." and expanded suffix list (Pkwy, Cir, etc.)
            const suffixMatch = clean.match(/^(.*?\b(?:St|Ave|Rd|Blvd|Dr|Ln|Way|Ct|Pl|Street|Avenue|Road|Pkwy|Cir|Sq|Aly|Hwy)\.?)\s+(.*?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i);

            if (suffixMatch) {
                // Winning Combo: Accurate Street split + Standardized City from Lookup
                return {
                    Street: toTitleCase(suffixMatch[1].trim()),
                    City: lookup.city, // Normalize "Manhattan" -> "New York"
                    State: lookup.state,
                    Zip: zip
                };
            }

            // 2. Fallback: Try to remove the Canonical City/State from string
            // (Works only if text matches lookup, e.g. "New York" == "New York")
            let street = clean.replace(zip, '').trim();
            street = street.replace(new RegExp(`,?\\s*${lookup.state}\\b`, 'i'), '');
            // Attempt to remove canonical city. If it fails, we return street as-is (imperfect but safe)
            street = street.replace(new RegExp(`,?\\s*${lookup.city}\\b`, 'i'), '').replace(/,$/, '');

            return { Street: toTitleCase(street) || '[MISSING]', City: lookup.city, State: lookup.state, Zip: zip };
        }

        // 1b. Suffix-Aware Pattern Fallback
        // Matches: "222 Main St Brooklyn NY 11215"
        // Anchor on common street suffixes to separate street from city accurately.
        // ROBUSTNESS UPDATE: Added \.? and expanded list
        const suffixMatch = clean.match(/^(.*?\b(?:St|Ave|Rd|Blvd|Dr|Ln|Way|Ct|Pl|Street|Avenue|Road|Pkwy|Cir|Sq|Aly|Hwy)\.?)\s+(.*?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i);
        if (suffixMatch && US_STATES.has(suffixMatch[3].toUpperCase())) {
            return {
                Street: toTitleCase(suffixMatch[1].trim()),
                City: toTitleCase(suffixMatch[2].trim()) || '[MISSING]',
                State: suffixMatch[3].toUpperCase(),
                Zip: zip
            };
        }

        // 1c. Simple Pattern Fallback (Greedy Street, One Word City)
        // Matches: "123 Main Brooklyn NY 11215"
        // SECURITY UPDATE: Changed (.*) to (.*?) non-greedy match to prevent catastrophic backtracking
        const generalMatch = clean.match(/^(.*?)\s+([^,0-9\s]+)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i);
        if (generalMatch && US_STATES.has(generalMatch[3].toUpperCase())) {
            return {
                Street: toTitleCase(generalMatch[1].trim()),
                City: toTitleCase(generalMatch[2].trim()),
                State: generalMatch[3].toUpperCase(),
                Zip: zip
            };
        }
    }

    // 2. COMMA DELIMITED STRATEGY
    const parts = clean.split(',').map(s => s.trim());
    if (parts.length >= 3) {
        return {
            Street: toTitleCase(parts.slice(0, parts.length - 2).join(', ')),
            City: toTitleCase(parts[parts.length - 2]),
            State: parts[parts.length - 1].toUpperCase().slice(0, 2),
            Zip: zipMatch ? zipMatch[1] : '[MISSING]'
        };
    }

    return fallback;
};

export const smartSplitColumn = (rows: Record<string, string>[], columnName: string, type: SplitType) => {
    const results = rows.map(row => {
        const val = row[columnName];
        if (!val) return null;
        return type === 'ADDRESS' ? parseAddress(val) : type === 'NAME' ? parseFullName(val) : null;
    });

    return {
        successCount: results.filter(r => r && !Object.values(r).includes('[MISSING]')).length,
        failCount: results.filter(r => !r || Object.values(r).includes('[MISSING]')).length,
        results
    };
};