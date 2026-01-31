
/**
 * Result of a split operation.
 * Keys = New Column Names (e.g. "Address_Street")
 * Values = The extracted value for this row
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

import { US_STATES, ZIP_LOOKUP } from './us-data';

export const parseAddress = (raw: string): AddressComponents | null => {
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

        // 2a. Dictionary Lookup
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

        // 2b. State Anchor Heuristic
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

    // Strategy 3: Comma Split BUT No Zip
    if (commaParts.length >= 3) {
        const lastPart = commaParts[commaParts.length - 1].toUpperCase();
        if (US_STATES.has(lastPart)) {
            const state = lastPart;
            const city = commaParts[commaParts.length - 2] || '[MISSING]';
            const street = commaParts.slice(0, commaParts.length - 2).join(', ') || '[MISSING]';
            return { Street: street, City: city, State: state, Zip: '[MISSING]' };
        }
    }

    // Strategy 4: Fallback
    return {
        Street: clean,
        City: '[MISSING]',
        State: '[MISSING]',
        Zip: '[MISSING]'
    };
};

export const splitAddressColumn = (
    rows: Record<string, string>[],
    columnName: string
): {
    successCount: number;
    failCount: number;
    results: (AddressComponents | null)[]
} => {
    let successCount = 0;
    let failCount = 0;
    const results: (AddressComponents | null)[] = [];

    rows.forEach(row => {
        const val = row[columnName];
        if (!val) {
            results.push(null);
            return;
        }

        const parsed = parseAddress(val);
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
