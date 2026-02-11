export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      archives: {
        Row: {
          champion: string | null
          created_at: string
          id: string
          league_id: string
          league_leaders: Json | null
          playoff_results: Json | null
          season_number: number
          standings: Json
          stats_storage_path: string | null
        }
        Insert: {
          champion?: string | null
          created_at?: string
          id?: string
          league_id: string
          league_leaders?: Json | null
          playoff_results?: Json | null
          season_number: number
          standings: Json
          stats_storage_path?: string | null
        }
        Update: {
          champion?: string | null
          created_at?: string
          id?: string
          league_id?: string
          league_leaders?: Json | null
          playoff_results?: Json | null
          season_number?: number
          standings?: Json
          stats_storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "archives_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      game_logs: {
        Row: {
          away_score: number
          away_team_id: string
          batting_lines: Json | null
          box_score: Json | null
          created_at: string
          day_number: number
          game_id: string | null
          home_score: number
          home_team_id: string
          id: string
          innings: number | null
          league_id: string
          losing_pitcher_id: string | null
          pitching_lines: Json | null
          play_by_play: Json | null
          save_pitcher_id: string | null
          winning_pitcher_id: string | null
        }
        Insert: {
          away_score: number
          away_team_id: string
          batting_lines?: Json | null
          box_score?: Json | null
          created_at?: string
          day_number: number
          game_id?: string | null
          home_score: number
          home_team_id: string
          id?: string
          innings?: number | null
          league_id: string
          losing_pitcher_id?: string | null
          pitching_lines?: Json | null
          play_by_play?: Json | null
          save_pitcher_id?: string | null
          winning_pitcher_id?: string | null
        }
        Update: {
          away_score?: number
          away_team_id?: string
          batting_lines?: Json | null
          box_score?: Json | null
          created_at?: string
          day_number?: number
          game_id?: string | null
          home_score?: number
          home_team_id?: string
          id?: string
          innings?: number | null
          league_id?: string
          losing_pitcher_id?: string | null
          pitching_lines?: Json | null
          play_by_play?: Json | null
          save_pitcher_id?: string | null
          winning_pitcher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_logs_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_logs_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_logs_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          commissioner_id: string
          created_at: string
          current_day: number
          draft_order: Json | null
          id: string
          injuries_enabled: boolean
          invite_key: string
          name: string
          player_name_cache: Json
          playoff_bracket: Json | null
          playoff_rules: Json
          season_year: number
          status: string
          team_count: number
          year_range_end: number
          year_range_start: number
        }
        Insert: {
          commissioner_id: string
          created_at?: string
          current_day?: number
          draft_order?: Json | null
          id?: string
          injuries_enabled?: boolean
          invite_key: string
          name: string
          player_name_cache?: Json
          playoff_bracket?: Json | null
          playoff_rules?: Json
          season_year?: number
          status?: string
          team_count: number
          year_range_end?: number
          year_range_start?: number
        }
        Update: {
          commissioner_id?: string
          created_at?: string
          current_day?: number
          draft_order?: Json | null
          id?: string
          injuries_enabled?: boolean
          invite_key?: string
          name?: string
          player_name_cache?: Json
          playoff_bracket?: Json | null
          playoff_rules?: Json
          season_year?: number
          status?: string
          team_count?: number
          year_range_end?: number
          year_range_start?: number
        }
        Relationships: []
      }
      player_pool: {
        Row: {
          created_at: string
          drafted_by_team_id: string | null
          id: string
          is_drafted: boolean
          league_id: string
          player_card: Json
          player_id: string
          season_year: number
        }
        Insert: {
          created_at?: string
          drafted_by_team_id?: string | null
          id?: string
          is_drafted?: boolean
          league_id: string
          player_card: Json
          player_id: string
          season_year: number
        }
        Update: {
          created_at?: string
          drafted_by_team_id?: string | null
          id?: string
          is_drafted?: boolean
          league_id?: string
          player_card?: Json
          player_id?: string
          season_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_pool_drafted_by_team_id_fkey"
            columns: ["drafted_by_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_pool_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      rosters: {
        Row: {
          id: string
          lineup_order: number | null
          lineup_position: string | null
          player_card: Json
          player_id: string
          roster_slot: string
          season_year: number
          team_id: string
        }
        Insert: {
          id?: string
          lineup_order?: number | null
          lineup_position?: string | null
          player_card: Json
          player_id: string
          roster_slot: string
          season_year: number
          team_id: string
        }
        Update: {
          id?: string
          lineup_order?: number | null
          lineup_position?: string | null
          player_card?: Json
          player_id?: string
          roster_slot?: string
          season_year?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rosters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule: {
        Row: {
          away_score: number | null
          away_team_id: string
          day_number: number
          game_log_id: string | null
          home_score: number | null
          home_team_id: string
          id: string
          is_complete: boolean
          league_id: string
        }
        Insert: {
          away_score?: number | null
          away_team_id: string
          day_number: number
          game_log_id?: string | null
          home_score?: number | null
          home_team_id: string
          id?: string
          is_complete?: boolean
          league_id: string
        }
        Update: {
          away_score?: number | null
          away_team_id?: string
          day_number?: number
          game_log_id?: string | null
          home_score?: number | null
          home_team_id?: string
          id?: string
          is_complete?: boolean
          league_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_game_log_id_fkey"
            columns: ["game_log_id"]
            isOneToOne: false
            referencedRelation: "game_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      season_stats: {
        Row: {
          batting_stats: Json | null
          id: string
          league_id: string
          pitching_stats: Json | null
          player_id: string
          season_year: number
          team_id: string
        }
        Insert: {
          batting_stats?: Json | null
          id?: string
          league_id: string
          pitching_stats?: Json | null
          player_id: string
          season_year: number
          team_id: string
        }
        Update: {
          batting_stats?: Json | null
          id?: string
          league_id?: string
          pitching_stats?: Json | null
          player_id?: string
          season_year?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_stats_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_progress: {
        Row: {
          completed_games: number
          current_day: number
          error_message: string | null
          league_id: string
          started_at: string | null
          status: string
          total_games: number
          updated_at: string
        }
        Insert: {
          completed_games?: number
          current_day?: number
          error_message?: string | null
          league_id: string
          started_at?: string | null
          status?: string
          total_games?: number
          updated_at?: string
        }
        Update: {
          completed_games?: number
          current_day?: number
          error_message?: string | null
          league_id?: string
          started_at?: string | null
          status?: string
          total_games?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_progress_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: true
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          city: string
          division: string
          id: string
          league_division: string
          league_id: string
          losses: number
          manager_profile: string
          name: string
          owner_id: string | null
          runs_allowed: number
          runs_scored: number
          wins: number
        }
        Insert: {
          city: string
          division: string
          id?: string
          league_division: string
          league_id: string
          losses?: number
          manager_profile?: string
          name: string
          owner_id?: string | null
          runs_allowed?: number
          runs_scored?: number
          wins?: number
        }
        Update: {
          city?: string
          division?: string
          id?: string
          league_division?: string
          league_id?: string
          losses?: number
          manager_profile?: string
          name?: string
          owner_id?: string | null
          runs_allowed?: number
          runs_scored?: number
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          created_at: string
          details: Json
          id: string
          league_id: string
          team_id: string
          type: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          league_id: string
          team_id: string
          type: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          league_id?: string
          team_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      simulate_day_commit: {
        Args: {
          p_day_number: number
          p_game_logs: Json
          p_league_id: string
          p_standings_deltas: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

// ---------------------------------------------------------------------------
// Custom type aliases for application code.
// These map Supabase auto-generated row types to the names used in services
// and transforms. Re-run `npm run db:types` to regenerate the types above,
// then keep these aliases in sync.
// ---------------------------------------------------------------------------

export type PlayerPoolRow = Database['public']['Tables']['player_pool']['Row'];
export type TransactionRow = Database['public']['Tables']['transactions']['Row'];
