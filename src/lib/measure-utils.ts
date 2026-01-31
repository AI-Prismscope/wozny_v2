
/**
 * Utility to measure text width using HTML5 Canvas.
 * This is much faster than rendering to DOM to measure.
 */

let canvas: HTMLCanvasElement | null = null;

export const measureTextWidth = (text: string, font: string = '14px Inter, sans-serif'): number => {
    if (typeof window === 'undefined') return 0;

    if (!canvas) {
        canvas = document.createElement('canvas');
    }

    const context = canvas.getContext('2d');
    if (!context) return 0;

    context.font = font;
    const metrics = context.measureText(text);
    return Math.ceil(metrics.width);
};

/**
 * Calculates optimal column widths based on a sample of rows.
 */
export const calculateColumnWidths = (
    rows: Record<string, string>[],
    columns: string[],
    sampleSize: number = 100
): Record<string, number> => {
    const widths: Record<string, number> = {};
    const MIN_WIDTH = 100;
    const MAX_WIDTH = 500;
    const PADDING = 40; // Space for icons, padding, etc.

    // Sample the rows
    const sample = rows.slice(0, sampleSize);

    columns.forEach(col => {
        // 1. Measure Header Width
        let maxWidth = measureTextWidth(col, 'bold 14px Inter, sans-serif');

        // 2. Measure Sample Data
        sample.forEach(row => {
            const val = row[col];
            if (val) {
                // If it's a [MISSING] placeholder, use the word "Missing" (italicized) width
                const displayVal = val.toUpperCase() === '[MISSING]' ? 'Missing' : val;
                const w = measureTextWidth(displayVal, '14px Inter, sans-serif');
                if (w > maxWidth) maxWidth = w;
            }
        });

        // 3. Final Calculation
        widths[col] = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, maxWidth + PADDING));
    });

    return widths;
};
