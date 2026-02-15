/**
 * Manager Personality Profiles
 *
 * REQ-AI-001: Four manager personality profiles ported from APBA BBW
 * (MGRCAPTS, MGRDUKER, MGRJMCOY, MGRLPEPR).
 *
 * Each profile defines decision thresholds and inning multipliers
 * that govern all in-game strategic decisions.
 *
 * Layer 1: Pure data, no I/O, no side effects.
 */

export type ManagerStyle = 'conservative' | 'aggressive' | 'balanced' | 'analytical';

export interface ManagerProfile {
  name: string;
  style: ManagerStyle;

  stealAttemptThreshold: number;
  buntThreshold: number;
  hitAndRunThreshold: number;
  pinchHitThreshold: number;
  intentionalWalkThreshold: number;
  pitcherPullThreshold: number;
  aggressiveBaserunning: number;

  lateInningMultiplier: number;
  extraInningMultiplier: number;
}

/**
 * The four manager profiles, ported from APBA BBW.
 *
 * Cap Spalding (conservative) -- traditional, bunts often, rarely steals
 * Duke Robinson (aggressive) -- risk-taking, steals often, quick hook
 * Johnny McCoy (balanced) -- adaptive, moderate thresholds
 * Larry Pepper (analytical) -- data-driven, almost never bunts, platoon-heavy
 */
export const MANAGER_PROFILES: Record<ManagerStyle, ManagerProfile> = {
  conservative: {
    name: 'Cap Spalding',
    style: 'conservative',
    stealAttemptThreshold: 0.25,
    buntThreshold: 0.60,
    hitAndRunThreshold: 0.15,
    pinchHitThreshold: 0.40,
    intentionalWalkThreshold: 0.12,
    pitcherPullThreshold: 0.70,
    aggressiveBaserunning: 0.30,
    lateInningMultiplier: 1.2,
    extraInningMultiplier: 1.5,
  },

  aggressive: {
    name: 'Duke Robinson',
    style: 'aggressive',
    stealAttemptThreshold: 0.65,
    buntThreshold: 0.20,
    hitAndRunThreshold: 0.55,
    pinchHitThreshold: 0.60,
    intentionalWalkThreshold: 0.05,
    pitcherPullThreshold: 0.40,
    aggressiveBaserunning: 0.75,
    lateInningMultiplier: 1.4,
    extraInningMultiplier: 1.8,
  },

  balanced: {
    name: 'Johnny McCoy',
    style: 'balanced',
    stealAttemptThreshold: 0.45,
    buntThreshold: 0.40,
    hitAndRunThreshold: 0.35,
    pinchHitThreshold: 0.50,
    intentionalWalkThreshold: 0.08,
    pitcherPullThreshold: 0.55,
    aggressiveBaserunning: 0.50,
    lateInningMultiplier: 1.3,
    extraInningMultiplier: 1.6,
  },

  analytical: {
    name: 'Larry Pepper',
    style: 'analytical',
    stealAttemptThreshold: 0.35,
    buntThreshold: 0.15,
    hitAndRunThreshold: 0.25,
    pinchHitThreshold: 0.70,
    intentionalWalkThreshold: 0.15,
    pitcherPullThreshold: 0.45,
    aggressiveBaserunning: 0.55,
    lateInningMultiplier: 1.5,
    extraInningMultiplier: 2.0,
  },
};

/**
 * Get a manager profile by style.
 */
export function getManagerProfile(style: ManagerStyle): ManagerProfile {
  return MANAGER_PROFILES[style];
}
