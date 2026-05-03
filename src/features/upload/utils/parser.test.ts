import { describe, it, expect } from 'vitest';
import { parseCsvFile } from './parser';

/**
 * Helper to create a File object from CSV string content
 */
function createCsvFile(content: string, filename = 'test.csv'): File {
    const blob = new Blob([content], { type: 'text/csv' });
    return new File([blob], filename, { type: 'text/csv' });
}

describe('CSV Parser', () => {
    describe('Basic Functionality', () => {
        it('should parse valid CSV with headers', async () => {
            const csv = 'Name,Age,City\nJohn,30,NYC\nJane,25,LA';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.columns).toEqual(['Name', 'Age', 'City']);
            expect(result.data).toHaveLength(2);
            expect(result.data[0]).toEqual({ Name: 'John', Age: '30', City: 'NYC' });
            expect(result.data[1]).toEqual({ Name: 'Jane', Age: '25', City: 'LA' });
        });

        it('should handle single row of data', async () => {
            const csv = 'Name,Age\nJohn,30';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.columns).toEqual(['Name', 'Age']);
            expect(result.data).toHaveLength(1);
            expect(result.data[0]).toEqual({ Name: 'John', Age: '30' });
        });

        it('should handle multiple columns', async () => {
            const csv = 'A,B,C,D,E,F\n1,2,3,4,5,6';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.columns).toHaveLength(6);
            expect(result.data[0]).toEqual({ A: '1', B: '2', C: '3', D: '4', E: '5', F: '6' });
        });
    });

    describe('Missing Value Handling', () => {
        it('should replace empty strings with [MISSING]', async () => {
            const csv = 'Name,Age,City\nJohn,,NYC';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data[0]).toEqual({ Name: 'John', Age: '[MISSING]', City: 'NYC' });
        });

        it('should replace whitespace-only values with [MISSING]', async () => {
            const csv = 'Name,Age,City\nJohn,  ,NYC';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data[0]).toEqual({ Name: 'John', Age: '[MISSING]', City: 'NYC' });
        });

        it('should handle multiple missing values in a row', async () => {
            const csv = 'A,B,C,D\n1,,,4';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data[0]).toEqual({ 
                A: '1', 
                B: '[MISSING]', 
                C: '[MISSING]', 
                D: '4' 
            });
        });

        it('should handle row with all missing values', async () => {
            const csv = 'A,B,C\n,,';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data[0]).toEqual({ 
                A: '[MISSING]', 
                B: '[MISSING]', 
                C: '[MISSING]' 
            });
        });
    });

    describe('Whitespace Handling', () => {
        it('should trim leading whitespace', async () => {
            const csv = 'Name,Age\n  John,30';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data[0].Name).toBe('John');
        });

        it('should trim trailing whitespace', async () => {
            const csv = 'Name,Age\nJohn  ,30';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data[0].Name).toBe('John');
        });

        it('should trim both leading and trailing whitespace', async () => {
            const csv = 'Name,Age\n  John  ,  30  ';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data[0]).toEqual({ Name: 'John', Age: '30' });
        });

        it('should preserve internal whitespace', async () => {
            const csv = 'Name,Age\nJohn Doe,30';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data[0].Name).toBe('John Doe');
        });
    });

    describe('Empty Lines', () => {
        it('should skip empty lines between data rows', async () => {
            const csv = 'Name,Age\nJohn,30\n\nJane,25';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data).toHaveLength(2);
            expect(result.data[0].Name).toBe('John');
            expect(result.data[1].Name).toBe('Jane');
        });

        it('should skip multiple consecutive empty lines', async () => {
            const csv = 'Name,Age\nJohn,30\n\n\n\nJane,25';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data).toHaveLength(2);
        });

        it('should skip trailing empty lines', async () => {
            const csv = 'Name,Age\nJohn,30\n\n\n';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data).toHaveLength(1);
        });
    });

    describe('Quoted Fields', () => {
        it('should handle quoted fields with commas', async () => {
            const csv = 'Name,Address\nJohn,"123 Main St, Apt 4"';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data[0].Address).toBe('123 Main St, Apt 4');
        });

        it('should handle quoted fields with newlines', async () => {
            const csv = 'Name,Address\nJohn,"123 Main St\nApt 4"';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data[0].Address).toBe('123 Main St\nApt 4');
        });

        it('should handle quoted empty string', async () => {
            const csv = 'Name,Age\nJohn,""';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            // Empty quoted string should still become [MISSING] after trim
            expect(result.data[0].Age).toBe('[MISSING]');
        });
    });

    describe('Special Characters', () => {
        it('should handle special characters in data', async () => {
            const csv = 'Name,Email\nJohn,john@example.com';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data[0].Email).toBe('john@example.com');
        });

        it('should handle unicode characters', async () => {
            const csv = 'Name,City\nJohn,São Paulo';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data[0].City).toBe('São Paulo');
        });

        it('should handle emoji', async () => {
            const csv = 'Name,Status\nJohn,Happy 😊';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data[0].Status).toBe('Happy 😊');
        });
    });

    describe('Edge Cases', () => {
        it('should handle headers only (no data rows)', async () => {
            const csv = 'Name,Age,City';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.columns).toEqual(['Name', 'Age', 'City']);
            expect(result.data).toHaveLength(0);
        });

        it('should handle single column CSV', async () => {
            const csv = 'Name\nJohn\nJane';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.columns).toEqual(['Name']);
            expect(result.data).toHaveLength(2);
            expect(result.data[0]).toEqual({ Name: 'John' });
        });

        it('should handle numeric values as strings', async () => {
            const csv = 'ID,Amount\n123,456.78';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data[0]).toEqual({ ID: '123', Amount: '456.78' });
        });

        it('should handle boolean-like values as strings', async () => {
            const csv = 'Active,Verified\ntrue,false';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data[0]).toEqual({ Active: 'true', Verified: 'false' });
        });
    });

    describe('Error Handling', () => {
        it('should handle empty file gracefully', async () => {
            // Papa.parse handles empty files by returning empty arrays
            const csv = '';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            // Empty file results in empty data and columns
            expect(result.columns).toEqual([]);
            expect(result.data).toEqual([]);
        });

        it('should handle malformed CSV gracefully', async () => {
            // Papa.parse is quite forgiving, but we can test edge cases
            const csv = 'Name,Age\nJohn,30,ExtraColumn';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            // Papa.parse should handle this - extra columns are typically ignored
            expect(result.columns).toEqual(['Name', 'Age']);
            expect(result.data[0]).toHaveProperty('Name', 'John');
        });
    });

    describe('Different Line Endings', () => {
        it('should handle Windows line endings (CRLF)', async () => {
            const csv = 'Name,Age\r\nJohn,30\r\nJane,25';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data).toHaveLength(2);
            expect(result.data[0].Name).toBe('John');
        });

        it('should handle Unix line endings (LF)', async () => {
            const csv = 'Name,Age\nJohn,30\nJane,25';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data).toHaveLength(2);
            expect(result.data[0].Name).toBe('John');
        });

        it('should handle consistent line endings', async () => {
            // Test that parser handles standard line endings correctly
            const csv = 'Name,Age\nJohn,30\nJane,25';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data).toHaveLength(2);
            expect(result.data[0].Name).toBe('John');
            expect(result.data[1].Name).toBe('Jane');
        });
    });

    describe('Real-world Scenarios', () => {
        it('should handle typical customer data', async () => {
            const csv = `First Name,Last Name,Email,Phone,City,State
John,Doe,john@example.com,555-1234,New York,NY
Jane,Smith,jane@example.com,,Los Angeles,CA
Bob,Johnson,,555-5678,Chicago,IL`;
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data).toHaveLength(3);
            expect(result.data[1].Phone).toBe('[MISSING]');
            expect(result.data[2].Email).toBe('[MISSING]');
        });

        it('should handle financial data with currency symbols', async () => {
            const csv = 'Product,Price,Quantity\nWidget,$19.99,10\nGadget,$29.99,5';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data[0].Price).toBe('$19.99');
            expect(result.data[1].Price).toBe('$29.99');
        });

        it('should handle dates in various formats', async () => {
            const csv = 'Event,Date\nMeeting,2024-01-15\nConference,01/20/2024';
            const file = createCsvFile(csv);
            
            const result = await parseCsvFile(file);
            
            expect(result.data[0].Date).toBe('2024-01-15');
            expect(result.data[1].Date).toBe('01/20/2024');
        });
    });
});
