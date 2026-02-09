export interface DraftPickResult {
  readonly round: number;
  readonly pick: number;
  readonly teamId: string;
  readonly playerId: string;
  readonly playerName: string;
  readonly position: string;
  readonly isComplete: boolean;        // true if this was the final pick
  readonly nextTeamId: string | null;  // null if draft is complete
}

export interface DraftState {
  readonly leagueId: string;
  readonly status: 'not_started' | 'in_progress' | 'completed';
  readonly currentRound: number;
  readonly currentPick: number;
  readonly currentTeamId: string | null;
  readonly picks: DraftPickResult[];
  readonly totalRounds: number;         // 21 per REQ-DFT-001
  readonly pickTimerSeconds: number;    // 60 per REQ-DFT-004
}
