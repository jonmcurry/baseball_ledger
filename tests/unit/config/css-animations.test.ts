/**
 * Structural tests: CSS animations and motion preferences (REQ-COMP-011)
 *
 * Verifies globals.css contains required keyframes, animation classes,
 * and prefers-reduced-motion media query.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT_DIR = resolve(__dirname, '..', '..', '..');
const GLOBALS_CSS = resolve(ROOT_DIR, 'src', 'styles', 'globals.css');

describe('CSS animations (REQ-COMP-011)', () => {
  const css = readFileSync(GLOBALS_CSS, 'utf-8');

  it('defines stamp-slam keyframe animation', () => {
    expect(css).toContain('@keyframes stamp-slam');
  });

  it('defines typewriter-cursor keyframe animation', () => {
    expect(css).toContain('@keyframes typewriter-cursor');
  });

  it('animate-stamp class uses stamp-slam animation', () => {
    expect(css).toContain('.animate-stamp');
    expect(css).toContain('animation: stamp-slam');
  });

  it('respects prefers-reduced-motion media query', () => {
    expect(css).toContain('prefers-reduced-motion: reduce');
    // Within reduced-motion, animation should be disabled
    expect(css).toContain('animation: none');
  });

  it('postseason theme overrides design tokens', () => {
    expect(css).toContain('[data-theme="postseason"]');
    expect(css).toContain('--color-cream:');
    expect(css).toContain('--color-scoreboard:');
  });
});
