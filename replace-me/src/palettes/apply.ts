import type { Palette } from './types';

/**
 * Applies a palette to the document as CSS custom properties.
 * Expects a 9-stop palette ordered lightest→darkest.
 *
 * Assigns semantic roles:
 *   --c0 through --c8: raw stops
 *   --bg:              page background  (c8 dark / c0 light)
 *   --surface:         card background  (c7 / c1)
 *   --border:          subtle dividers  (c6 / c2)
 *   --muted:           secondary text   (c5 / c3)
 *   --text:            body text        (c2 / c6)
 *   --heading:         headings         (c0 / c8)
 *   --accent:          accent (c3 lightened, used as highlight)
 */
export function applyPalette(palette: Palette, dark = true): void {
  const root = document.documentElement;
  const hex = (i: number) => `#${palette[i].hex}`;

  // Raw stops
  for (let i = 0; i < palette.length; i++) {
    root.style.setProperty(`--c${i}`, hex(i));
  }

  if (dark) {
    root.style.setProperty('--bg',      hex(8));
    root.style.setProperty('--surface', hex(7));
    root.style.setProperty('--border',  hex(6));
    root.style.setProperty('--muted',   hex(5));
    root.style.setProperty('--text',    hex(3));
    root.style.setProperty('--heading', hex(0));
    root.style.setProperty('--accent',  hex(4));
  } else {
    root.style.setProperty('--bg',      hex(0));
    root.style.setProperty('--surface', hex(1));
    root.style.setProperty('--border',  hex(2));
    root.style.setProperty('--muted',   hex(4));
    root.style.setProperty('--text',    hex(6));
    root.style.setProperty('--heading', hex(8));
    root.style.setProperty('--accent',  hex(5));
  }
}
