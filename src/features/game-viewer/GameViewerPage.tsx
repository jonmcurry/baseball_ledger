/**
 * GameViewerPage
 *
 * ESPN Broadcast-style game viewer: dark scoreboard header,
 * replay controls toolbar, tabbed content (Box Score, Play-by-Play,
 * Commentary, Decisions).
 *
 * Data sources (priority order):
 * 1. In-memory simulation store (current session results)
 * 2. Database game_logs via API (persisted from previous sessions)
 *
 * Layer 7: Feature page. Composes hooks + sub-components.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLeague } from '@hooks/useLeague';
import { useSimulationStore } from '@stores/simulationStore';
import { useWorkerSimulation } from '@hooks/useWorkerSimulation';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { LoadingLedger } from '@components/feedback/LoadingLedger';
import { GameStatePanel } from './GameStatePanel';
import { PlayByPlayFeed } from './PlayByPlayFeed';
import { BoxScoreDisplay } from './BoxScoreDisplay';
import type { SeasonStatsMap } from './BoxScoreDisplay';
import { CommentarySection } from './CommentarySection';
import { GameSummaryPanel } from './GameSummaryPanel';
import { ManagerDecisionsPanel } from './ManagerDecisionsPanel';
import { ReplayControls, type ReplaySpeed } from './ReplayControls';
import { TeamLogo } from '@components/baseball/TeamLogo';
import { detectDecisions } from '@lib/ai/decision-detector';
import type { GameSummaryRequest } from '@lib/types/ai';
import type { BoxScore, BattingLine, PitchingLine, PlayByPlayEntry } from '@lib/types/game';
import { apiGet } from '@services/api-client';
import { fetchBatchPlayerSeasonStats } from '@services/stats-service';
import { usePageTitle } from '@hooks/usePageTitle';

type ViewTab = 'box-score' | 'play-by-play' | 'commentary' | 'decisions';

/** Milliseconds between plays at each speed. */
const SPEED_MS: Record<ReplaySpeed, number> = {
  '1x': 2000,
  '2x': 1000,
  '5x': 400,
  'Max': 50,
};

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

  // Replay state
  const [replayActive, setReplayActive] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState<ReplaySpeed>('2x');
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      const names: Record<string, string> = {};
      for (const bl of dbGame.battingLines ?? []) {
        if (bl.playerName) names[bl.playerId] = bl.playerName;
      }
      for (const pl of dbGame.pitchingLines ?? []) {
        if (pl.playerName) names[pl.playerId] = pl.playerName;
      }

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
        playerNames: names,
        homeTeamName: homeName,
        awayTeamName: awayName,
      };
    }

    return null;
  }, [storeResult, workerSim.result, dbGame, teamNameMap]);

  // --- Season stats for AVG/OBP/SLG columns ---
  const [seasonStats, setSeasonStats] = useState<SeasonStatsMap>({});

  useEffect(() => {
    if (!leagueId || !gameData) return;

    const playerIds = [
      ...gameData.battingLines.map((l) => l.playerId),
      ...gameData.pitchingLines.map((l) => l.playerId),
    ];
    const uniqueIds = [...new Set(playerIds)];
    if (uniqueIds.length === 0) return;

    let cancelled = false;
    fetchBatchPlayerSeasonStats(leagueId, uniqueIds)
      .then((stats) => {
        if (cancelled) return;
        const map: SeasonStatsMap = {};
        for (const s of stats) {
          if (s.battingStats) {
            map[s.playerId] = {
              batting: {
                AB: s.battingStats.AB,
                H: s.battingStats.H,
                doubles: s.battingStats.doubles,
                triples: s.battingStats.triples,
                HR: s.battingStats.HR,
                BB: s.battingStats.BB,
                HBP: s.battingStats.HBP,
                SF: s.battingStats.SF,
              },
            };
          }
        }
        setSeasonStats(map);
      })
      .catch(() => {
        // Season stats are optional; box score still renders with per-game rates
      });

    return () => { cancelled = true; };
  }, [leagueId, gameData]);

  // --- Replay auto-advance timer ---
  useEffect(() => {
    if (replayTimerRef.current) {
      clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    if (!isPlaying || !replayActive || !gameData) return;
    const totalPlays = gameData.playByPlay.length;
    if (replayIndex >= totalPlays) {
      setIsPlaying(false);
      return;
    }
    replayTimerRef.current = setTimeout(() => {
      setReplayIndex((i) => i + 1);
    }, SPEED_MS[replaySpeed] ?? 1000);
    return () => {
      if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
    };
  }, [isPlaying, replayActive, replayIndex, replaySpeed, gameData]);

  // Derived: plays visible during replay (or all when replay is off)
  const visiblePlays = useMemo(() => {
    if (!gameData) return [];
    if (!replayActive) return gameData.playByPlay;
    return gameData.playByPlay.slice(0, replayIndex);
  }, [gameData, replayActive, replayIndex]);

  // Derived: game state from current play during replay
  const currentGameState = useMemo(() => {
    if (!gameData) return null;
    if (!replayActive || replayIndex === 0) {
      return {
        bases: { first: null, second: null, third: null },
        outs: 0,
        homeScore: gameData.homeScore,
        awayScore: gameData.awayScore,
        inning: gameData.innings,
        halfInning: 'bottom' as const,
        isComplete: !replayActive,
      };
    }
    const play = gameData.playByPlay[replayIndex - 1];
    if (!play) return null;
    return {
      bases: play.basesAfter,
      outs: play.outs,
      homeScore: play.scoreAfter.home,
      awayScore: play.scoreAfter.away,
      inning: play.inning,
      halfInning: play.halfInning,
      isComplete: replayIndex >= gameData.playByPlay.length,
    };
  }, [gameData, replayActive, replayIndex]);

  const startReplay = useCallback(() => {
    setReplayActive(true);
    setReplayIndex(0);
    setIsPlaying(true);
    setActiveTab('play-by-play');
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!replayActive) return;
    if (replayIndex >= (gameData?.playByPlay.length ?? 0)) {
      setReplayIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((p) => !p);
    }
  }, [replayActive, replayIndex, gameData]);

  const skipToEnd = useCallback(() => {
    if (!gameData) return;
    setReplayIndex(gameData.playByPlay.length);
    setIsPlaying(false);
  }, [gameData]);

  const exitReplay = useCallback(() => {
    setReplayActive(false);
    setReplayIndex(0);
    setIsPlaying(false);
  }, []);

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
      <div>
        <h2 className="toolbar-label mb-gutter">Game Viewer</h2>
        <ErrorBanner severity="warning" message="No game ID provided." />
      </div>
    );
  }

  if (dbLoading) {
    return <LoadingLedger message="Loading game data..." />;
  }

  if (!gameData) {
    return (
      <div>
        <h2 className="toolbar-label mb-gutter">Game Viewer</h2>
        {dbError ? (
          <ErrorBanner severity="error" message={dbError} />
        ) : (
          <div className="panel">
            <div className="panel-header">
              <span>Game Not Found</span>
            </div>
            <div className="panel-body">
              <p className="font-stat text-xs text-[var(--text-tertiary)]">Game {gameId} is not available.</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const hasDetailedData = gameData.boxScore !== null
    || gameData.playByPlay.length > 0
    || gameData.battingLines.length > 0
    || gameData.pitchingLines.length > 0;

  // Available tabs based on data
  const tabs: { key: ViewTab; label: string; available: boolean }[] = [
    { key: 'box-score', label: 'Box Score', available: hasDetailedData },
    { key: 'play-by-play', label: 'Play-by-Play', available: hasDetailedData && gameData.playByPlay.length > 0 },
    { key: 'commentary', label: 'Commentary', available: gameData.playByPlay.length > 0 },
    { key: 'decisions', label: 'Decisions', available: detectedDecisions.length > 0 },
  ];

  return (
    <div>
      {/* Broadcast scoreboard header -- dark navy */}
      <div className="hero-score">
        <div className="hero-score-team hero-score-team--away">
          <div className="hero-score-team-info">
            <span className="hero-score-team-name">{gameData.awayTeamName}</span>
          </div>
          <TeamLogo teamName={gameData.awayTeamName} size={48} />
          <span className="hero-score-number">{gameData.awayScore}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="broadcast-badge">
            {replayActive ? `${currentGameState?.halfInning === 'top' ? 'Top' : 'Bot'} ${currentGameState?.inning ?? ''}` : 'FINAL'}
          </span>
        </div>
        <div className="hero-score-team hero-score-team--home">
          <div className="hero-score-team-info">
            <span className="hero-score-team-name">{gameData.homeTeamName}</span>
          </div>
          <TeamLogo teamName={gameData.homeTeamName} size={48} />
          <span className="hero-score-number">{gameData.homeScore}</span>
        </div>
      </div>
      {!replayActive && gameData.innings !== 9 && (
        <p className="hero-score-detail">({gameData.innings} innings)</p>
      )}

      {/* Game state: visible during replay or as final summary */}
      {currentGameState && replayActive ? (
        <GameStatePanel
          gameState={currentGameState}
          homeTeam={gameData.homeTeamName}
          awayTeam={gameData.awayTeamName}
        />
      ) : !replayActive && (
        <GameStatePanel
          gameState={{
            inning: gameData.innings || 9,
            halfInning: 'bottom',
            outs: 3,
            bases: { first: null, second: null, third: null },
            homeScore: gameData.homeScore,
            awayScore: gameData.awayScore,
            isComplete: true,
          }}
          homeTeam={gameData.homeTeamName}
          awayTeam={gameData.awayTeamName}
        />
      )}

      {/* Worker simulation status */}
      {storeResult && workerSim.status === 'running' && (
        <div className="toolbar justify-center">
          <span className="font-stat text-xs text-[var(--text-tertiary)]">Simulating replay...</span>
          <div className="h-1 w-32 overflow-hidden bg-[var(--surface-overlay)]">
            <div className="h-full w-1/2 animate-pulse bg-[var(--accent-primary)]" />
          </div>
        </div>
      )}

      {storeResult && workerSim.status === 'error' && workerSim.error && (
        <ErrorBanner severity="error" message={workerSim.error} />
      )}

      {/* Replay controls toolbar */}
      {hasDetailedData && gameData.playByPlay.length > 0 && !replayActive && (
        <div className="toolbar justify-center">
          <button
            type="button"
            className="toolbar-btn"
            onClick={startReplay}
          >
            Watch Replay
          </button>
        </div>
      )}

      {replayActive && (
        <ReplayControls
          currentPlay={replayIndex}
          totalPlays={gameData.playByPlay.length}
          isPlaying={isPlaying}
          speed={replaySpeed}
          onTogglePlay={togglePlayPause}
          onSpeedChange={setReplaySpeed}
          onSkipToEnd={skipToEnd}
          onExit={exitReplay}
        />
      )}

      {/* Tab navigation */}
      {hasDetailedData && (
        <div className="tab-strip" role="tablist">
          {tabs.filter((t) => t.available).map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`tab-strip-item${activeTab === tab.key ? ' tab-strip-item--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      {hasDetailedData && activeTab === 'box-score' && (
        <BoxScoreDisplay
          boxScore={gameData.boxScore}
          battingLines={gameData.battingLines}
          pitchingLines={gameData.pitchingLines}
          homeTeam={gameData.homeTeamName}
          awayTeam={gameData.awayTeamName}
          playByPlay={gameData.playByPlay}
          seasonStats={seasonStats}
        />
      )}

      {hasDetailedData && activeTab === 'play-by-play' && (
        <PlayByPlayFeed
          plays={visiblePlays}
          teams={teamNameMap}
        />
      )}

      {activeTab === 'commentary' && gameData.playByPlay.length > 0 && (
        <CommentarySection
          plays={gameData.playByPlay.slice(-10)}
          playerNames={gameData.playerNames}
          style="newspaper"
        />
      )}

      {activeTab === 'decisions' && detectedDecisions.length > 0 && (
        <ManagerDecisionsPanel
          decisions={detectedDecisions}
          managerStyle="balanced"
          homeTeamName={gameData.homeTeamName}
          awayTeamName={gameData.awayTeamName}
        />
      )}

      {!hasDetailedData && (
        <div className="panel mt-gutter">
          <div className="panel-body text-center">
            <p className="font-stat text-sm text-[var(--text-tertiary)]">
              Detailed game data is not yet available.
            </p>
          </div>
        </div>
      )}

      {/* Game Summary */}
      {gameSummaryRequest && (
        <div className="mt-gutter">
          <GameSummaryPanel request={gameSummaryRequest} />
        </div>
      )}
    </div>
  );
}

export default GameViewerPage;
