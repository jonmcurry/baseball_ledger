/**
 * GameStatePanel
 *
 * Live game state: Scoreboard + BaseIndicator + outs display.
 * Feature-scoped sub-component. No store imports.
 */

import { Scoreboard } from '@components/baseball/Scoreboard';
import type { BaseState } from '@lib/types/game';

export interface GameStatePanelProps {
  readonly gameState: {
    bases: BaseState;
    outs: number;
    homeScore: number;
    awayScore: number;
    inning: number;
    halfInning: 'top' | 'bottom';
  };
  readonly homeTeam: string;
  readonly awayTeam: string;
}

export function GameStatePanel({ gameState, homeTeam, awayTeam }: GameStatePanelProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-headline text-sm font-bold text-ballpark">Game State</h3>
      <Scoreboard
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        homeScore={gameState.homeScore}
        awayScore={gameState.awayScore}
        inning={gameState.inning}
        halfInning={gameState.halfInning}
        outs={gameState.outs}
        bases={gameState.bases}
      />
    </div>
  );
}
