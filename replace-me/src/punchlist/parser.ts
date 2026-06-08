/**
 * parser.ts
 * Deterministic extraction of Aristokraft/Masterbrand punch items from PDF.
 * Uses pdfjs-dist text layer — no AI, no heuristics beyond positional grouping.
 */

import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

export interface PunchItem {
  originalIndex: number;
  description: string;
  assignedTo: string;
  pageNumber: number;
  imageCount: number;
}

export interface ParseResult {
  items: PunchItem[];
  totalInDoc: number;
  pageCount: number;
}

const OUR_SUBS = ['aristokraft', 'masterbrand'];

function isOurSub(value: string): boolean {
  const lower = value.toLowerCase().trim();
  return OUR_SUBS.some(s => lower.includes(s));
}

// Tokens that are pure structural noise — never vendor or description
const NOISE = /^(floor|room|sheet|status|assign\s*to(\s*resolution\s*date)?|resolution\s*date|comment|issue\s*#?|incomplete|complete)$/i;

// Known vendor names — used to positively identify the assignedTo token
const KNOWN_VENDORS = [
  'aristokraft', 'masterbrand', 'bwf', 'charleston', 'coastal', 'gtm',
  'nwp', 'pbs', 'real deal', 'se garage', 'smiths', 'stier',
];

function looksLikeVendor(text: string): boolean {
  const lower = text.toLowerCase();
  return KNOWN_VENDORS.some(v => lower.includes(v));
}

interface TextToken {
  x: number;
  y: number;
  text: string;
  page: number;
}

async function getPageTokens(
  page: pdfjsLib.PDFPageProxy,
  pageNum: number,
): Promise<TextToken[]> {
  const content = await page.getTextContent();
  const tokens: TextToken[] = [];

  for (const item of content.items) {
    if (!('str' in item)) continue;
    const str = item.str.trim();
    if (!str) continue;
    const tx = (item as { transform: number[] }).transform;
    tokens.push({ x: tx[4], y: tx[5], text: str, page: pageNum });
  }

  // Sort top-to-bottom (descending y), then left-to-right
  tokens.sort((a, b) => b.y - a.y || a.x - b.x);
  return tokens;
}

// Fix ligature splits that pdfjs produces (fi, ff, fl, ffi, ffl)
function fixLigatures(text: string): string {
  return text
    .replace(/\bf i\b/g, 'fi')
    .replace(/\bf f\b/g, 'ff')
    .replace(/\bf l\b/g, 'fl')
    .replace(/\bo f f\b/g, 'off')
    .replace(/\bf i l\b/g, 'fil')
    .replace(/\bf f i\b/g, 'ffi')
    .replace(/\bf f l\b/g, 'ffl')
    // Also handle space-separated: "o ff" "fi ll" "fl ooring"
    .replace(/\bo ff\b/g, 'off')
    .replace(/\bfi ll\b/g, 'fill')
    .replace(/\bfl oo/g, 'floo')
    .replace(/\bstu ff\b/g, 'stuff')
    .replace(/\bsti ff\b/g, 'stiff')
    .replace(/\bdif fi/g, 'diffi');
}

// Strip everything from the first "Assign" onwards
function cleanDescription(raw: string): string {
  const idx = raw.search(/\bAssign\b/i);
  return fixLigatures((idx === -1 ? raw : raw.slice(0, idx)).trim());
}

export async function parsePunchList(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = pdf.numPages;

  const allTokens: TextToken[] = [];
  for (let p = 1; p <= pageCount; p++) {
    const page = await pdf.getPage(p);
    const tokens = await getPageTokens(page, p);
    allTokens.push(...tokens);
    page.cleanup();
  }

  // ── Find item boundaries by standalone integers ──────────────────────
  const itemStarts: number[] = [];
  for (let i = 0; i < allTokens.length; i++) {
    if (/^\d{1,3}$/.test(allTokens[i].text)) {
      itemStarts.push(i);
    }
  }

  interface RawItem {
    index: number;
    assignedTo: string;
    description: string;
    page: number;
  }

  const rawItems: RawItem[] = [];

  for (let s = 0; s < itemStarts.length; s++) {
    const start = itemStarts[s];
    const end = itemStarts[s + 1] ?? allTokens.length;
    const itemNum = parseInt(allTokens[start].text, 10);
    const window = allTokens.slice(start + 1, end);

    // Strategy: vendor name is the last non-noise token in the window
    // that looks like a vendor (or failing that, the last non-noise token
    // before the next item number). Scan backwards.
    let assignedTo = '';
    let vendorIdx = -1;

    // First pass: look for a known vendor name anywhere in the window
    for (let j = window.length - 1; j >= 0; j--) {
      if (looksLikeVendor(window[j].text)) {
        assignedTo = window[j].text;
        vendorIdx = j;
        break;
      }
    }

    // Fallback: last non-noise, non-integer token
    if (!assignedTo) {
      for (let j = window.length - 1; j >= 0; j--) {
        const t = window[j].text;
        if (!NOISE.test(t) && !/^\d{1,3}$/.test(t)) {
          assignedTo = t;
          vendorIdx = j;
          break;
        }
      }
    }

    if (!assignedTo) continue;

    // Description: all non-noise, non-integer tokens BEFORE vendorIdx
    const descParts: string[] = [];
    for (let j = 0; j < vendorIdx; j++) {
      const t = window[j].text;
      if (!NOISE.test(t) && !/^\d{1,3}$/.test(t)) {
        descParts.push(t);
      }
    }

    const description = cleanDescription(descParts.join(' '));
    if (!description) continue;

    rawItems.push({ index: itemNum, assignedTo, description, page: allTokens[start].page });
  }

  // Deduplicate by index
  const seen = new Set<number>();
  const deduped = rawItems.filter(item => {
    if (seen.has(item.index)) return false;
    seen.add(item.index);
    return true;
  });

  const totalInDoc = deduped.length;

  const ours = deduped
    .filter(item => isOurSub(item.assignedTo))
    .map((item): PunchItem => ({
      originalIndex: item.index,
      description: item.description,
      assignedTo: item.assignedTo,
      pageNumber: item.page,
      imageCount: 0,
    }));

  return { items: ours, totalInDoc, pageCount };
}
