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
});
