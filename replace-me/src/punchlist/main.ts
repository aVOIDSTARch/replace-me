/**
 * punchlist/main.ts
 * UI for the punch list processor tool.
 */

import '../style.css';
import './punchlist.css';
import { lightSteel } from '../palettes/light-steel';
import { applyPalette } from '../palettes/apply';
import { parsePunchList, type ParseResult } from './parser';
import { buildImageZip } from './zipper';
import { debugExtract } from './debug-extract';

applyPalette(lightSteel, true);

// ── DOM ──────────────────────────────────────────────────────────────────
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="layout">
    <header class="site-header">
      <div class="site-header__inner">
        <a href="/replace-me/" class="wordmark">replace<em>—</em>me</a>
        <span class="wordmark-sub">punch list processor</span>
      </div>
      <div class="header-rule"></div>
    </header>

    <main class="main pl-main">

      <div class="drop-zone" id="dropZone">
        <div class="drop-zone__inner">
          <svg class="drop-zone__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p class="drop-zone__label">Drop punch list PDF here</p>
          <p class="drop-zone__sub">or <label class="drop-zone__browse" for="fileInput">browse</label></p>
          <input type="file" id="fileInput" accept=".pdf" class="sr-only" />
        </div>
      </div>

      <div class="pl-status" id="status" hidden></div>

      <div class="pl-results" id="results" hidden>
        <div class="pl-results__header">
          <div class="pl-results__meta" id="meta"></div>
          <div class="pl-results__actions">
            <button class="btn btn--secondary" id="copyBtn">Copy to clipboard</button>
            <button class="btn btn--secondary" id="zipBtn" hidden>Download images (.zip)</button>
            <button class="btn btn--ghost" id="resetBtn">Clear</button>
          </div>
        </div>
        <textarea class="pl-textarea" id="output" readonly spellcheck="false"></textarea>
      </div>

    </main>

    <footer class="site-footer">
      <span class="footer-text">fail.academy / replace-me / punchlist</span>
    </footer>
  </div>
`;

// ── Elements ─────────────────────────────────────────────────────────────
const dropZone   = document.getElementById('dropZone')!;
const fileInput  = document.getElementById('fileInput') as HTMLInputElement;
const status     = document.getElementById('status')!;
const results    = document.getElementById('results')!;
const meta       = document.getElementById('meta')!;
const output     = document.getElementById('output') as HTMLTextAreaElement;
const copyBtn    = document.getElementById('copyBtn')!;
const zipBtn     = document.getElementById('zipBtn')!;
const resetBtn   = document.getElementById('resetBtn')!;

// ── State ─────────────────────────────────────────────────────────────────
let currentFile: File | null = null;
let zipBlob: Blob | null = null;

// ── Helpers ───────────────────────────────────────────────────────────────
function setStatus(msg: string, isError = false): void {
  status.textContent = msg;
  status.className = `pl-status${isError ? ' pl-status--error' : ''}`;
  status.hidden = false;
  results.hidden = true;
}

function clearStatus(): void {
  status.hidden = true;
}

function formatOutput(result: ParseResult): string {
  if (result.items.length === 0) return '(no Aristokraft / Masterbrand items found)';
  return result.items
    .map((item, i) => `${i + 1}. ${item.description}`)
    .join('\n');
}

function showResults(result: ParseResult): void {
  const count = result.items.length;
  meta.textContent =
    `${count} item${count !== 1 ? 's' : ''} assigned to us` +
    ` (${result.totalInDoc} total in document)`;
  output.value = formatOutput(result);
  clearStatus();
  results.hidden = false;
}

// ── Process file ──────────────────────────────────────────────────────────
async function processFile(file: File): Promise<void> {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    setStatus('File must be a PDF.', true);
    return;
  }

  currentFile = file;
  zipBlob = null;
  zipBtn.hidden = true;
  results.hidden = true;
  setStatus('Reading PDF…');

  // DEBUG — remove after tuning parser
  await debugExtract(file);

  try {
    const result = await parsePunchList(file);
    showResults(result);

    // Kick off image extraction in background
    if (result.items.length > 0) {
      setStatus('Extracting images…');
      buildImageZip(file, result.items).then(blob => {
        clearStatus();
        if (blob) {
          zipBlob = blob;
          zipBtn.hidden = false;
        }
      }).catch(() => {
        clearStatus(); // image extraction failing is non-fatal
      });
      // Show results immediately — don't wait for zip
      showResults(result);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setStatus(`Failed to parse PDF: ${msg}`, true);
  }
}

// ── Event wiring ───────────────────────────────────────────────────────────
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drop-zone--over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drop-zone--over');
});

dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drop-zone--over');
  const file = e.dataTransfer?.files[0];
  if (file) processFile(file);
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) processFile(file);
});

copyBtn.addEventListener('click', async () => {
  if (!output.value) return;
  await navigator.clipboard.writeText(output.value);
  copyBtn.textContent = 'Copied!';
  setTimeout(() => { copyBtn.textContent = 'Copy to clipboard'; }, 2000);
});

zipBtn.addEventListener('click', () => {
  if (!zipBlob || !currentFile) return;
  const baseName = currentFile.name.replace(/\.pdf$/i, '');
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}-images.zip`;
  a.click();
  URL.revokeObjectURL(url);
});

resetBtn.addEventListener('click', () => {
  currentFile = null;
  zipBlob = null;
  fileInput.value = '';
  results.hidden = true;
  status.hidden = true;
  zipBtn.hidden = true;
});
