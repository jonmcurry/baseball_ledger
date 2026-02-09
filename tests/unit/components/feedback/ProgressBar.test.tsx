// @vitest-environment jsdom
/**
 * Tests for ProgressBar component
 */

import { render, screen } from '@testing-library/react';
import { ProgressBar } from '@components/feedback/ProgressBar';

describe('ProgressBar', () => {
  it('renders with correct aria attributes', () => {
    render(<ProgressBar current={5} total={10} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '5');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
  });

  it('shows percentage when showPct is true', () => {
    render(<ProgressBar current={3} total={10} showPct />);
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('shows label when provided', () => {
    render(<ProgressBar current={5} total={20} label="Simulating games..." />);
    expect(screen.getByText('Simulating games...')).toBeInTheDocument();
  });
});
