// @vitest-environment jsdom
/**
 * Tests for PickTimer
 */

import { render, screen } from '@testing-library/react';
import { PickTimer } from '@features/draft/PickTimer';

describe('PickTimer', () => {
  it('shows time remaining when active', () => {
    render(<PickTimer timeRemaining={45} isActive />);
    expect(screen.getByText('45s')).toBeInTheDocument();
    expect(screen.getByText('remaining')).toBeInTheDocument();
  });

  it('shows urgent styling and time expired text at zero', () => {
    render(<PickTimer timeRemaining={0} isActive />);
    expect(screen.getByText('Time expired')).toBeInTheDocument();
  });

  it('shows waiting state when not active', () => {
    render(<PickTimer timeRemaining={60} isActive={false} />);
    expect(screen.getByText('--')).toBeInTheDocument();
    expect(screen.getByText('Waiting...')).toBeInTheDocument();
  });
});
