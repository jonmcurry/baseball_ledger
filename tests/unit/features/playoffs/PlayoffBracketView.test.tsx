// @vitest-environment jsdom
/**
 * Tests for PlayoffBracketView
 */

import { render, screen } from '@testing-library/react';
import { PlayoffBracketView } from '@features/playoffs/PlayoffBracketView';
import type { PlayoffBracket } from '@lib/types/schedule';

describe('PlayoffBracketView', () => {
  const teams = new Map([
    ['team-1', 'New York Yankees'],
    ['team-2', 'Boston Red Sox'],
  ]);

  it('renders heading', () => {
    const bracket: PlayoffBracket = { leagueId: 'lg-1', rounds: [], championId: null };
    render(<PlayoffBracketView bracket={bracket} teams={teams} />);
    expect(screen.getByText('Playoff Bracket')).toBeInTheDocument();
  });

  it('shows empty bracket message', () => {
    const bracket: PlayoffBracket = { leagueId: 'lg-1', rounds: [], championId: null };
    render(<PlayoffBracketView bracket={bracket} teams={teams} />);
    expect(screen.getByText('Playoff bracket has not been set.')).toBeInTheDocument();
  });

  it('shows champion name when set', () => {
    const bracket: PlayoffBracket = { leagueId: 'lg-1', rounds: [], championId: 'team-1' };
    render(<PlayoffBracketView bracket={bracket} teams={teams} />);
    expect(screen.getByText('New York Yankees')).toBeInTheDocument();
    expect(screen.getByText('Champion')).toBeInTheDocument();
  });
});
