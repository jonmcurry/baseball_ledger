/**
 * Database Types
 *
 * Manually authored to match the Supabase schema defined in supabase/migrations/.
 * Will be replaced by auto-generated types via `supabase gen types typescript`
 * once Docker is available.
 *
 * Row types use snake_case field names matching database columns.
 * Conversion to camelCase happens in the API layer (REQ-API-008).
 *
 * Layer 0: Pure type definitions.
 */

// ===================================================================
// ROW TYPES (what SELECT returns)
// ===================================================================

export type LeagueRow = {
  id: string;
  name: string;
  commissioner_id: string;
  invite_key: string;
  team_count: number;
  year_range_start: number;
  year_range_end: number;
  injuries_enabled: boolean;
  playoff_rules: Record<string, unknown>;
  status: 'setup' | 'drafting' | 'regular_season' | 'playoffs' | 'completed';
  current_day: number;
  season_year: number;
  draft_order: string[] | null;
  playoff_bracket: Record<string, unknown> | null;
  player_name_cache: Record<string, string>;
  created_at: string;
}

export type TeamRow = {
  id: string;
  league_id: string;
  name: string;
  city: string;
  owner_id: string | null;
  manager_profile: 'conservative' | 'aggressive' | 'balanced' | 'analytical';
  league_division: 'AL' | 'NL';
  division: 'East' | 'South' | 'West' | 'North';
  wins: number;
  losses: number;
  runs_scored: number;
  runs_allowed: number;
}

export type RosterRow = {
  id: string;
  team_id: string;
  player_id: string;
  season_year: number;
  player_card: Record<string, unknown>;
  roster_slot: 'starter' | 'bench' | 'rotation' | 'bullpen' | 'closer';
  lineup_order: number | null;
  lineup_position: string | null;
}

export type ScheduleRow = {
  id: string;
  league_id: string;
  day_number: number;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  is_complete: boolean;
  game_log_id: string | null;
}

export type SeasonStatsRow = {
  id: string;
  league_id: string;
  player_id: string;
  season_year: number;
  team_id: string;
  batting_stats: Record<string, unknown> | null;
  pitching_stats: Record<string, unknown> | null;
}

export type GameLogRow = {
  id: string;
  league_id: string;
  day_number: number;
  game_id: string | null;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  innings: number | null;
  winning_pitcher_id: string | null;
  losing_pitcher_id: string | null;
  save_pitcher_id: string | null;
  box_score: Record<string, unknown> | null;
  play_by_play: Record<string, unknown>[] | null;
  batting_lines: Record<string, unknown> | null;
  pitching_lines: Record<string, unknown> | null;
  created_at: string;
}

export type ArchiveRow = {
  id: string;
  league_id: string;
  season_number: number;
  standings: Record<string, unknown>;
  playoff_results: Record<string, unknown> | null;
  champion: string | null;
  league_leaders: Record<string, unknown> | null;
  stats_storage_path: string | null;
  created_at: string;
}

export type PlayerPoolRow = {
  id: string;
  league_id: string;
  player_id: string;
  season_year: number;
  player_card: Record<string, unknown>;
  is_drafted: boolean;
  drafted_by_team_id: string | null;
  created_at: string;
}

export type SimulationProgressRow = {
  league_id: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  total_games: number;
  completed_games: number;
  current_day: number;
  started_at: string | null;
  updated_at: string;
  error_message: string | null;
}

// ===================================================================
// INSERT TYPES (what INSERT accepts, omitting auto-generated fields)
// ===================================================================

export type LeagueInsert = {
  id?: string;
  name: string;
  commissioner_id: string;
  invite_key: string;
  team_count: number;
  year_range_start?: number;
  year_range_end?: number;
  injuries_enabled?: boolean;
  playoff_rules?: Record<string, unknown>;
  status?: LeagueRow['status'];
  current_day?: number;
  season_year?: number;
  draft_order?: string[] | null;
  playoff_bracket?: Record<string, unknown> | null;
  player_name_cache?: Record<string, string>;
}

export type TeamInsert = {
  id?: string;
  league_id: string;
  name: string;
  city: string;
  owner_id?: string | null;
  manager_profile?: TeamRow['manager_profile'];
  league_division: 'AL' | 'NL';
  division: TeamRow['division'];
  wins?: number;
  losses?: number;
  runs_scored?: number;
  runs_allowed?: number;
}

export type RosterInsert = {
  id?: string;
  team_id: string;
  player_id: string;
  season_year: number;
  player_card: Record<string, unknown>;
  roster_slot: RosterRow['roster_slot'];
  lineup_order?: number | null;
  lineup_position?: string | null;
}

export type ScheduleInsert = {
  id?: string;
  league_id: string;
  day_number: number;
  home_team_id: string;
  away_team_id: string;
  home_score?: number | null;
  away_score?: number | null;
  is_complete?: boolean;
  game_log_id?: string | null;
}

export type SeasonStatsInsert = {
  id?: string;
  league_id: string;
  player_id: string;
  season_year: number;
  team_id: string;
  batting_stats?: Record<string, unknown> | null;
  pitching_stats?: Record<string, unknown> | null;
}

export type GameLogInsert = {
  id?: string;
  league_id: string;
  day_number: number;
  game_id?: string | null;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  innings?: number | null;
  winning_pitcher_id?: string | null;
  losing_pitcher_id?: string | null;
  save_pitcher_id?: string | null;
  box_score?: Record<string, unknown> | null;
  play_by_play?: Record<string, unknown>[] | null;
  batting_lines?: Record<string, unknown> | null;
  pitching_lines?: Record<string, unknown> | null;
}

export type ArchiveInsert = {
  id?: string;
  league_id: string;
  season_number: number;
  standings: Record<string, unknown>;
  playoff_results?: Record<string, unknown> | null;
  champion?: string | null;
  league_leaders?: Record<string, unknown> | null;
  stats_storage_path?: string | null;
}

export type PlayerPoolInsert = {
  id?: string;
  league_id: string;
  player_id: string;
  season_year: number;
  player_card: Record<string, unknown>;
  is_drafted?: boolean;
  drafted_by_team_id?: string | null;
}

export type SimulationProgressInsert = {
  league_id: string;
  status?: SimulationProgressRow['status'];
  total_games?: number;
  completed_games?: number;
  current_day?: number;
  started_at?: string | null;
  error_message?: string | null;
}

// ===================================================================
// UPDATE TYPES (all fields optional except where noted)
// ===================================================================

export type LeagueUpdate = Partial<Omit<LeagueRow, 'id' | 'created_at'>>;
export type TeamUpdate = Partial<Omit<TeamRow, 'id' | 'league_id'>>;
export type RosterUpdate = Partial<Omit<RosterRow, 'id' | 'team_id' | 'player_id'>>;
export type ScheduleUpdate = Partial<Omit<ScheduleRow, 'id' | 'league_id'>>;
export type SeasonStatsUpdate = Partial<Omit<SeasonStatsRow, 'id' | 'league_id'>>;
export type GameLogUpdate = Partial<Omit<GameLogRow, 'id' | 'league_id' | 'created_at'>>;
export type ArchiveUpdate = Partial<Omit<ArchiveRow, 'id' | 'league_id' | 'created_at'>>;
export type PlayerPoolUpdate = Partial<Omit<PlayerPoolRow, 'id' | 'league_id' | 'created_at'>>;
export type SimulationProgressUpdate = Partial<Omit<SimulationProgressRow, 'league_id'>>;

// ===================================================================
// DATABASE INTERFACE (Supabase gen types format)
// ===================================================================

export type Database = {
  public: {
    Tables: {
      leagues: {
        Row: LeagueRow;
        Insert: LeagueInsert;
        Update: LeagueUpdate;
        Relationships: [];
      };
      teams: {
        Row: TeamRow;
        Insert: TeamInsert;
        Update: TeamUpdate;
        Relationships: [
          { foreignKeyName: 'teams_league_id_fkey'; columns: ['league_id']; isOneToOne: false; referencedRelation: 'leagues'; referencedColumns: ['id'] },
        ];
      };
      rosters: {
        Row: RosterRow;
        Insert: RosterInsert;
        Update: RosterUpdate;
        Relationships: [
          { foreignKeyName: 'rosters_team_id_fkey'; columns: ['team_id']; isOneToOne: false; referencedRelation: 'teams'; referencedColumns: ['id'] },
        ];
      };
      schedule: {
        Row: ScheduleRow;
        Insert: ScheduleInsert;
        Update: ScheduleUpdate;
        Relationships: [
          { foreignKeyName: 'schedule_league_id_fkey'; columns: ['league_id']; isOneToOne: false; referencedRelation: 'leagues'; referencedColumns: ['id'] },
          { foreignKeyName: 'schedule_home_team_id_fkey'; columns: ['home_team_id']; isOneToOne: false; referencedRelation: 'teams'; referencedColumns: ['id'] },
          { foreignKeyName: 'schedule_away_team_id_fkey'; columns: ['away_team_id']; isOneToOne: false; referencedRelation: 'teams'; referencedColumns: ['id'] },
        ];
      };
      season_stats: {
        Row: SeasonStatsRow;
        Insert: SeasonStatsInsert;
        Update: SeasonStatsUpdate;
        Relationships: [
          { foreignKeyName: 'season_stats_league_id_fkey'; columns: ['league_id']; isOneToOne: false; referencedRelation: 'leagues'; referencedColumns: ['id'] },
          { foreignKeyName: 'season_stats_team_id_fkey'; columns: ['team_id']; isOneToOne: false; referencedRelation: 'teams'; referencedColumns: ['id'] },
        ];
      };
      game_logs: {
        Row: GameLogRow;
        Insert: GameLogInsert;
        Update: GameLogUpdate;
        Relationships: [
          { foreignKeyName: 'game_logs_league_id_fkey'; columns: ['league_id']; isOneToOne: false; referencedRelation: 'leagues'; referencedColumns: ['id'] },
          { foreignKeyName: 'game_logs_home_team_id_fkey'; columns: ['home_team_id']; isOneToOne: false; referencedRelation: 'teams'; referencedColumns: ['id'] },
          { foreignKeyName: 'game_logs_away_team_id_fkey'; columns: ['away_team_id']; isOneToOne: false; referencedRelation: 'teams'; referencedColumns: ['id'] },
        ];
      };
      archives: {
        Row: ArchiveRow;
        Insert: ArchiveInsert;
        Update: ArchiveUpdate;
        Relationships: [
          { foreignKeyName: 'archives_league_id_fkey'; columns: ['league_id']; isOneToOne: false; referencedRelation: 'leagues'; referencedColumns: ['id'] },
        ];
      };
      player_pool: {
        Row: PlayerPoolRow;
        Insert: PlayerPoolInsert;
        Update: PlayerPoolUpdate;
        Relationships: [
          { foreignKeyName: 'player_pool_league_id_fkey'; columns: ['league_id']; isOneToOne: false; referencedRelation: 'leagues'; referencedColumns: ['id'] },
          { foreignKeyName: 'player_pool_drafted_by_team_id_fkey'; columns: ['drafted_by_team_id']; isOneToOne: false; referencedRelation: 'teams'; referencedColumns: ['id'] },
        ];
      };
      simulation_progress: {
        Row: SimulationProgressRow;
        Insert: SimulationProgressInsert;
        Update: SimulationProgressUpdate;
        Relationships: [
          { foreignKeyName: 'simulation_progress_league_id_fkey'; columns: ['league_id']; isOneToOne: true; referencedRelation: 'leagues'; referencedColumns: ['id'] },
        ];
      };
    };
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    Views: {};
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    Functions: {};
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    Enums: {};
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    CompositeTypes: {};
  };
}
