/**
 * Game Runner - Full Game Orchestrator
 *
 * REQ-SIM-001: Game state machine (inning flow, half-inning transitions).
 * REQ-SIM-002: Game state object management.
 * REQ-SIM-004: Card lookup with pitcher grade gate.
 * REQ-SIM-016: Post-game output generation.
 * REQ-NFR-007: Deterministic seeded RNG.
 *
 * Ties all simulation modules together into a single `runGame()` function
 * that orchestrates a complete baseball game from first pitch to final out.
 *
 * Layer 1: Pure logic, no I/O, deterministic given seed.
 */

import type { PlayerCard, Position } from '../types/player';
import type {
  GameState,
  TeamState,
  GameResult,
  PlayByPlayEntry,
  BaseState,
  BattingLine,
  PitchingLine,
} from '../types/game';
import { OutcomeCategory } from '../types/game';
import type { ManagerStyle } from './manager-profiles';
import { getManagerProfile } from './manager-profiles';
import { SeededRNG } from '../rng/seeded-rng';
import {
  createInitialGameState,
  advanceHalfInning,
  isGameOver,
  shouldSkipBottomHalf,
  advanceBatterIndex,
} from './engine';
import { resolvePlateAppearance } from './plate-appearance';
import { checkUmpireDecision } from './umpire-decision';
import { resolveOutcome } from './outcome-resolver';
import type { OutcomeResolution } from './outcome-resolver';
import { computeEffectiveGrade, computeGameGrade, shouldRemoveStarter, selectReliever, shouldBringInCloser } from './pitching';
import type { PitcherGameState, GradeContext } from './pitching';
import {
  evaluateStealDecision,
  evaluateBuntDecision,
  evaluateIntentionalWalkDecision,
  evaluatePitcherPullDecision,
  evaluateHitAndRunDecision,
  evaluatePinchHitDecision,
  evaluateAggressiveBaserunning,
} from './manager-ai';
import type { GameSituation } from './manager-ai';
import { resolveBunt } from './bunt-resolver';
import { attemptStolenBase, canAttemptStolenBase } from './stolen-base';
import { checkForError } from './defense';
import { applyArchetypeModifier } from './archetype-modifier';
import {
  buildLineScore,
  buildBoxScore,
  assignPitcherDecisions,
  buildEmptyBattingLine,
  buildEmptyPitchingLine,
} from './game-result';
import type { InningRuns, PitchingLineWithMeta } from './game-result';

/** Safety limit to prevent infinite loops */
const MAX_PLATE_APPEARANCES = 500;

/**
 * Configuration for running a game.
 */
export interface RunGameConfig {
  gameId: string;
  seed: number;
  homeTeamId: string;
  awayTeamId: string;
  homeLineup: { playerId: string; playerName: string; position: Position }[];
  awayLineup: { playerId: string; playerName: string; position: Position }[];
  homeBatterCards: Map<string, PlayerCard>;
  awayBatterCards: Map<string, PlayerCard>;
  homeStartingPitcher: PlayerCard;
  awayStartingPitcher: PlayerCard;
  homeBullpen: PlayerCard[];
  awayBullpen: PlayerCard[];
  homeCloser: PlayerCard | null;
  awayCloser: PlayerCard | null;
  homeManagerStyle: ManagerStyle;
  awayManagerStyle: ManagerStyle;
  homeBench?: PlayerCard[];
  awayBench?: PlayerCard[];
}

/**
 * Internal mutable game tracking state.
 */
interface GameTracker {
  rng: SeededRNG;
  playByPlay: PlayByPlayEntry[];
  inningRuns: InningRuns[];
  battingLines: Map<string, BattingLine>;
  pitchingLines: Map<string, PitchingLineWithMeta>;
  homePitcherState: PitcherGameState;
  awayPitcherState: PitcherGameState;
  homeCurrentPitcher: PlayerCard;
  awayCurrentPitcher: PlayerCard;
  homeBullpenAvailable: PlayerCard[];
  awayBullpenAvailable: PlayerCard[];
  homeCloser: PlayerCard | null;
  awayCloser: PlayerCard | null;
  homeBatterIndex: number;
  awayBatterIndex: number;
  homeBenchAvailable: PlayerCard[];
  awayBenchAvailable: PlayerCard[];
  usedPinchHitters: Set<string>;
  homeHits: number;
  awayHits: number;
  homeErrors: number;
  awayErrors: number;
  currentHalfInningRuns: number;
  consecutiveHitsWalks: number;
  unearnedRunBudget: number;
}

function isHitOutcome(outcome: OutcomeCategory): boolean {
  return (
    outcome === OutcomeCategory.SINGLE_CLEAN ||
    outcome === OutcomeCategory.SINGLE_ADVANCE ||
    outcome === OutcomeCategory.DOUBLE ||
    outcome === OutcomeCategory.TRIPLE ||
    outcome === OutcomeCategory.HOME_RUN ||
    outcome === OutcomeCategory.HOME_RUN_VARIANT
  );
}

function isWalkOutcome(outcome: OutcomeCategory): boolean {
  return (
    outcome === OutcomeCategory.WALK ||
    outcome === OutcomeCategory.WALK_INTENTIONAL ||
    outcome === OutcomeCategory.HIT_BY_PITCH
  );
}

function isStrikeout(outcome: OutcomeCategory): boolean {
  return (
    outcome === OutcomeCategory.STRIKEOUT_LOOKING ||
    outcome === OutcomeCategory.STRIKEOUT_SWINGING
  );
}

function isSingleOutcome(outcome: OutcomeCategory): boolean {
  return (
    outcome === OutcomeCategory.SINGLE_CLEAN ||
    outcome === OutcomeCategory.SINGLE_ADVANCE
  );
}

function countRunnersOnBase(bases: BaseState): number {
  let count = 0;
  if (bases.first !== null) count++;
  if (bases.second !== null) count++;
  if (bases.third !== null) count++;
  return count;
}

/** Estimate OPS from card attributes (power, contactRate, discipline). */
function estimateOps(card: PlayerCard): number {
  return (card.contactRate * 0.4) + (card.power * 0.4) + (card.discipline * 0.2);
}

function buildGameSituation(
  state: GameState,
  batterCard: PlayerCard,
  pitcherState: PitcherGameState,
  pitcherCard: PlayerCard,
  benchPlayers?: PlayerCard[],
): GameSituation {
  const startingGrade = pitcherCard.pitching?.grade ?? 1;
  const effectiveGrade = computeEffectiveGrade(pitcherCard, pitcherState.battersFaced);

  // Compute bench OPS for pinch-hit decisions
  let bestBenchOps: number | undefined;
  if (benchPlayers && benchPlayers.length > 0) {
    bestBenchOps = Math.max(...benchPlayers.map(estimateOps));
  }
  const batterOps = estimateOps(batterCard);

  return {
    inning: state.inning,
    outs: state.outs,
    runnerOnFirst: state.bases.first !== null,
    runnerOnSecond: state.bases.second !== null,
    runnerOnThird: state.bases.third !== null,
    scoreDiff: state.halfInning === 'top'
      ? state.awayScore - state.homeScore
      : state.homeScore - state.awayScore,
    batterContactRate: batterCard.contactRate,
    batterOpsRank: (batterCard.power + batterCard.contactRate) / 2,
    runnerSpeed: batterCard.speed,
    pitcherEffectiveGradePct: effectiveGrade / startingGrade,
    firstBaseOpen: state.bases.first === null,
    runnerInScoringPosition: state.bases.second !== null || state.bases.third !== null,
    bestBenchOps,
    batterOps,
  };
}

function initPitcherState(): PitcherGameState {
  return {
    inningsPitched: 0,
    battersFaced: 0,
    earnedRuns: 0,
    consecutiveHitsWalks: 0,
    currentInning: 1,
    isShutout: true,
    isNoHitter: true,
    runDeficit: 0,
  };
}

/**
 * Credit runs scored (R) to individual runners who crossed home plate.
 *
 * The OutcomeResolution provides aggregate runsScored but not which specific
 * runners scored. We compare base state before and after to identify runners
 * who disappeared from the bases. Runners disappear in priority order:
 * 3B first, then 2B, then 1B (matching advanceAllRunners in outcome-resolver).
 *
 * The batter's R is handled separately (batterDestination === 'scored'),
 * so we subtract that from the count of runs to attribute to runners.
 */
function creditRunnerRuns(
  tracker: GameTracker,
  basesBefore: BaseState,
  resolution: OutcomeResolution,
): void {
  if (resolution.runsScored <= 0) return;

  // How many runs came from baserunners (not the batter)?
  let runnerRuns = resolution.runsScored;
  if (resolution.batterDestination === 'scored') {
    runnerRuns--;
  }
  if (runnerRuns <= 0) return;

  // Collect runners before the play in scoring priority order (3B, 2B, 1B)
  const runnersBefore: string[] = [];
  if (basesBefore.third !== null) runnersBefore.push(basesBefore.third);
  if (basesBefore.second !== null) runnersBefore.push(basesBefore.second);
  if (basesBefore.first !== null) runnersBefore.push(basesBefore.first);

  // Runners still on base after the play
  const runnersAfter = new Set<string>();
  if (resolution.basesAfter.first !== null) runnersAfter.add(resolution.basesAfter.first);
  if (resolution.basesAfter.second !== null) runnersAfter.add(resolution.basesAfter.second);
  if (resolution.basesAfter.third !== null) runnersAfter.add(resolution.basesAfter.third);

  // Runners who disappeared from bases scored (in priority order)
  let credited = 0;
  for (const runnerId of runnersBefore) {
    if (credited >= runnerRuns) break;
    if (!runnersAfter.has(runnerId)) {
      const runnerLine = getOrCreateBattingLine(tracker, runnerId);
      runnerLine.R++;
      credited++;
    }
  }
}

function getOrCreateBattingLine(
  tracker: GameTracker,
  playerId: string,
  playerName?: string,
  teamSide?: 'home' | 'away',
): BattingLine {
  let line = tracker.battingLines.get(playerId);
  if (!line) {
    line = buildEmptyBattingLine(playerId, playerName, teamSide);
    tracker.battingLines.set(playerId, line);
  }
  return line;
}

function getOrCreatePitchingLine(
  tracker: GameTracker,
  playerId: string,
  isStarter: boolean,
  teamSide: 'home' | 'away',
): PitchingLineWithMeta {
  let line = tracker.pitchingLines.get(playerId);
  if (!line) {
    line = { ...buildEmptyPitchingLine(playerId), isStarter, teamSide };
    tracker.pitchingLines.set(playerId, line);
  }
  return line;
}

function recordHitStats(battingLine: BattingLine, outcome: OutcomeCategory): void {
  battingLine.H++;
  switch (outcome) {
    case OutcomeCategory.DOUBLE:
      battingLine.doubles++;
      break;
    case OutcomeCategory.TRIPLE:
      battingLine.triples++;
      break;
    case OutcomeCategory.HOME_RUN:
    case OutcomeCategory.HOME_RUN_VARIANT:
      battingLine.HR++;
      break;
  }
}

/**
 * Run a complete baseball game.
 *
 * Orchestrates all simulation modules: plate appearances, outcome resolution,
 * baserunning, defense, stolen bases, pitching management, and manager AI.
 *
 * @param config - Game configuration with teams, lineups, and pitchers
 * @returns Complete GameResult with box score, batting/pitching lines, and play-by-play
 */
export function runGame(config: RunGameConfig): GameResult {
  const rng = new SeededRNG(config.seed);

  // Create local mutable copies of batter cards to allow pinch-hit swaps
  const localHomeBatterCards = new Map(config.homeBatterCards);
  const localAwayBatterCards = new Map(config.awayBatterCards);

  // Build initial TeamState objects
  const homeTeam: TeamState = {
    teamId: config.homeTeamId,
    lineup: config.homeLineup.map((s) => ({
      rosterId: s.playerId,
      playerId: s.playerId,
      playerName: s.playerName,
      position: s.position,
    })),
    currentPitcher: config.homeStartingPitcher,
    bullpen: [...config.homeBullpen],
    closer: config.homeCloser,
    benchPlayers: config.homeBench ? [...config.homeBench] : [],
    pitcherStats: { IP: 0, H: 0, R: 0, ER: 0, BB: 0, SO: 0, HR: 0, BF: 0, pitchCount: 0 },
    pitchersUsed: [config.homeStartingPitcher],
  };

  const awayTeam: TeamState = {
    teamId: config.awayTeamId,
    lineup: config.awayLineup.map((s) => ({
      rosterId: s.playerId,
      playerId: s.playerId,
      playerName: s.playerName,
      position: s.position,
    })),
    currentPitcher: config.awayStartingPitcher,
    bullpen: [...config.awayBullpen],
    closer: config.awayCloser,
    benchPlayers: config.awayBench ? [...config.awayBench] : [],
    pitcherStats: { IP: 0, H: 0, R: 0, ER: 0, BB: 0, SO: 0, HR: 0, BF: 0, pitchCount: 0 },
    pitchersUsed: [config.awayStartingPitcher],
  };

  let state = createInitialGameState({
    gameId: config.gameId,
    homeTeam,
    awayTeam,
    seed: config.seed,
  });

  const tracker: GameTracker = {
    rng,
    playByPlay: [],
    inningRuns: [],
    battingLines: new Map(),
    pitchingLines: new Map(),
    homePitcherState: initPitcherState(),
    awayPitcherState: initPitcherState(),
    homeCurrentPitcher: config.homeStartingPitcher,
    awayCurrentPitcher: config.awayStartingPitcher,
    homeBullpenAvailable: [...config.homeBullpen],
    awayBullpenAvailable: [...config.awayBullpen],
    homeCloser: config.homeCloser,
    awayCloser: config.awayCloser,
    homeBatterIndex: 0,
    awayBatterIndex: 0,
    homeBenchAvailable: config.homeBench ? [...config.homeBench] : [],
    awayBenchAvailable: config.awayBench ? [...config.awayBench] : [],
    usedPinchHitters: new Set(),
    homeHits: 0,
    awayHits: 0,
    homeErrors: 0,
    awayErrors: 0,
    currentHalfInningRuns: 0,
    consecutiveHitsWalks: 0,
    unearnedRunBudget: 0,
  };

  // Initialize pitching lines for starters
  getOrCreatePitchingLine(tracker, config.homeStartingPitcher.playerId, true, 'home');
  getOrCreatePitchingLine(tracker, config.awayStartingPitcher.playerId, true, 'away');

  const homeProfile = getManagerProfile(config.homeManagerStyle);
  const awayProfile = getManagerProfile(config.awayManagerStyle);

  let totalPAs = 0;

  // Main game loop
  while (!isGameOver(state) && totalPAs < MAX_PLATE_APPEARANCES) {
    // Check if we should skip bottom half
    if (state.halfInning === 'bottom' && shouldSkipBottomHalf(state.inning, state.homeScore, state.awayScore)) {
      // Record empty bottom half
      tracker.inningRuns.push({ inning: state.inning, halfInning: 'bottom', runs: 0 });
      state = { ...state, isComplete: true };
      break;
    }

    tracker.currentHalfInningRuns = 0;
    tracker.consecutiveHitsWalks = 0;
    tracker.unearnedRunBudget = 0;

    const isTopHalf = state.halfInning === 'top';
    const batterCards = isTopHalf ? localAwayBatterCards : localHomeBatterCards;
    const lineup = isTopHalf ? config.awayLineup : config.homeLineup;
    const fieldingPitcher = isTopHalf ? tracker.homeCurrentPitcher : tracker.awayCurrentPitcher;
    const fieldingPitcherState = isTopHalf ? tracker.homePitcherState : tracker.awayPitcherState;
    const fieldingProfile = isTopHalf ? homeProfile : awayProfile;
    const battingProfile = isTopHalf ? awayProfile : homeProfile;
    const fieldingSide: 'home' | 'away' = isTopHalf ? 'home' : 'away';
    const battingSide: 'home' | 'away' = isTopHalf ? 'away' : 'home';
    const battingBench = isTopHalf ? tracker.awayBenchAvailable : tracker.homeBenchAvailable;

    // Process plate appearances until 3 outs
    while (state.outs < 3 && !isGameOver(state) && totalPAs < MAX_PLATE_APPEARANCES) {
      const batterIdx = isTopHalf ? tracker.awayBatterIndex : tracker.homeBatterIndex;
      let batterSlot = lineup[batterIdx];
      let batterCard = batterCards.get(batterSlot.playerId);
      if (!batterCard) break;

      // -- Manager AI pre-pitch decisions --
      const situation = buildGameSituation(state, batterCard, fieldingPitcherState, fieldingPitcher, battingBench);

      // Update fielding pitcher's run deficit (REQ-SIM-011 trigger #4)
      fieldingPitcherState.runDeficit = situation.scoreDiff;

      // 1. Pitcher pull check (fielding team manager)
      if (evaluatePitcherPullDecision(fieldingProfile, situation, rng) &&
          shouldRemoveStarter(fieldingPitcher, fieldingPitcherState)) {
        const runnersOn = countRunnersOnBase(state.bases);

        // Try closer first
        if (fieldingSide === 'home' && tracker.homeCloser &&
            shouldBringInCloser(state.homeScore, state.awayScore, state.inning, runnersOn)) {
          tracker.homeCurrentPitcher = tracker.homeCloser;
          tracker.homeCloser = null;
          tracker.homePitcherState = initPitcherState();
          state.homeTeam.pitchersUsed.push(tracker.homeCurrentPitcher);
          getOrCreatePitchingLine(tracker, tracker.homeCurrentPitcher.playerId, false, 'home');
        } else if (fieldingSide === 'away' && tracker.awayCloser &&
            shouldBringInCloser(state.awayScore, state.homeScore, state.inning, runnersOn)) {
          tracker.awayCurrentPitcher = tracker.awayCloser;
          tracker.awayCloser = null;
          tracker.awayPitcherState = initPitcherState();
          state.awayTeam.pitchersUsed.push(tracker.awayCurrentPitcher);
          getOrCreatePitchingLine(tracker, tracker.awayCurrentPitcher.playerId, false, 'away');
        } else {
          // Try reliever
          const bullpen = fieldingSide === 'home' ? tracker.homeBullpenAvailable : tracker.awayBullpenAvailable;
          const reliever = selectReliever(bullpen);
          if (reliever) {
            if (fieldingSide === 'home') {
              tracker.homeCurrentPitcher = reliever;
              tracker.homeBullpenAvailable = tracker.homeBullpenAvailable.filter((p) => p !== reliever);
              tracker.homePitcherState = initPitcherState();
              state.homeTeam.pitchersUsed.push(reliever);
            } else {
              tracker.awayCurrentPitcher = reliever;
              tracker.awayBullpenAvailable = tracker.awayBullpenAvailable.filter((p) => p !== reliever);
              tracker.awayPitcherState = initPitcherState();
              state.awayTeam.pitchersUsed.push(reliever);
            }
            getOrCreatePitchingLine(tracker, reliever.playerId, false, fieldingSide);
          }
        }
      }

      // Re-read current pitcher after potential change
      const currentPitcher = isTopHalf ? tracker.homeCurrentPitcher : tracker.awayCurrentPitcher;
      const currentPitcherState = isTopHalf ? tracker.homePitcherState : tracker.awayPitcherState;

      // 2. Stolen base check (batting team manager)
      if (state.bases.first !== null && canAttemptStolenBase('first', state.outs)) {
        const runnerCard = batterCards.get(state.bases.first) ?? batterCard;
        const stealSituation: GameSituation = {
          ...situation,
          runnerSpeed: runnerCard.speed,
        };
        if (evaluateStealDecision(battingProfile, stealSituation, rng)) {
          // Find the catcher's arm rating for the fielding team
          const catcherArm = 0.6; // Default; lineup doesn't expose full card access for catcher
          const sbResult = attemptStolenBase('first', runnerCard.speed, runnerCard.archetype, catcherArm, rng);
          const runnerBattingLine = getOrCreateBattingLine(tracker, state.bases.first);

          if (sbResult.success) {
            runnerBattingLine.SB++;
            state = {
              ...state,
              bases: { first: null, second: state.bases.first, third: state.bases.third },
            };
          } else {
            runnerBattingLine.CS++;
            state = {
              ...state,
              bases: { first: null, second: state.bases.second, third: state.bases.third },
              outs: state.outs + 1,
            };
            if (state.outs >= 3) break;
          }
          continue; // Re-evaluate situation after SB attempt (no PA consumed)
        }
      }

      // 3. Intentional walk check
      if (evaluateIntentionalWalkDecision(fieldingProfile, situation, rng)) {
        const battingLine = getOrCreateBattingLine(tracker, batterSlot.playerId, batterSlot.playerName, battingSide);
        battingLine.BB++;
        const pitchingLine = getOrCreatePitchingLine(tracker, currentPitcher.playerId, false, fieldingSide);
        pitchingLine.BB++;
        pitchingLine.BF++;

        const ibbBasesBefore = { ...state.bases };
        const ibbResolution = resolveOutcome(OutcomeCategory.WALK_INTENTIONAL, state.bases, state.outs, batterSlot.playerId);
        state = {
          ...state,
          bases: ibbResolution.basesAfter,
          homeScore: isTopHalf ? state.homeScore : state.homeScore + ibbResolution.runsScored,
          awayScore: isTopHalf ? state.awayScore + ibbResolution.runsScored : state.awayScore,
        };

        if (ibbResolution.runsScored > 0) {
          battingLine.RBI += ibbResolution.rbiCredits;
          tracker.currentHalfInningRuns += ibbResolution.runsScored;
          const unearned = Math.min(ibbResolution.runsScored, tracker.unearnedRunBudget);
          tracker.unearnedRunBudget -= unearned;
          pitchingLine.R += ibbResolution.runsScored;
          pitchingLine.ER += ibbResolution.runsScored - unearned;
          currentPitcherState.earnedRuns += ibbResolution.runsScored - unearned;
          currentPitcherState.isShutout = false;
          // Credit R to runners who scored on the IBB
          creditRunnerRuns(tracker, ibbBasesBefore, ibbResolution);
        }

        tracker.consecutiveHitsWalks++;
        currentPitcherState.consecutiveHitsWalks++;

        // Advance batter
        if (isTopHalf) {
          tracker.awayBatterIndex = advanceBatterIndex(tracker.awayBatterIndex);
        } else {
          tracker.homeBatterIndex = advanceBatterIndex(tracker.homeBatterIndex);
        }
        totalPAs++;
        continue;
      }

      // 4. Bunt check (batting team manager)
      if (evaluateBuntDecision(battingProfile, situation, rng)) {
        const buntResult = resolveBunt(rng, batterCard.speed, 0);
        const battingLine = getOrCreateBattingLine(tracker, batterSlot.playerId, batterSlot.playerName, battingSide);
        const pitchingLine = getOrCreatePitchingLine(tracker, currentPitcher.playerId, false, fieldingSide);
        pitchingLine.BF++;

        if (buntResult.outcome === null || buntResult.resumePA) {
          // Bunt foul, resume PA -- simplified: advance batter, skip this PA
          totalPAs++;
          if (isTopHalf) {
            tracker.awayBatterIndex = advanceBatterIndex(tracker.awayBatterIndex);
          } else {
            tracker.homeBatterIndex = advanceBatterIndex(tracker.homeBatterIndex);
          }
          continue;
        }

        // Resolve the bunt outcome against base state
        const buntBasesBefore = { ...state.bases };
        const buntResolution = resolveOutcome(buntResult.outcome, state.bases, state.outs, batterSlot.playerId);

        if (isHitOutcome(buntResult.outcome)) {
          battingLine.AB++;
          recordHitStats(battingLine, buntResult.outcome);
          if (isTopHalf) tracker.awayHits++;
          else tracker.homeHits++;
        } else if (buntResult.outcome === OutcomeCategory.SACRIFICE) {
          battingLine.SF++;
        } else {
          battingLine.AB++;
          if (isStrikeout(buntResult.outcome)) battingLine.SO++;
        }

        battingLine.RBI += buntResolution.rbiCredits;

        if (buntResolution.runsScored > 0) {
          tracker.currentHalfInningRuns += buntResolution.runsScored;
          const unearned = Math.min(buntResolution.runsScored, tracker.unearnedRunBudget);
          tracker.unearnedRunBudget -= unearned;
          pitchingLine.R += buntResolution.runsScored;
          pitchingLine.ER += buntResolution.runsScored - unearned;
          currentPitcherState.earnedRuns += buntResolution.runsScored - unearned;
          currentPitcherState.isShutout = false;
          // Credit R to runners who scored on the bunt
          creditRunnerRuns(tracker, buntBasesBefore, buntResolution);
        }

        state = {
          ...state,
          bases: buntResolution.basesAfter,
          outs: state.outs + buntResolution.outsAdded,
          homeScore: isTopHalf ? state.homeScore : state.homeScore + buntResolution.runsScored,
          awayScore: isTopHalf ? state.awayScore + buntResolution.runsScored : state.awayScore,
        };

        tracker.consecutiveHitsWalks = 0;
        currentPitcherState.consecutiveHitsWalks = 0;

        if (isTopHalf) {
          tracker.awayBatterIndex = advanceBatterIndex(tracker.awayBatterIndex);
        } else {
          tracker.homeBatterIndex = advanceBatterIndex(tracker.homeBatterIndex);
        }
        totalPAs++;
        if (state.outs >= 3) break;
        continue;
      }

      // 5. Hit-and-run check (batting team manager)
      const hitAndRunActive = evaluateHitAndRunDecision(battingProfile, situation, rng);

      // 6. Pinch-hit check (batting team manager)
      if (battingBench.length > 0 && evaluatePinchHitDecision(battingProfile, situation, rng)) {
        // Select best bench player by estimated OPS
        let bestIdx = 0;
        let bestOps = estimateOps(battingBench[0]);
        for (let bi = 1; bi < battingBench.length; bi++) {
          const ops = estimateOps(battingBench[bi]);
          if (ops > bestOps) { bestOps = ops; bestIdx = bi; }
        }
        const phCard = battingBench[bestIdx];
        if (!tracker.usedPinchHitters.has(phCard.playerId)) {
          tracker.usedPinchHitters.add(phCard.playerId);
          // Remove from bench
          if (isTopHalf) {
            tracker.awayBenchAvailable = tracker.awayBenchAvailable.filter((_, i) => i !== bestIdx);
          } else {
            tracker.homeBenchAvailable = tracker.homeBenchAvailable.filter((_, i) => i !== bestIdx);
          }
          // Swap batter for this PA (and future PAs in this lineup slot)
          batterCard = phCard;
          batterCards.set(batterSlot.playerId, phCard);
          batterSlot = { ...batterSlot, playerId: phCard.playerId, playerName: `${phCard.nameFirst} ${phCard.nameLast}` };
        }
      }

      // -- Standard plate appearance --
      // 6-layer grade: fatigue, relief penalty, fresh bonus, platoon, random variance
      const startingPitcherForSide = isTopHalf ? config.homeStartingPitcher : config.awayStartingPitcher;
      const isReliefSituation = currentPitcher.playerId !== startingPitcherForSide.playerId;
      let pitcherType = 0; // starter
      if (isReliefSituation) {
        pitcherType = currentPitcher.pitching?.role === 'CL' ? 7 : 1;
      }
      const gradeContext: GradeContext = {
        battersFaced: currentPitcherState.battersFaced,
        isReliefSituation,
        pitcherType,
        isFresh: isReliefSituation && currentPitcherState.battersFaced === 0,
        fatigueAdj: 0,
        batterHand: batterCard.battingHand,
        pitcherHand: currentPitcher.throwingHand,
        platoonValue: 2,
      };
      const effectiveGrade = computeGameGrade(currentPitcher, gradeContext, rng);
      // BBW: data[0x47] increments per PA (fatigue counter, after grade calc)
      currentPitcherState.battersFaced++;
      const paResult = resolvePlateAppearance(batterCard.card, currentPitcher.card, effectiveGrade, rng);
      const umpireCheck = checkUmpireDecision(paResult.outcome, rng);
      // REQ-SIM-004 Step 6: Apply archetype modifier after umpire check
      const archetypeResult = applyArchetypeModifier(umpireCheck.outcome, batterCard.archetype, rng);
      let outcome = archetypeResult.outcome;

      // Hit-and-run modifiers
      if (hitAndRunActive) {
        // On strikeout during H&R, runner is caught stealing
        if (isStrikeout(outcome) && state.bases.first !== null) {
          const runnerBattingLine = getOrCreateBattingLine(tracker, state.bases.first);
          runnerBattingLine.CS++;
          state = {
            ...state,
            bases: { first: null, second: state.bases.second, third: state.bases.third },
            outs: state.outs + 1,
          };
        }
        // Convert double play to ground out advance (runner avoids DP)
        if (outcome === OutcomeCategory.DOUBLE_PLAY || outcome === OutcomeCategory.DOUBLE_PLAY_LINE) {
          outcome = OutcomeCategory.GROUND_OUT_ADVANCE;
        }
      }

      // Resolve outcome against base/out state
      const basesBefore = { ...state.bases };
      const resolution = resolveOutcome(outcome, state.bases, state.outs, batterSlot.playerId);

      // Update batting line
      const battingLine = getOrCreateBattingLine(tracker, batterSlot.playerId, batterSlot.playerName, battingSide);
      if (!resolution.isNoPA) {
        if (!isWalkOutcome(outcome) && !resolution.sacrificeFly) {
          battingLine.AB++;
        }
        if (isHitOutcome(outcome)) {
          recordHitStats(battingLine, outcome);
          if (isTopHalf) tracker.awayHits++;
          else tracker.homeHits++;
          tracker.consecutiveHitsWalks++;
          currentPitcherState.consecutiveHitsWalks++;
          currentPitcherState.isNoHitter = false;
        } else if (isWalkOutcome(outcome)) {
          battingLine.BB++;
          if (outcome === OutcomeCategory.HIT_BY_PITCH) battingLine.HBP++;
          tracker.consecutiveHitsWalks++;
          currentPitcherState.consecutiveHitsWalks++;
        } else if (isStrikeout(outcome)) {
          battingLine.SO++;
          tracker.consecutiveHitsWalks = 0;
          currentPitcherState.consecutiveHitsWalks = 0;
        } else if (resolution.sacrificeFly) {
          battingLine.SF++;
          tracker.consecutiveHitsWalks = 0;
          currentPitcherState.consecutiveHitsWalks = 0;
        } else {
          // Other outs
          tracker.consecutiveHitsWalks = 0;
          currentPitcherState.consecutiveHitsWalks = 0;
        }

        battingLine.RBI += resolution.rbiCredits;

        // Batter scored
        if (resolution.batterDestination === 'scored') {
          battingLine.R++;
        }

        // Credit R to baserunners who crossed home plate
        creditRunnerRuns(tracker, basesBefore, resolution);
      }

      // Runners who scored
      if (resolution.runsScored > 0) {
        tracker.currentHalfInningRuns += resolution.runsScored;
        currentPitcherState.isShutout = false;
        // earnedRuns updated below alongside pitchingLine ER
      }

      // Error check for outs
      if (resolution.outsAdded > 0 && !isStrikeout(outcome)) {
        const errorResult = checkForError(batterCard.fieldingPct, rng);
        if (errorResult.errorOccurred) {
          if (isTopHalf) tracker.homeErrors++;
          else tracker.awayErrors++;
          tracker.unearnedRunBudget++;
        }
      }

      // Update pitching line
      const pitchingLine = getOrCreatePitchingLine(
        tracker,
        currentPitcher.playerId,
        currentPitcher.playerId === (isTopHalf ? config.homeStartingPitcher.playerId : config.awayStartingPitcher.playerId),
        fieldingSide,
      );
      pitchingLine.BF++;
      if (isHitOutcome(outcome)) pitchingLine.H++;
      if (isWalkOutcome(outcome)) pitchingLine.BB++;
      if (isStrikeout(outcome)) pitchingLine.SO++;
      if (outcome === OutcomeCategory.HOME_RUN || outcome === OutcomeCategory.HOME_RUN_VARIANT) {
        pitchingLine.HR++;
      }
      // Earned run tracking: consume unearned budget before counting earned runs
      if (resolution.runsScored > 0) {
        const unearned = Math.min(resolution.runsScored, tracker.unearnedRunBudget);
        tracker.unearnedRunBudget -= unearned;
        pitchingLine.R += resolution.runsScored;
        pitchingLine.ER += resolution.runsScored - unearned;
        currentPitcherState.earnedRuns += resolution.runsScored - unearned;
      }

      // Update game state
      state = {
        ...state,
        bases: resolution.basesAfter,
        outs: state.outs + resolution.outsAdded,
        homeScore: isTopHalf ? state.homeScore : state.homeScore + resolution.runsScored,
        awayScore: isTopHalf ? state.awayScore + resolution.runsScored : state.awayScore,
      };

      // Hit-and-run: advance runner from 1B to 3B on single (instead of 2B)
      if (hitAndRunActive && isSingleOutcome(outcome) && state.bases.second !== null && state.bases.third === null) {
        state = {
          ...state,
          bases: { ...state.bases, second: null, third: state.bases.second },
        };
      }

      // Aggressive baserunning: extra-base advance on singles/doubles
      if (isHitOutcome(outcome) && !isStrikeout(outcome) && state.outs < 3) {
        const aggrSituation: GameSituation = {
          ...situation,
          runnerOnFirst: state.bases.first !== null,
          runnerOnSecond: state.bases.second !== null,
          runnerOnThird: state.bases.third !== null,
          outs: state.outs,
        };
        if (evaluateAggressiveBaserunning(battingProfile, aggrSituation, rng)) {
          // Runner on 2B advances to home on single
          if (isSingleOutcome(outcome) && state.bases.second !== null) {
            const runnerId = state.bases.second;
            const runnerLine = getOrCreateBattingLine(tracker, runnerId);
            runnerLine.R++;
            state = {
              ...state,
              bases: { ...state.bases, second: null },
              homeScore: isTopHalf ? state.homeScore : state.homeScore + 1,
              awayScore: isTopHalf ? state.awayScore + 1 : state.awayScore,
            };
            tracker.currentHalfInningRuns++;
            const aggrUnearned = Math.min(1, tracker.unearnedRunBudget);
            tracker.unearnedRunBudget -= aggrUnearned;
            pitchingLine.R++;
            pitchingLine.ER += 1 - aggrUnearned;
            currentPitcherState.earnedRuns += 1 - aggrUnearned;
            currentPitcherState.isShutout = false;
            battingLine.RBI++;
          }
          // Runner on 1B advances to 3B on single
          else if (isSingleOutcome(outcome) && state.bases.first !== null && state.bases.third === null) {
            state = {
              ...state,
              bases: { ...state.bases, first: null, third: state.bases.first },
            };
          }
        }
      }

      // Record play-by-play
      tracker.playByPlay.push({
        inning: state.inning,
        halfInning: state.halfInning,
        outs: state.outs,
        batterId: batterSlot.playerId,
        pitcherId: currentPitcher.playerId,
        cardPosition: paResult.cardPosition,
        cardValue: paResult.cardValue,
        outcomeTableRow: paResult.outcomeTableRow ?? -1,
        outcome,
        description: `${batterSlot.playerName}: ${OutcomeCategory[outcome]}`,
        basesAfter: { ...state.bases },
        scoreAfter: { home: state.homeScore, away: state.awayScore },
      });

      // Advance batter in order
      if (!resolution.isNoPA) {
        if (isTopHalf) {
          tracker.awayBatterIndex = advanceBatterIndex(tracker.awayBatterIndex);
        } else {
          tracker.homeBatterIndex = advanceBatterIndex(tracker.homeBatterIndex);
        }
      }

      totalPAs++;

      // Check for walk-off
      if (isGameOver(state)) break;
    }

    // Record inning runs
    tracker.inningRuns.push({
      inning: state.inning,
      halfInning: state.halfInning,
      runs: tracker.currentHalfInningRuns,
    });

    // Update pitcher IP for the half inning
    const pitcherForIP = isTopHalf ? tracker.homeCurrentPitcher : tracker.awayCurrentPitcher;
    const pitcherStateForIP = isTopHalf ? tracker.homePitcherState : tracker.awayPitcherState;
    if (state.outs >= 3) {
      pitcherStateForIP.inningsPitched++;
      pitcherStateForIP.currentInning = state.inning + 1;
      const ipLine = getOrCreatePitchingLine(
        tracker,
        pitcherForIP.playerId,
        pitcherForIP.playerId === (isTopHalf ? config.homeStartingPitcher.playerId : config.awayStartingPitcher.playerId),
        fieldingSide,
      );
      ipLine.IP++;
    }

    // Check game end
    if (isGameOver(state)) break;

    // Advance to next half inning
    state = advanceHalfInning(state);
  }

  // Build final result
  const totalInnings = state.inning;
  const lineScore = buildLineScore(tracker.inningRuns, totalInnings);
  const boxScore = buildBoxScore(
    lineScore,
    tracker.awayHits,
    tracker.homeHits,
    tracker.awayErrors,
    tracker.homeErrors,
  );

  // Assign pitcher decisions
  const pitchingLinesArray = Array.from(tracker.pitchingLines.values());
  const withDecisions = assignPitcherDecisions(pitchingLinesArray, state.homeScore, state.awayScore);

  // Mark CG/SHO: a starter who was the only pitcher used by their team
  const homePitcherCount = state.homeTeam.pitchersUsed.length;
  const awayPitcherCount = state.awayTeam.pitchersUsed.length;
  for (const line of withDecisions) {
    if (line.isStarter) {
      const isOnlyPitcher = line.teamSide === 'home'
        ? homePitcherCount === 1
        : awayPitcherCount === 1;
      if (isOnlyPitcher) {
        line.CG = 1;
        // SHO: CG + zero runs allowed
        if (line.R === 0) {
          line.SHO = 1;
        }
      }
    }
  }

  const winnerLine = withDecisions.find((l) => l.decision === 'W');
  const loserLine = withDecisions.find((l) => l.decision === 'L');
  const saveLine = withDecisions.find((l) => l.decision === 'SV');

  // Build player name map from lineups + pitchers used
  const playerNames: Record<string, string> = {};
  for (const slot of state.homeTeam.lineup) {
    playerNames[slot.playerId] = slot.playerName;
  }
  for (const slot of state.awayTeam.lineup) {
    playerNames[slot.playerId] = slot.playerName;
  }
  for (const p of state.homeTeam.pitchersUsed) {
    playerNames[p.playerId] = `${p.nameFirst} ${p.nameLast}`;
  }
  for (const p of state.awayTeam.pitchersUsed) {
    playerNames[p.playerId] = `${p.nameFirst} ${p.nameLast}`;
  }

  // Build clean PitchingLine array (strip internal isStarter, include playerName/teamSide)
  const cleanPitchingLines: PitchingLine[] = withDecisions.map((l) => ({
    playerId: l.playerId,
    playerName: playerNames[l.playerId],
    teamSide: l.teamSide,
    IP: l.IP,
    H: l.H,
    R: l.R,
    ER: l.ER,
    BB: l.BB,
    SO: l.SO,
    HR: l.HR,
    BF: l.BF,
    CG: l.CG,
    SHO: l.SHO,
    decision: l.decision,
  }));

  return {
    gameId: config.gameId,
    homeTeamId: config.homeTeamId,
    awayTeamId: config.awayTeamId,
    homeScore: state.homeScore,
    awayScore: state.awayScore,
    innings: totalInnings,
    winningPitcherId: winnerLine?.playerId ?? '',
    losingPitcherId: loserLine?.playerId ?? '',
    savePitcherId: saveLine?.playerId ?? null,
    boxScore,
    playerBattingLines: Array.from(tracker.battingLines.values()),
    playerPitchingLines: cleanPitchingLines,
    playByPlay: tracker.playByPlay,
    playerNames,
  };
}
