/**
 * parser.ts
 * Deterministic extraction of Aristokraft/Masterbrand punch items from PDF.
 * Uses pdfjs-dist text layer — no AI, no heuristics beyond positional grouping.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Point the worker at the bundled worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

export interface PunchItem {
  originalIndex: number; // item number in the full PDF list
  description: string;
  assignedTo: string;
  pageNumber: number;
  imageCount: number; // how many images were on that page (for zip naming)
}

export interface ParseResult {
  items: PunchItem[];       // only our items
  totalInDoc: number;       // total items found across all subs
  pageCount: number;
}

const OUR_SUBS = ['aristokraft', 'masterbrand'];

function isOurSub(value: string): boolean {
  const lower = value.toLowerCase().trim();
  return OUR_SUBS.some(s => lower.includes(s));
}

/**
 * Extract all text items from a page with their Y positions,
 * returned as lines grouped by approximate Y coordinate.
 */
interface TextLine {
  y: number;
  text: string;
}

async function getPageLines(page: pdfjsLib.PDFPageProxy): Promise<TextLine[]> {
  const content = await page.getTextContent();
  // Group text items by rounded Y (within 3px = same line)
  const lineMap = new Map<number, string[]>();

  for (const item of content.items) {
    if (!('str' in item)) continue;
    const str = item.str.trim();
    if (!str) continue;
    const rawY = (item as { transform: number[] }).transform[5];
    const y = Math.round(rawY / 3) * 3;
    if (!lineMap.has(y)) lineMap.set(y, []);
    lineMap.get(y)!.push(str);
  }

  return Array.from(lineMap.entries())
    .map(([y, parts]) => ({ y, text: parts.join(' ') }))
    .sort((a, b) => b.y - a.y); // PDF y=0 is bottom, so descending = top-to-bottom
}

/**
 * Main parse function. Returns filtered results and metadata.
 */
export async function parsePunchList(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = pdf.numPages;

  // Collect all text lines across all pages with page number
  interface PageLine extends TextLine { page: number; }
  const allLines: PageLine[] = [];

  for (let p = 1; p <= pageCount; p++) {
    const page = await pdf.getPage(p);
    const lines = await getPageLines(page);
    for (const line of lines) {
      allLines.push({ ...line, page: p });
    }
    page.cleanup();
  }

  // ── Parse items ─────────────────────────────────────────────────────────
  // Strategy: scan for "Issue #" or just a standalone integer that appears
  // before an "Issue" text block. The Punch List app format repeats a block:
  //   <number>
  //   <status>         (Incomplete / Complete)
  //   <assignTo>
  //   <issue text…>
  //
  // We detect item boundaries by finding lines that are purely numeric,
  // preceded or followed closely by "Incomplete" or "Complete".

  interface RawItem {
    index: number;
    description: string;
    assignedTo: string;
    page: number;
  }

  const rawItems: RawItem[] = [];

  // Build a flat ordered list of non-empty text lines
  const lines = allLines.map(l => ({ text: l.text, page: l.page }));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect item number: a line that is just a number (1–999)
    if (!/^\d{1,3}$/.test(line.text)) continue;
    const itemNum = parseInt(line.text, 10);

    // Look ahead up to 10 lines for status + assignTo + issue text
    const window = lines.slice(i + 1, i + 20);
    const windowTexts = window.map(w => w.text);

    // Find "Incomplete" or "Complete" — must be nearby
    const statusIdx = windowTexts.findIndex(t =>
      /^(in)?complete$/i.test(t)
    );
    if (statusIdx === -1 || statusIdx > 8) continue;

    // assignTo is the line after status
    const assignToIdx = statusIdx + 1;
    if (assignToIdx >= windowTexts.length) continue;
    const assignedTo = windowTexts[assignToIdx];

    // Issue description: collect lines between item number and status
    // that aren't "Resolution Date", "Assign To", "Floor", "Room", etc.
    const skipLabels = /^(floor|room|sheet|status|assign\s*to|resolution\s*date|comment|issue\s*#?|issue)$/i;
    const descLines: string[] = [];

    // Lines before status that aren't label words
    for (let j = 0; j < statusIdx; j++) {
      const t = windowTexts[j];
      if (!skipLabels.test(t) && t.length > 1) {
        descLines.push(t);
      }
    }

    // Also grab lines after assignTo until next number or known label
    for (let j = assignToIdx + 1; j < windowTexts.length; j++) {
      const t = windowTexts[j];
      if (/^\d{1,3}$/.test(t)) break; // next item
      if (skipLabels.test(t)) continue;
      if (/^(incomplete|complete)$/i.test(t)) break;
      if (t.length > 1) descLines.push(t);
    }

    const description = descLines.join(' ').trim();
    if (!description) continue;

    rawItems.push({
      index: itemNum,
      description,
      assignedTo,
      page: line.page,
    });

    // Skip ahead past this item's window to avoid re-matching
    i += assignToIdx + 2;
  }

  // Deduplicate by index (PDF text layer sometimes repeats)
  const seen = new Set<number>();
  const deduped = rawItems.filter(item => {
    if (seen.has(item.index)) return false;
    seen.add(item.index);
    return true;
  });

  const totalInDoc = deduped.length;

  // DEBUG — log all items so we can see raw assignedTo values
  console.group('All parsed items');
  for (const item of deduped) {
    console.log(`#${item.index} | assignedTo: "${item.assignedTo}" | desc: "${item.description.slice(0, 60)}"`);
  }
  console.groupEnd();

  // DEBUG — return all items unfiltered so we can verify assignedTo values
  const ours = deduped.map((item): PunchItem => ({
    originalIndex: item.index,
    description: `[${item.assignedTo}] ${item.description}`,
    assignedTo: item.assignedTo,
    pageNumber: item.page,
    imageCount: 0,
  }));

  return { items: ours, totalInDoc, pageCount };
}
