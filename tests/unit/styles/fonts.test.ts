/**
 * Tests for self-hosted fonts (REQ-NFR-018)
 *
 * Verifies font files exist and no CDN references remain.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..', '..', '..');

describe('Self-hosted fonts (REQ-NFR-018)', () => {
  it('has Roboto Slab woff2 file in public/fonts', () => {
    expect(existsSync(resolve(ROOT, 'public/fonts/roboto-slab-latin.woff2'))).toBe(true);
  });

  it('has JetBrains Mono woff2 file in public/fonts', () => {
    expect(existsSync(resolve(ROOT, 'public/fonts/jetbrains-mono-latin.woff2'))).toBe(true);
  });

  it('index.html has no Google Fonts CDN references', () => {
    const html = readFileSync(resolve(ROOT, 'index.html'), 'utf-8');
    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).not.toContain('fonts.gstatic.com');
  });

  it('uses font-display: swap to prevent FOIT', () => {
    const css = readFileSync(resolve(ROOT, 'src/styles/fonts.css'), 'utf-8');
    const fontFaceBlocks = css.match(/@font-face\s*\{[^}]+\}/g) ?? [];
    expect(fontFaceBlocks.length).toBeGreaterThanOrEqual(2);
    for (const block of fontFaceBlocks) {
      expect(block).toContain('font-display: swap');
    }
  });

  it('uses Latin unicode-range subsetting', () => {
    const css = readFileSync(resolve(ROOT, 'src/styles/fonts.css'), 'utf-8');
    const fontFaceBlocks = css.match(/@font-face\s*\{[^}]+\}/g) ?? [];
    for (const block of fontFaceBlocks) {
      expect(block).toContain('unicode-range:');
    }
  });
});
