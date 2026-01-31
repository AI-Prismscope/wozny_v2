import { US_STATES, ZIP_LOOKUP } from './us-data';

export type SplitType = 'ADDRESS' | 'NAME' | 'NONE';
export interface AddressComponents { Street: string; City: string; State: string; Zip: string; }
export interface NameComponents { First: string; Middle: string; Last: string; }

// Internal Utility to keep UI consistent
const toTitleCase = (str: string): string => str.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substring(1).toLowerCase());

export const getSplittableType = (values: string[]): SplitType => {
    if (!values?.length) return 'NONE';
    let addressCount = 0, nameCount = 0;
    const sample = values.slice(0, 20).filter(Boolean);

    sample.forEach(val => {
        // Address: Ends in Zip OR has Street Suffix
        if (/\b\d{5}(-\d{4})?\b$/.test(val) || /\b(St|Ave|Rd|Blvd|Ln|Dr|Way|Ct|Pl|Street|Avenue|Road)\b/i.test(val)) addressCount++;
        // Name: 2-4 words, no numbers
        else if (/^[^\d]+$/.test(val) && val.trim().split(/\s+/).length >= 2) nameCount++;
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
    if (!raw || raw.length < 5) return fallback;

    const clean = raw.trim();

    // 1. ZIP ANCHOR STRATEGY (Highest Accuracy)
    const zipMatch = clean.match(/\b(\d{5}(?:-\d{4})?)\b$/);
    if (zipMatch) {
        const zip = zipMatch[1];
        const lookup = ZIP_LOOKUP[zip];
        if (lookup) {
            let street = clean.replace(zip, '').trim();
            // Remove state and city if they exist in the string to isolate the street
            street = street.replace(new RegExp(`,?\\s*${lookup.state}\\b`, 'i'), '');
            street = street.replace(new RegExp(`,?\\s*${lookup.city}\\b`, 'i'), '').replace(/,$/, '');
            return { Street: toTitleCase(street) || '[MISSING]', City: lookup.city, State: lookup.state, Zip: zip };
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