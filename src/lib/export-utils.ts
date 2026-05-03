import Papa from "papaparse";
import { RowData } from "./store/useWoznyStore";

export const downloadCleanCsv = (
  rows: RowData[],
  columns: string[],
  fileName: string = "clean_data",
) => {
  // 1. Convert to CSV string
  // PapaParse.unparse expects array of objects or array of arrays
  // This function exports the current state of the cleaned data as a CSV file.
  // It serves as a backup mechanism, allowing users to save their work at any point.
  // The primary save mechanism is the automatic persistence via wa-sqlite.

  // 1. Convert to CSV string
  // Or we can just map the data to ordered arrays.

  const csv = Papa.unparse({
    fields: columns,
    data: rows,
  });

  // 2. Create Blob
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

  // 3. Create Link
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  // Modified default filename to emphasize backup nature
  link.setAttribute("download", `${fileName}.csv`);
  link.style.visibility = "hidden";

  // 4. Trigger Download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
