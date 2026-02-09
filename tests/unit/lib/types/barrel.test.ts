import { OutcomeCategory } from '@lib/types';
import type {
  AppError,
  LeagueStatus,
  SimulationProgress,
} from '@lib/types';

describe('Barrel export (@lib/types)', () => {
  it('re-exports OutcomeCategory enum (value import)', () => {
    expect(OutcomeCategory.HOME_RUN).toBe(19);
  });

  it('re-exports all type categories', () => {
    // These are compile-time checks -- if this file compiles, the barrel works.
    // Runtime assertions confirm the types are usable.
    const error: AppError = {
      category: 'VALIDATION',
      code: 'TEST',
      message: 'test',
      statusCode: 400,
    };
    expect(error.category).toBe('VALIDATION');

    const status: LeagueStatus = 'drafting';
    expect(status).toBe('drafting');

    const progress: SimulationProgress = {
      leagueId: 'l1',
      status: 'running',
      totalGames: 162,
      completedGames: 0,
      currentDay: 1,
      startedAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    expect(progress.totalGames).toBe(162);
  });
});
