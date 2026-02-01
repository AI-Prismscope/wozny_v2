export type ColumnContext = 'CITY' | 'STATE' | 'GENERAL';

// --- DATA CONSTANTS ---

export const US_STATES = new Set(["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"]);

export const US_STATES_FULL: Record<string, string> = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD", "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT", "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY", "district of columbia": "DC"
};

export const CITY_MAP: Record<string, string> = {
    "la": "Los Angeles", "sf": "San Francisco", "nyc": "New York",
    "bklyn": "Brooklyn", "manh": "Manhattan", "philly": "Philadelphia",
    "atl": "Atlanta", "chi": "Chicago", "sea": "Seattle", "mia": "Miami",
    "bos": "Boston", "dal": "Dallas", "dc": "Washington", "sd": "San Diego",
    "pdx": "Portland", "austin": "Austin"
};

export const NORMALIZATION_DICTIONARY: Record<string, string> = {
    "st": "Street", "st.": "Street", "ave": "Avenue", "ave.": "Avenue", "rd": "Road", "rd.": "Road", "blvd": "Boulevard", "blvd.": "Boulevard", "dr": "Drive", "dr.": "Drive", "ln": "Lane", "ln.": "Lane", "ct": "Court", "ct.": "Court", "pl": "Place", "pl.": "Place",
    "mgr": "Manager", "dept": "Department", "asst": "Assistant", "dir": "Director", "vp": "Vice President", "v.p.": "Vice President"
};

// --- FUNCTIONS ---

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
