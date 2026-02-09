// @vitest-environment jsdom
/**
 * Tests for PlayByPlayFeed
 */

import { render, screen } from '@testing-library/react';
import { PlayByPlayFeed } from '@features/game-viewer/PlayByPlayFeed';
import { createMockPlayByPlay } from '../../../fixtures/mock-game';

describe('PlayByPlayFeed', () => {
  const teams = new Map([['team-1', 'New York Yankees'], ['team-2', 'Boston Red Sox']]);

  it('renders heading', () => {
    render(<PlayByPlayFeed plays={[]} teams={teams} />);
    expect(screen.getByText('Play-by-Play')).toBeInTheDocument();
  });

  it('shows no plays message when empty', () => {
    render(<PlayByPlayFeed plays={[]} teams={teams} />);
    expect(screen.getByText('No plays recorded')).toBeInTheDocument();
  });

  it('renders play descriptions', () => {
    const plays = [
      createMockPlayByPlay({ description: 'Leadoff single to center.' }),
      createMockPlayByPlay({ description: 'Groundout to short.', outs: 1 }),
    ];
    render(<PlayByPlayFeed plays={plays} teams={teams} />);
    expect(screen.getByText('Leadoff single to center.')).toBeInTheDocument();
    expect(screen.getByText('Groundout to short.')).toBeInTheDocument();
  });
});
