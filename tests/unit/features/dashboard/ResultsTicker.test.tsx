// @vitest-environment jsdom
/**
 * Tests for ResultsTicker (REQ-UI-007)
 *
 * Horizontal scrolling game results feed.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ResultsTicker } from '@features/dashboard/ResultsTicker';
import type { TickerResult } from '@features/dashboard/ResultsTicker';

function makeResults(): TickerResult[] {
  return [
    { gameId: 'g1', awayName: 'Eagles', homeName: 'Hawks', awayScore: 5, homeScore: 3 },
    { gameId: 'g2', awayName: 'Tigers', homeName: 'Lions', awayScore: 2, homeScore: 7 },
    { gameId: 'g3', awayName: 'Wolves', homeName: 'Bears', awayScore: 4, homeScore: 4 },
  ];
}

describe('ResultsTicker', () => {
  it('renders all game results', () => {
    render(<ResultsTicker results={makeResults()} />);
    expect(screen.getByText('Eagles')).toBeInTheDocument();
    expect(screen.getByText('Hawks')).toBeInTheDocument();
    expect(screen.getByText('Tigers')).toBeInTheDocument();
    expect(screen.getByText('Lions')).toBeInTheDocument();
    expect(screen.getByText('Wolves')).toBeInTheDocument();
    expect(screen.getByText('Bears')).toBeInTheDocument();
  });

  it('renders scores for each game', () => {
    render(<ResultsTicker results={makeResults()} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders nothing when results array is empty', () => {
    const { container } = render(<ResultsTicker results={[]} />);
    expect(container.querySelector('[data-testid="results-ticker"]')).toBeNull();
  });

  it('calls onGameClick when a result is clicked', () => {
    const handleClick = vi.fn();
    render(<ResultsTicker results={makeResults()} onGameClick={handleClick} />);
    fireEvent.click(screen.getByText('Eagles').closest('button')!);
    expect(handleClick).toHaveBeenCalledWith('g1');
  });

  it('has horizontal scroll container', () => {
    const { container } = render(<ResultsTicker results={makeResults()} />);
    const ticker = container.querySelector('[data-testid="results-ticker"]');
    expect(ticker).toBeInTheDocument();
    expect(ticker?.className).toContain('overflow-x-auto');
  });
});
