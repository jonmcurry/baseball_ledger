/**
 * Tests for playoff display helpers (L1 pure functions)
 */

import { formatPlayoffRoundName, buildPlayoffGameMessage } from '@lib/schedule/playoff-display';

describe('formatPlayoffRoundName', () => {
  it('formats WildCard as "Wild Card"', () => {
    expect(formatPlayoffRoundName('WildCard')).toBe('Wild Card');
  });

  it('formats DivisionSeries as "Division Series"', () => {
    expect(formatPlayoffRoundName('DivisionSeries')).toBe('Division Series');
  });

  it('formats ChampionshipSeries as "Championship Series"', () => {
    expect(formatPlayoffRoundName('ChampionshipSeries')).toBe('Championship Series');
  });

  it('formats WorldSeries as "World Series"', () => {
    expect(formatPlayoffRoundName('WorldSeries')).toBe('World Series');
  });
});

describe('buildPlayoffGameMessage', () => {
  it('returns round + game number + teams + scores', () => {
    const msg = buildPlayoffGameMessage({
      round: 'ChampionshipSeries',
      gameNumber: 3,
      homeTeamName: 'Eagles',
      awayTeamName: 'Hawks',
      homeScore: 5,
      awayScore: 3,
    });
    expect(msg).toBe('Championship Series Game 3: Hawks 3, Eagles 5');
  });

  it('appends "Season complete!" when isPlayoffsComplete is true', () => {
    const msg = buildPlayoffGameMessage({
      round: 'WorldSeries',
      gameNumber: 7,
      homeTeamName: 'Eagles',
      awayTeamName: 'Tigers',
      homeScore: 4,
      awayScore: 2,
      isPlayoffsComplete: true,
    });
    expect(msg).toBe('World Series Game 7: Tigers 2, Eagles 4 -- Season complete!');
  });

  it('omits suffix when isPlayoffsComplete is not set', () => {
    const msg = buildPlayoffGameMessage({
      round: 'DivisionSeries',
      gameNumber: 1,
      homeTeamName: 'Eagles',
      awayTeamName: 'Hawks',
      homeScore: 2,
      awayScore: 1,
    });
    expect(msg).not.toContain('Season complete');
  });
});
