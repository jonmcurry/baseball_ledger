// @vitest-environment jsdom
/**
 * Tests for Footer component
 */

import { render, screen } from '@testing-library/react';
import { Footer } from '@components/layout/Footer';

describe('Footer', () => {
  it('renders with role="contentinfo"', () => {
    render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders copyright or app name text', () => {
    render(<Footer />);
    expect(screen.getByText(/baseball ledger/i)).toBeInTheDocument();
  });

  it('uses muted text color', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(footer.className).toContain('text-[var(--text-tertiary)]');
  });
});
