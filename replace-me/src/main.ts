import './style.css';
import { lightSteel } from './palettes/light-steel';
import { applyPalette } from './palettes/apply';

// ── Active palette (swap this import to change the entire color scheme) ──
applyPalette(lightSteel, true);

// ── Tool registry ────────────────────────────────────────────────────────
interface Tool {
  slug: string;        // URL sub-path
  label: string;       // Display name
  description: string; // One-line summary
  status: 'live' | 'wip' | 'planned';
}

const tools: Tool[] = [
  {
    slug: 'punchlist',
    label: 'Punch List Processor',
    description: 'Extract Masterbrand/Aristokraft items from construction punch list PDFs.',
    status: 'live',
  },
  // Add future tools here
];

// ── Render ───────────────────────────────────────────────────────────────
function statusBadge(status: Tool['status']): string {
  const labels: Record<Tool['status'], string> = {
    live: 'live',
    wip: 'in progress',
    planned: 'planned',
  };
  return `<span class="badge badge--${status}">${labels[status]}</span>`;
}

function renderCard(tool: Tool): string {
  const href = tool.status === 'live' ? `/replace-me/${tool.slug}/` : '#';
  return `
    <a class="tool-card ${tool.status !== 'live' ? 'tool-card--disabled' : ''}" href="${href}">
      <div class="tool-card__header">
        <span class="tool-card__label">${tool.label}</span>
        ${statusBadge(tool.status)}
      </div>
      <p class="tool-card__desc">${tool.description}</p>
      <span class="tool-card__arrow" aria-hidden="true">→</span>
    </a>
  `;
}

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="layout">
    <header class="site-header">
      <div class="site-header__inner">
        <span class="wordmark">replace<em>—</em>me</span>
        <span class="wordmark-sub">internal tools</span>
      </div>
      <div class="header-rule"></div>
    </header>

    <main class="main">
      <div class="hero-block">
        <h1 class="hero-title">Tools</h1>
        <p class="hero-sub">Field utilities. No accounts, no cloud, no nonsense.</p>
      </div>

      <div class="tool-grid">
        ${tools.map(renderCard).join('')}
        <div class="tool-card tool-card--placeholder">
          <span class="placeholder-label">More tools coming</span>
        </div>
      </div>
    </main>

    <footer class="site-footer">
      <span class="footer-text">fail.academy / replace-me</span>
    </footer>
  </div>
`;
