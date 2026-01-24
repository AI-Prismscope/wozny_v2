import Papa from 'papaparse';
import { RowData } from '@/lib/store/useWoznyStore';

export const parseCsvFile = (file: File): Promise<{ data: RowData[]; columns: string[] }> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transform: (value) => {
                // Normalization Rule: " ", null, undefined -> "[MISSING]"
                const trimmed = value.trim();
                if (!trimmed || trimmed === '') return "[MISSING]";
                return trimmed;
            },
            complete: (results) => {
                if (results.meta.fields) {
                    resolve({
                        data: results.data as RowData[],
                        columns: results.meta.fields
                    });
                } else {
                    reject(new Error("Could not detect CSV headers."));
                }
            },
            error: (error) => {
                reject(error);
            }
        });
    });
};
