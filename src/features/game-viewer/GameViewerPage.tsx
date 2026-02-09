/**
 * GameViewerPage
 *
 * Play-by-play game viewer with line score and box score.
 * Parses gameId from route params. Shows game result.
 *
 * Layer 7: Feature page. Composes hooks + sub-components.
 */

import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useLeague } from '@hooks/useLeague';
import { useSimulationStore } from '@stores/simulationStore';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { GameStatePanel } from './GameStatePanel';

export function GameViewerPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { teams } = useLeague();
  const simulationResults = useSimulationStore((s) => s.results);

  const teamNameMap = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach((t) => map.set(t.id, `${t.city} ${t.name}`));
    return map;
  }, [teams]);

  const gameResult = useMemo(() => {
    return simulationResults.find((r) => r.gameId === gameId) ?? null;
  }, [simulationResults, gameId]);

  if (!gameId) {
    return (
      <div className="space-y-gutter-lg">
        <h2 className="font-headline text-2xl font-bold text-ballpark">Game Viewer</h2>
        <ErrorBanner severity="warning" message="No game ID provided." />
      </div>
    );
  }

  if (!gameResult) {
    return (
      <div className="space-y-gutter-lg">
        <h2 className="font-headline text-2xl font-bold text-ballpark">Game Viewer</h2>
        <div className="rounded-card border border-sandstone bg-old-lace px-gutter py-3">
          <p className="font-headline text-sm font-bold text-ink">Game Not Found</p>
          <p className="text-xs text-muted">Game {gameId} is not available in the current session.</p>
        </div>
      </div>
    );
  }

  const homeTeamName = teamNameMap.get(gameResult.homeTeamId) ?? 'Home';
  const awayTeamName = teamNameMap.get(gameResult.awayTeamId) ?? 'Away';

  return (
    <div className="space-y-gutter-lg">
      <h2 className="font-headline text-2xl font-bold text-ballpark">
        {awayTeamName} @ {homeTeamName}
      </h2>

      <div className="text-center font-stat text-lg font-bold text-ink">
        {gameResult.awayScore} - {gameResult.homeScore}
      </div>

      <GameStatePanel
        gameState={{
          bases: { first: null, second: null, third: null },
          outs: 0,
          homeScore: gameResult.homeScore,
          awayScore: gameResult.awayScore,
          inning: 9,
          halfInning: 'bottom',
        }}
        homeTeam={homeTeamName}
        awayTeam={awayTeamName}
      />
    </div>
  );
}
