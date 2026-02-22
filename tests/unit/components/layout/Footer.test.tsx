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
    expect(screen.getByText(/ledger baseball/i)).toBeInTheDocument();
  });

  it('uses muted text color', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    // Muted color applied to child span, not the footer element itself
    const span = footer.querySelector('span');
    expect(span?.className).toContain('text-[var(--text-tertiary)]');
  });
});
