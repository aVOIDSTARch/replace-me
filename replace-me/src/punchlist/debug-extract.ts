/**
 * debug-extract.ts
 * Temporary debug script — dumps raw page text to console so we can
 * see exactly what pdfjs gives us and tune the parser accordingly.
 * Import this from main.ts temporarily, call debugExtract(file).
 */

import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

export async function debugExtract(file: File): Promise<void> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  // Just dump pages 1 and 2 — enough to see the pattern
  for (let p = 1; p <= Math.min(2, pdf.numPages); p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    console.group(`=== PAGE ${p} ===`);
    for (const item of content.items) {
      if ('str' in item && item.str.trim()) {
        const tx = (item as { transform: number[] }).transform;
        console.log(`y=${tx[5].toFixed(1)} x=${tx[4].toFixed(1)} | "${item.str}"`);
      }
    }
    console.groupEnd();
    page.cleanup();
  }
}
