
/**
 * Types of data we can intelligently split
 */
export type SplitType = 'ADDRESS' | 'NAME' | 'NONE';

/**
 * Result of a split operation.
 */
export type SplitResult = Record<string, string>;

/**
 * Standard Address Components
 */
export interface AddressComponents {
    Street: string;
    City: string;
    State: string;
    Zip: string;
}

/**
 * Standard Name Components
 */
export interface NameComponents {
    First: string;
    Middle: string;
    Last: string;
}

import { US_STATES, ZIP_LOOKUP } from './us-data';

/**
 * Determines if a column is splittable and what strategy to use.
 * Samples first 20 rows.
 */
export const getSplittableType = (values: string[]): SplitType => {
    if (!values || values.length === 0) return 'NONE';

    let addressCount = 0;
    let nameCount = 0;
    const sampleSize = Math.min(values.length, 20);

    for (let i = 0; i < sampleSize; i++) {
        const val = (values[i] || '').trim();
        if (!val) continue;

        // Address Check (Street Endings or Zip/State codes)
        if (
            val.match(/\b(\d{5}(?:-\d{4})?)\b$/) || // Ends in Zip
            val.match(/\b(St|Ave|Rd|Blvd|Ln|Dr|Way|Ct|Pl|Street|Avenue|Road|Drive|Lane)\b\.?/i) || // Contains Street Suffix
            val.split(',').length >= 3 // Likely Comma Separated Address
        ) {
            addressCount++;
        }
        // Name Check (2-3 Words, No digits)
        else if (
            val.split(/\s+/).length >= 2 &&
            val.split(/\s+/).length <= 4 &&
            !/\d/.test(val)
        ) {
            nameCount++;
        }
    }

    if (addressCount > sampleSize * 0.4) return 'ADDRESS';
    if (nameCount > sampleSize * 0.4) return 'NAME';
    return 'NONE';
};

export const parseFullName = (raw: string): NameComponents | null => {
    if (!raw || raw.length < 2) return null;

    // Clean common prefixes
    const clean = raw.replace(/\b(Mr|Ms|Mrs|Dr|Prof)\.?\s+/i, '').trim();
    const parts = clean.split(/\s+/).filter(p => p.length > 0);

    if (parts.length === 2) {
        return { First: parts[0], Middle: '', Last: parts[1] };
    }
    if (parts.length === 3) {
        return { First: parts[0], Middle: parts[1], Last: parts[2] };
    }
    if (parts.length > 3) {
        return { First: parts[0], Middle: parts.slice(1, -1).join(' '), Last: parts[parts.length - 1] };
    }

    return null;
};

export const parseAddress = (raw: string): AddressComponents | null => {
    // ... (rest of the existing parseAddress remains same or improved)
    if (!raw || raw.length < 5) return null;
    const clean = raw.trim();

    // Strategy 1: Explicit Comma Separation (High Confidence)
    const commaParts = clean.split(',').map(s => s.trim());

    if (commaParts.length >= 3) {
        let zip = commaParts[commaParts.length - 1];
        let state = commaParts[commaParts.length - 2];
        let city = commaParts[commaParts.length - 3];
        let street = commaParts.slice(0, commaParts.length - 3).join(', ');

        const stateZipMatch = zip.match(/([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/);
        if (stateZipMatch) {
            state = stateZipMatch[1];
            zip = stateZipMatch[2];
            city = commaParts[commaParts.length - 2];
            street = commaParts.slice(0, commaParts.length - 2).join(', ');
            return {
                Street: street || '[MISSING]',
                City: city || '[MISSING]',
                State: state || '[MISSING]',
                Zip: zip || '[MISSING]'
            };
        }

        if (zip.match(/^\d{5}(?:-\d{4})?$/) && US_STATES.has(state.toUpperCase())) {
            return {
                Street: street || '[MISSING]',
                City: city || '[MISSING]',
                State: state || '[MISSING]',
                Zip: zip || '[MISSING]'
            };
        }
    }

    // Strategy 2: Zip-First Anchor
    const zipMatch = clean.match(/\b(\d{5}(?:-\d{4})?)\b$/);
    if (zipMatch) {
        const zip = zipMatch[1];

        if (ZIP_LOOKUP[zip]) {
            const { city, state } = ZIP_LOOKUP[zip];
            let remainder = clean.replace(zip, '').trim();
            if (remainder.endsWith(state)) remainder = remainder.slice(0, -state.length).trim();
            if (remainder.endsWith(',')) remainder = remainder.slice(0, -1).trim();
            if (remainder.toLowerCase().endsWith(city.toLowerCase())) {
                remainder = remainder.slice(0, -city.length).trim();
            }
            if (remainder.endsWith(',')) remainder = remainder.slice(0, -1).trim();

            return {
                Street: remainder || '[MISSING]',
                City: city || '[MISSING]',
                State: state || '[MISSING]',
                Zip: zip || '[MISSING]'
            };
        }

        const preZip = clean.replace(zip, '').trim();
        const preZipClean = preZip.replace(/,$/, '').trim();
        const lastTwo = preZipClean.slice(-2).toUpperCase();

        if (US_STATES.has(lastTwo)) {
            const state = lastTwo;
            let streetCity = preZipClean.slice(0, -2).trim();
            if (streetCity.endsWith(',')) streetCity = streetCity.slice(0, -1).trim();

            const streetEndRegex = /\b(St|Ave|Rd|Blvd|Ln|Dr|Way|Ct|Pl|Street|Avenue|Road|Drive|Lane|Circle)\b\.?$/i;
            const splitMatch = streetCity.match(streetEndRegex);

            if (splitMatch && splitMatch.index !== undefined) {
                const splitPoint = splitMatch.index + splitMatch[0].length;
                const street = streetCity.slice(0, splitPoint).trim();
                let city = streetCity.slice(splitPoint).trim();
                if (city.startsWith(',')) city = city.slice(1).trim();

                return {
                    Street: street || '[MISSING]',
                    City: city || '[MISSING]',
                    State: state || '[MISSING]',
                    Zip: zip || '[MISSING]'
                };
            }

            const lastSpace = streetCity.lastIndexOf(' ');
            if (lastSpace > 0) {
                return {
                    Street: streetCity.slice(0, lastSpace).trim() || '[MISSING]',
                    City: streetCity.slice(lastSpace).trim() || '[MISSING]',
                    State: state || '[MISSING]',
                    Zip: zip || '[MISSING]'
                };
            }
        }
    }

    if (commaParts.length >= 3) {
        const lastPart = commaParts[commaParts.length - 1].toUpperCase();
        if (US_STATES.has(lastPart)) {
            const state = lastPart;
            const city = commaParts[commaParts.length - 2] || '[MISSING]';
            const street = commaParts.slice(0, commaParts.length - 2).join(', ') || '[MISSING]';
            return { Street: street, City: city, State: state, Zip: '[MISSING]' };
        }
    }

    return {
        Street: clean,
        City: '[MISSING]',
        State: '[MISSING]',
        Zip: '[MISSING]'
    };
};

export const smartSplitColumn = (
    rows: Record<string, string>[],
    columnName: string,
    type: SplitType
): {
    successCount: number;
    failCount: number;
    results: (Record<string, string> | null)[]
} => {
    let successCount = 0;
    let failCount = 0;
    const results: (Record<string, string> | null)[] = [];

    rows.forEach(row => {
        const val = row[columnName];
        if (!val) {
            results.push(null);
            return;
        }

        let parsed: Record<string, string> | null = null;
        if (type === 'ADDRESS') parsed = parseAddress(val) as any;
        else if (type === 'NAME') parsed = parseFullName(val) as any;

        if (parsed) {
            successCount++;
            results.push(parsed);
        } else {
            failCount++;
            results.push(null);
        }
    });

    return { successCount, failCount, results };
};
