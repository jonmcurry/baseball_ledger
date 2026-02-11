// @vitest-environment jsdom
/**
 * Tests for LoadingLedger component
 *
 * Animated "Processing Ledger..." loading indicator.
 */

import { render, screen } from '@testing-library/react';
import { LoadingLedger } from '@components/feedback/LoadingLedger';

describe('LoadingLedger', () => {
  it('renders default message "Processing Ledger..."', () => {
    render(<LoadingLedger />);
    expect(screen.getByText(/Processing Ledger/)).toBeInTheDocument();
  });

  it('renders custom message when provided', () => {
    render(<LoadingLedger message="Loading stats..." />);
    expect(screen.getByText(/Loading stats/)).toBeInTheDocument();
  });

  it('has role="status" for accessibility', () => {
    render(<LoadingLedger />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-live="polite"', () => {
    render(<LoadingLedger />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('renders three animated dots', () => {
    render(<LoadingLedger />);
    const dots = screen.getByRole('status').querySelectorAll('[data-dot]');
    expect(dots).toHaveLength(3);
  });

  it('has aria-label matching the message prop (REQ-COMP-012)', () => {
    render(<LoadingLedger message="Loading stats..." />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading stats...');
  });

  it('has aria-label with default message when none provided (REQ-COMP-012)', () => {
    render(<LoadingLedger />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Processing Ledger...');
  });

  it('uses font-headline class', () => {
    render(<LoadingLedger />);
    const container = screen.getByRole('status');
    expect(container.className).toContain('font-headline');
  });
});
