import Papa from 'papaparse';
import { RowData } from './store/useWoznyStore';

export const downloadCleanCsv = (rows: RowData[], columns: string[], fileName: string = 'clean_data') => {
    // 1. Convert to CSV string
    // PapaParse.unparse expects array of objects or array of arrays
    // Our rows are already array of objects (RowData[]) matches columns?
    // We should ensure the order of columns matches 'columns' array though.
    // PapaParse handles this if we pass 'columns' as 'columns' option? 
    // Or we can just map the data to ordered arrays.

    const csv = Papa.unparse({
        fields: columns,
        data: rows
    });

    // 2. Create Blob
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    // 3. Create Link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';

    // 4. Trigger Download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
