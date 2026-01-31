export const US_STATES = new Set([
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC'
]);

// A small sample of major metros for "Exact Inference"
// In a full app, this would be a 2MB JSON file loaded lazily.
export const ZIP_LOOKUP: Record<string, { city: string, state: string }> = {
    // NYC
    '10001': { city: 'New York', state: 'NY' },
    '10002': { city: 'New York', state: 'NY' },
    '10012': { city: 'New York', state: 'NY' },
    // SF
    '94103': { city: 'San Francisco', state: 'CA' },
    '94105': { city: 'San Francisco', state: 'CA' },
    '94107': { city: 'San Francisco', state: 'CA' },
    // Chicago
    '60601': { city: 'Chicago', state: 'IL' },
    // Austin
    '78701': { city: 'Austin', state: 'TX' },
    // Seattle
    '98101': { city: 'Seattle', state: 'WA' },
    // Boston
    '02108': { city: 'Boston', state: 'MA' },
    // Miami
    '33101': { city: 'Miami', state: 'FL' }
};
