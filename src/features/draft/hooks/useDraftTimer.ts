/**
 * useDraftTimer
 *
 * REQ-DFT-004: 60-second countdown for human draft picks.
 * When timer expires, calls onExpire callback (triggers auto-pick).
 *
 * Dependency-injected: receives timer functions as params rather
 * than importing stores directly (per REQ-SCOPE-003).
 *
 * Feature-scoped hook, only consumed by DraftBoardPage.
 */

import { useEffect, useRef } from 'react';

export interface UseDraftTimerOptions {
  /** True when it is the local user's turn to pick. */
  isActive: boolean;
  /** Changes to this value trigger a timer reset. */
  currentTeamId: string | null;
  /** Current timer value from the store. */
  pickTimerSeconds: number;
  /** Store action: decrement timer by 1. */
  tickTimer: () => void;
  /** Store action: set timer to a specific value. */
  resetTimer: (seconds: number) => void;
  /** Timer duration to reset to (default 60). */
  durationSeconds?: number;
  /** Called exactly once when timer reaches 0 while active. */
  onExpire: () => void;
}

export function useDraftTimer({
  isActive,
  currentTeamId,
  pickTimerSeconds,
  tickTimer,
  resetTimer,
  durationSeconds = 60,
  onExpire,
}: UseDraftTimerOptions): void {
  const hasExpiredRef = useRef(false);

  // Reset timer when currentTeamId changes (new turn)
  useEffect(() => {
    resetTimer(durationSeconds);
    hasExpiredRef.current = false;
  }, [currentTeamId, durationSeconds, resetTimer]);

  // Start/stop interval based on isActive
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, tickTimer]);

  // Fire onExpire exactly once when timer hits 0
  useEffect(() => {
    if (pickTimerSeconds <= 0 && isActive && !hasExpiredRef.current) {
      hasExpiredRef.current = true;
      onExpire();
    }
  }, [pickTimerSeconds, isActive, onExpire]);
}
