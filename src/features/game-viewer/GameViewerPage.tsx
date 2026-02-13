/**
 * GameViewerPage
 *
 * Play-by-play game viewer with line score and box score.
 * Parses gameId from route params. Shows game result.
 *
 * Data sources (priority order):
 * 1. In-memory simulation store (current session results)
 * 2. Database game_logs via API (persisted from previous sessions)
 *
 * Layer 7: Feature page. Composes hooks + sub-components.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLeague } from '@hooks/useLeague';
import { useSimulationStore } from '@stores/simulationStore';
import { useWorkerSimulation } from '@hooks/useWorkerSimulation';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { LoadingLedger } from '@components/feedback/LoadingLedger';
import { GameStatePanel } from './GameStatePanel';
import { PlayByPlayFeed } from './PlayByPlayFeed';
import { BoxScoreDisplay } from './BoxScoreDisplay';
import { CommentarySection } from './CommentarySection';
import { GameSummaryPanel } from './GameSummaryPanel';
import { ManagerDecisionsPanel } from './ManagerDecisionsPanel';
import { detectDecisions } from '@lib/ai/decision-detector';
import type { GameSummaryRequest } from '@lib/types/ai';
import type { BoxScore, BattingLine, PitchingLine, PlayByPlayEntry } from '@lib/types/game';
import { apiGet } from '@services/api-client';
import { usePageTitle } from '@hooks/usePageTitle';

type ViewTab = 'play-by-play' | 'box-score';

/** Shape returned by the game detail API (camelCase from snakeToCamel). */
interface GameDetailResponse {
  id: string;
  gameId: string;
  leagueId: string;
  dayNumber: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  innings: number | null;
  winningPitcherId: string | null;
  losingPitcherId: string | null;
  savePitcherId: string | null;
  boxScore: BoxScore | null;
  battingLines: BattingLine[] | null;
  pitchingLines: PitchingLine[] | null;
  playByPlay: PlayByPlayEntry[] | null;
  homeTeam?: { id: string; name: string; city: string };
  awayTeam?: { id: string; name: string; city: string };
}

/** Unified game data from either source. */
interface GameData {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  innings: number;
  boxScore: BoxScore | null;
  battingLines: BattingLine[];
  pitchingLines: PitchingLine[];
  playByPlay: PlayByPlayEntry[];
  winningPitcherId: string;
  losingPitcherId: string;
  savePitcherId: string | null;
  playerNames: Record<string, string>;
  homeTeamName: string;
  awayTeamName: string;
}

export function GameViewerPage() {
  usePageTitle('Game Viewer');
  const { gameId, leagueId } = useParams<{ gameId: string; leagueId: string }>();
  const { teams } = useLeague();
  const simulationResults = useSimulationStore((s) => s.results);
  const workerSim = useWorkerSimulation();
  const [activeTab, setActiveTab] = useState<ViewTab>('box-score');

  const [dbGame, setDbGame] = useState<GameDetailResponse | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const teamNameMap = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach((t) => map.set(t.id, `${t.city} ${t.name}`));
    return map;
  }, [teams]);

  // Check simulation store first
  const storeResult = useMemo(() => {
    return simulationResults.find((r) => r.gameId === gameId) ?? null;
  }, [simulationResults, gameId]);

  // Fetch from DB if not in store
  const fetchGameFromDb = useCallback(async () => {
    if (!leagueId || !gameId || storeResult) return;
    setDbLoading(true);
    setDbError(null);
    try {
      const response = await apiGet<GameDetailResponse>(
        `/api/leagues/${leagueId}/games/${gameId}`,
      );
      setDbGame(response.data);
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to load game data';
      setDbError(message);
    } finally {
      setDbLoading(false);
    }
  }, [leagueId, gameId, storeResult]);

  useEffect(() => {
    if (!storeResult && !dbGame && !dbLoading && !dbError) {
      fetchGameFromDb();
    }
  }, [storeResult, dbGame, dbLoading, dbError, fetchGameFromDb]);

  // Build unified game data from whichever source is available
  const gameData = useMemo((): GameData | null => {
    // Source 1: Worker simulation result (from in-memory store replay)
    if (storeResult && workerSim.result) {
      const r = workerSim.result;
      return {
        homeTeamId: storeResult.homeTeamId,
        awayTeamId: storeResult.awayTeamId,
        homeScore: storeResult.homeScore,
        awayScore: storeResult.awayScore,
        innings: r.innings,
        boxScore: r.boxScore ?? null,
        battingLines: r.playerBattingLines ?? [],
        pitchingLines: r.playerPitchingLines ?? [],
        playByPlay: r.playByPlay ?? [],
        winningPitcherId: r.winningPitcherId ?? '',
        losingPitcherId: r.losingPitcherId ?? '',
        savePitcherId: r.savePitcherId ?? null,
        playerNames: r.playerNames ?? {},
        homeTeamName: teamNameMap.get(storeResult.homeTeamId) ?? 'Home',
        awayTeamName: teamNameMap.get(storeResult.awayTeamId) ?? 'Away',
      };
    }

    // Source 1b: Store result without worker (basic score only)
    if (storeResult && !workerSim.result) {
      return {
        homeTeamId: storeResult.homeTeamId,
        awayTeamId: storeResult.awayTeamId,
        homeScore: storeResult.homeScore,
        awayScore: storeResult.awayScore,
        innings: 9,
        boxScore: null,
        battingLines: [],
        pitchingLines: [],
        playByPlay: [],
        winningPitcherId: '',
        losingPitcherId: '',
        savePitcherId: null,
        playerNames: {},
        homeTeamName: teamNameMap.get(storeResult.homeTeamId) ?? 'Home',
        awayTeamName: teamNameMap.get(storeResult.awayTeamId) ?? 'Away',
      };
    }

    // Source 2: Database game log
    if (dbGame) {
      const homeName = dbGame.homeTeam
        ? `${dbGame.homeTeam.city} ${dbGame.homeTeam.name}`
        : teamNameMap.get(dbGame.homeTeamId) ?? 'Home';
      const awayName = dbGame.awayTeam
        ? `${dbGame.awayTeam.city} ${dbGame.awayTeam.name}`
        : teamNameMap.get(dbGame.awayTeamId) ?? 'Away';
      return {
        homeTeamId: dbGame.homeTeamId,
        awayTeamId: dbGame.awayTeamId,
        homeScore: dbGame.homeScore,
        awayScore: dbGame.awayScore,
        innings: dbGame.innings ?? 9,
        boxScore: dbGame.boxScore ?? null,
        battingLines: dbGame.battingLines ?? [],
        pitchingLines: dbGame.pitchingLines ?? [],
        playByPlay: dbGame.playByPlay ?? [],
        winningPitcherId: dbGame.winningPitcherId ?? '',
        losingPitcherId: dbGame.losingPitcherId ?? '',
        savePitcherId: dbGame.savePitcherId ?? null,
        playerNames: {},
        homeTeamName: homeName,
        awayTeamName: awayName,
      };
    }

    return null;
  }, [storeResult, workerSim.result, dbGame, teamNameMap]);

  const gameSummaryRequest = useMemo((): GameSummaryRequest | null => {
    if (!gameData?.boxScore) return null;
    return {
      homeTeamName: gameData.homeTeamName,
      awayTeamName: gameData.awayTeamName,
      homeScore: gameData.homeScore,
      awayScore: gameData.awayScore,
      innings: gameData.innings,
      winningPitcherName: gameData.playerNames[gameData.winningPitcherId] ?? 'Unknown',
      losingPitcherName: gameData.playerNames[gameData.losingPitcherId] ?? 'Unknown',
      savePitcherName: gameData.savePitcherId
        ? (gameData.playerNames[gameData.savePitcherId] ?? null)
        : null,
      keyPlays: gameData.playByPlay
        .filter((p) => p.outcome >= 17 && p.outcome <= 20)
        .slice(0, 5)
        .map((p) => ({ inning: p.inning, description: p.description })),
      boxScore: gameData.boxScore,
      playerHighlights: gameData.battingLines
        .filter((b) => b.H >= 2 || b.HR >= 1)
        .slice(0, 3)
        .map((b) => ({
          playerName: gameData.playerNames[b.playerId] ?? b.playerId,
          statLine: `${b.H}-${b.AB}${b.HR > 0 ? `, ${b.HR} HR` : ''}${b.RBI > 0 ? `, ${b.RBI} RBI` : ''}`,
        })),
    };
  }, [gameData]);

  const detectedDecisions = useMemo(() => {
    if (!gameData?.playByPlay || gameData.playByPlay.length === 0) return [];
    return detectDecisions(gameData.playByPlay);
  }, [gameData?.playByPlay]);

  if (!gameId) {
    return (
      <div className="space-y-gutter-lg">
        <h2 className="pennant-header">Game Viewer</h2>
        <ErrorBanner severity="warning" message="No game ID provided." />
      </div>
    );
  }

  if (dbLoading) {
    return <LoadingLedger message="Loading game data..." />;
  }

  if (!gameData) {
    return (
      <div className="space-y-gutter-lg">
        <h2 className="pennant-header">Game Viewer</h2>
        {dbError ? (
          <ErrorBanner severity="error" message={dbError} />
        ) : (
          <div className="vintage-card">
            <p className="font-headline text-sm font-bold uppercase text-[var(--accent-primary)]">Game Not Found</p>
            <p className="font-stat text-xs text-[var(--color-muted)]">Game {gameId} is not available.</p>
          </div>
        )}
      </div>
    );
  }

  const hasDetailedData = gameData.boxScore !== null || gameData.playByPlay.length > 0;

  return (
    <div className="space-y-gutter-lg">
      <h2 className="pennant-header">
        {gameData.awayTeamName} @ {gameData.homeTeamName}
      </h2>

      <div className="text-center font-scoreboard text-2xl text-[var(--text-primary)]">
        {gameData.awayScore} - {gameData.homeScore}
      </div>

      <GameStatePanel
        gameState={{
          bases: { first: null, second: null, third: null },
          outs: 0,
          homeScore: gameData.homeScore,
          awayScore: gameData.awayScore,
          inning: gameData.innings,
          halfInning: 'bottom',
          isComplete: true,
        }}
        homeTeam={gameData.homeTeamName}
        awayTeam={gameData.awayTeamName}
      />

      {/* Worker simulation status (only when using in-memory store result) */}
      {storeResult && workerSim.status === 'running' && (
        <div className="vintage-card">
          <p className="font-stat text-xs text-[var(--color-muted)]">Simulating replay...</p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-[var(--border-default)]">
            <div className="h-full w-1/2 animate-pulse rounded bg-[var(--accent-primary)]" />
          </div>
        </div>
      )}

      {storeResult && workerSim.status === 'error' && workerSim.error && (
        <ErrorBanner severity="error" message={workerSim.error} />
      )}

      {/* Tab navigation */}
      {hasDetailedData && (
        <>
          <div className="flex border-b border-[var(--border-default)]" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'box-score'}
              className={`px-4 py-2 font-headline text-sm uppercase tracking-wider ${
                activeTab === 'box-score'
                  ? 'border-b-2 border-[var(--accent-primary)] text-[var(--accent-primary)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--text-primary)]'
              }`}
              onClick={() => setActiveTab('box-score')}
            >
              Box Score
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'play-by-play'}
              className={`px-4 py-2 font-headline text-sm uppercase tracking-wider ${
                activeTab === 'play-by-play'
                  ? 'border-b-2 border-[var(--accent-primary)] text-[var(--accent-primary)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--text-primary)]'
              }`}
              onClick={() => setActiveTab('play-by-play')}
            >
              Play-by-Play
            </button>
          </div>

          {activeTab === 'box-score' && gameData.boxScore && (
            <BoxScoreDisplay
              boxScore={gameData.boxScore}
              battingLines={gameData.battingLines}
              pitchingLines={gameData.pitchingLines}
              homeTeam={gameData.homeTeamName}
              awayTeam={gameData.awayTeamName}
            />
          )}

          {activeTab === 'play-by-play' && (
            <PlayByPlayFeed
              plays={gameData.playByPlay}
              teams={teamNameMap}
            />
          )}
        </>
      )}

      {!hasDetailedData && (
        <div className="vintage-card text-center">
          <p className="font-stat text-sm text-[var(--color-muted)]">
            Detailed game data is not yet available.
          </p>
        </div>
      )}

      {/* Game Summary */}
      <GameSummaryPanel request={gameSummaryRequest} />

      {/* AI Commentary */}
      {gameData.playByPlay.length > 0 && (
        <CommentarySection
          plays={gameData.playByPlay.slice(-10)}
          playerNames={gameData.playerNames}
          style="newspaper"
        />
      )}

      {/* Manager Decisions */}
      {detectedDecisions.length > 0 && (
        <ManagerDecisionsPanel
          decisions={detectedDecisions}
          managerStyle="balanced"
          managerName={gameData.awayTeamName + ' Manager'}
        />
      )}
    </div>
  );
}

export default GameViewerPage;
