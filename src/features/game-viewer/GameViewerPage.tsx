/**
 * GameViewerPage
 *
 * Play-by-play game viewer with line score and box score.
 * Parses gameId from route params. Shows game result.
 *
 * Layer 7: Feature page. Composes hooks + sub-components.
 */

import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLeague } from '@hooks/useLeague';
import { useSimulationStore } from '@stores/simulationStore';
import { useWorkerSimulation } from '@hooks/useWorkerSimulation';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { GameStatePanel } from './GameStatePanel';
import { PlayByPlayFeed } from './PlayByPlayFeed';
import { BoxScoreDisplay } from './BoxScoreDisplay';
import { CommentarySection } from './CommentarySection';
import { GameSummaryPanel } from './GameSummaryPanel';
import { ManagerDecisionsPanel } from './ManagerDecisionsPanel';
import { detectDecisions } from '@lib/ai/decision-detector';
import type { GameSummaryRequest } from '@lib/types/ai';

type ViewTab = 'play-by-play' | 'box-score';

export function GameViewerPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { teams } = useLeague();
  const simulationResults = useSimulationStore((s) => s.results);
  const workerSim = useWorkerSimulation();
  const [activeTab, setActiveTab] = useState<ViewTab>('play-by-play');

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

  const gameSummaryRequest = useMemo((): GameSummaryRequest | null => {
    const r = workerSim.result;
    if (!r?.boxScore || !r.playByPlay) return null;
    const names = r.playerNames ?? {};
    const plays = r.playByPlay ?? [];
    const batLines = r.playerBattingLines ?? [];
    return {
      homeTeamName,
      awayTeamName,
      homeScore: r.homeScore,
      awayScore: r.awayScore,
      innings: r.innings,
      winningPitcherName: names[r.winningPitcherId] ?? 'Unknown',
      losingPitcherName: names[r.losingPitcherId] ?? 'Unknown',
      savePitcherName: r.savePitcherId ? (names[r.savePitcherId] ?? null) : null,
      keyPlays: plays
        .filter((p) => p.outcome >= 17 && p.outcome <= 20)
        .slice(0, 5)
        .map((p) => ({ inning: p.inning, description: p.description })),
      boxScore: r.boxScore,
      playerHighlights: batLines
        .filter((b) => b.H >= 2 || b.HR >= 1)
        .slice(0, 3)
        .map((b) => ({
          playerName: names[b.playerId] ?? b.playerId,
          statLine: `${b.H}-${b.AB}${b.HR > 0 ? `, ${b.HR} HR` : ''}${b.RBI > 0 ? `, ${b.RBI} RBI` : ''}`,
        })),
    };
  }, [workerSim.result, homeTeamName, awayTeamName]);

  const detectedDecisions = useMemo(() => {
    const plays = workerSim.result?.playByPlay;
    if (!plays || plays.length === 0) return [];
    return detectDecisions(plays);
  }, [workerSim.result?.playByPlay]);

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

      {workerSim.status === 'running' && (
        <div className="rounded-card border border-sandstone bg-old-lace px-gutter py-2">
          <p className="text-xs text-muted">Simulating replay...</p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-sandstone/40">
            <div className="h-full w-1/2 animate-pulse rounded bg-ballpark" />
          </div>
        </div>
      )}

      {workerSim.status === 'complete' && workerSim.result && (
        <div className="rounded-card border border-ballpark/30 bg-ballpark/5 px-gutter py-2">
          <p className="text-xs font-medium text-ballpark">
            Replay complete: {workerSim.result.awayScore} - {workerSim.result.homeScore}
          </p>
        </div>
      )}

      {workerSim.status === 'error' && workerSim.error && (
        <ErrorBanner severity="error" message={workerSim.error} />
      )}

      {/* Tab navigation for Play-by-Play and Box Score */}
      <div className="flex border-b border-sandstone" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'play-by-play'}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'play-by-play'
              ? 'border-b-2 border-ballpark text-ballpark'
              : 'text-muted hover:text-ink'
          }`}
          onClick={() => setActiveTab('play-by-play')}
        >
          Play-by-Play
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'box-score'}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'box-score'
              ? 'border-b-2 border-ballpark text-ballpark'
              : 'text-muted hover:text-ink'
          }`}
          onClick={() => setActiveTab('box-score')}
        >
          Box Score
        </button>
      </div>

      {/* Tab panels */}
      {activeTab === 'play-by-play' && (
        <PlayByPlayFeed
          plays={workerSim.result?.playByPlay ?? []}
          teams={teamNameMap}
        />
      )}

      {activeTab === 'box-score' && workerSim.result && (
        <BoxScoreDisplay
          boxScore={workerSim.result.boxScore}
          battingLines={workerSim.result.playerBattingLines}
          pitchingLines={workerSim.result.playerPitchingLines}
          homeTeam={homeTeamName}
          awayTeam={awayTeamName}
        />
      )}

      {activeTab === 'box-score' && !workerSim.result && (
        <p className="py-4 text-center text-sm text-muted">
          Box score not available. Run a replay to see detailed stats.
        </p>
      )}

      {/* Game Summary: template-first with optional AI recap */}
      <GameSummaryPanel request={gameSummaryRequest} />

      {/* AI Commentary: template-first with optional Claude enhancement */}
      {workerSim.result?.playByPlay && workerSim.result.playByPlay.length > 0 && (
        <CommentarySection
          plays={workerSim.result.playByPlay.slice(-10)}
          playerNames={workerSim.result.playerNames}
          style="newspaper"
        />
      )}

      {/* Manager Decisions: template-first with optional Claude enhancement */}
      {detectedDecisions.length > 0 && (
        <ManagerDecisionsPanel
          decisions={detectedDecisions}
          managerStyle="balanced"
          managerName={awayTeamName + ' Manager'}
        />
      )}
    </div>
  );
}

export default GameViewerPage;
