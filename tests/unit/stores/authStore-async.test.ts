/**
 * Tests for Auth Store -- async initialize action
 *
 * Covers initialize (session bootstrap + onAuthStateChange listener).
 * REQ-STATE-001.
 */

vi.mock('@lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}));

vi.mock('@services/league-service', () => ({
  fetchLeague: vi.fn(),
  fetchTeams: vi.fn(),
  fetchStandings: vi.fn(),
  fetchSchedule: vi.fn(),
}));

vi.mock('@services/roster-service', () => ({
  fetchRoster: vi.fn(),
  updateLineup: vi.fn(),
  updateTeam: vi.fn(),
}));

vi.mock('@services/stats-service', () => ({
  fetchBattingLeaders: vi.fn(),
  fetchPitchingLeaders: vi.fn(),
  fetchTeamStats: vi.fn(),
}));

vi.mock('@services/simulation-service', () => ({
  startSimulation: vi.fn(),
  subscribeToProgress: vi.fn(),
  unsubscribeFromProgress: vi.fn(),
}));

import { useAuthStore } from '../../../src/stores/authStore';
import { useLeagueStore } from '@stores/leagueStore';
import { useRosterStore } from '@stores/rosterStore';
import { useStatsStore } from '@stores/statsStore';
import { useSimulationStore } from '@stores/simulationStore';
import { getSupabaseClient } from '@lib/supabase/client';
import * as leagueService from '@services/league-service';
import * as rosterService from '@services/roster-service';

function createMockSupabaseAuth(options?: {
  session?: {
    user: { id: string; email: string; user_metadata?: Record<string, unknown> };
    access_token: string;
    expires_at?: number;
  } | null;
  getSessionError?: Error;
}) {
  const session = options?.session ?? null;
  const mockOnAuthStateChange = vi.fn().mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });

  const mockGetSession = options?.getSessionError
    ? vi.fn().mockRejectedValue(options.getSessionError)
    : vi.fn().mockResolvedValue({ data: { session } });

  vi.mocked(getSupabaseClient).mockReturnValue({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  } as never);

  return { mockGetSession, mockOnAuthStateChange };
}

describe('authStore async initialize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      session: null,
      isInitialized: false,
      error: null,
    });
    useLeagueStore.getState().reset();
    useRosterStore.getState().reset();
    useStatsStore.getState().reset();
    useSimulationStore.getState().reset();
  });

  it('initialize sets isInitialized when no session exists', async () => {
    createMockSupabaseAuth({ session: null });

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.isInitialized).toBe(true);
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
  });

  it('initialize sets user and session when session exists', async () => {
    createMockSupabaseAuth({
      session: {
        user: { id: 'u1', email: 'test@test.com', user_metadata: { display_name: 'Tester' } },
        access_token: 'token-123',
        expires_at: 1234567890,
      },
    });

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.user).toEqual({
      id: 'u1',
      email: 'test@test.com',
      displayName: 'Tester',
    });
    expect(state.session).toEqual({
      accessToken: 'token-123',
      expiresAt: 1234567890,
    });
    expect(state.isInitialized).toBe(true);
  });

  it('initialize maps user metadata to displayName', async () => {
    createMockSupabaseAuth({
      session: {
        user: { id: 'u2', email: 'no-display@test.com' },
        access_token: 'tok',
        expires_at: 999,
      },
    });

    await useAuthStore.getState().initialize();

    // When display_name is missing, falls back to email
    expect(useAuthStore.getState().user?.displayName).toBe('no-display@test.com');
  });

  it('initialize subscribes to auth state changes', async () => {
    const { mockOnAuthStateChange } = createMockSupabaseAuth({ session: null });

    await useAuthStore.getState().initialize();

    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
  });

  it('initialize handles auth state change (sign out)', async () => {
    const { mockOnAuthStateChange } = createMockSupabaseAuth({
      session: {
        user: { id: 'u1', email: 'test@test.com', user_metadata: { display_name: 'Tester' } },
        access_token: 'token-123',
        expires_at: 1234567890,
      },
    });

    await useAuthStore.getState().initialize();

    // Verify user is set after init
    expect(useAuthStore.getState().user).not.toBeNull();

    // Extract the callback and simulate sign-out
    const authCallback = mockOnAuthStateChange.mock.calls[0][0];
    authCallback('SIGNED_OUT', null);

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
  });

  it('initialize sets error on failure', async () => {
    createMockSupabaseAuth({ getSessionError: new Error('Auth service unavailable') });

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.isInitialized).toBe(true);
    expect(state.error).toBe('Auth service unavailable');
  });

  // -----------------------------------------------------------------------
  // REQ-STATE-015: Store initialization & auth lifecycle
  // -----------------------------------------------------------------------

  it('initialize with session triggers background refetch when leagueId is persisted (REQ-STATE-015)', async () => {
    // Pre-populate persisted state
    useLeagueStore.setState({ activeLeagueId: 'league-1' });
    useRosterStore.setState({ activeTeamId: 'team-1' });

    vi.mocked(leagueService.fetchLeague).mockResolvedValue({
      id: 'league-1', name: 'Test', commissionerId: 'u1', inviteKey: 'ABC',
      teamCount: 8, yearRangeStart: 1990, yearRangeEnd: 1995,
      injuriesEnabled: false, status: 'regular_season', currentDay: 42,
    });
    vi.mocked(leagueService.fetchTeams).mockResolvedValue([]);
    vi.mocked(leagueService.fetchStandings).mockResolvedValue([]);
    vi.mocked(leagueService.fetchSchedule).mockResolvedValue([]);
    vi.mocked(rosterService.fetchRoster).mockResolvedValue([]);

    createMockSupabaseAuth({
      session: {
        user: { id: 'u1', email: 'test@test.com' },
        access_token: 'tok',
        expires_at: 999,
      },
    });

    await useAuthStore.getState().initialize();

    expect(leagueService.fetchLeague).toHaveBeenCalledWith('league-1');
    expect(rosterService.fetchRoster).toHaveBeenCalledWith('league-1', 'team-1');
  });

  it('initialize with session skips roster refetch when no teamId persisted (REQ-STATE-015)', async () => {
    useLeagueStore.setState({ activeLeagueId: 'league-1' });
    // No activeTeamId

    vi.mocked(leagueService.fetchLeague).mockResolvedValue({
      id: 'league-1', name: 'Test', commissionerId: 'u1', inviteKey: 'ABC',
      teamCount: 8, yearRangeStart: 1990, yearRangeEnd: 1995,
      injuriesEnabled: false, status: 'regular_season', currentDay: 42,
    });
    vi.mocked(leagueService.fetchTeams).mockResolvedValue([]);
    vi.mocked(leagueService.fetchStandings).mockResolvedValue([]);
    vi.mocked(leagueService.fetchSchedule).mockResolvedValue([]);

    createMockSupabaseAuth({
      session: {
        user: { id: 'u1', email: 'test@test.com' },
        access_token: 'tok',
        expires_at: 999,
      },
    });

    await useAuthStore.getState().initialize();

    expect(leagueService.fetchLeague).toHaveBeenCalledWith('league-1');
    expect(rosterService.fetchRoster).not.toHaveBeenCalled();
  });

  it('initialize with no session clears cached stores (REQ-STATE-015)', async () => {
    // Pre-populate stores
    useLeagueStore.setState({ activeLeagueId: 'league-1' });
    useRosterStore.setState({ activeTeamId: 'team-1' });
    useStatsStore.setState({ battingLeaders: [{ playerId: 'p1' }] as never[] });

    createMockSupabaseAuth({ session: null });

    await useAuthStore.getState().initialize();

    expect(useLeagueStore.getState().activeLeagueId).toBeNull();
    expect(useRosterStore.getState().activeTeamId).toBeNull();
    expect(useStatsStore.getState().battingLeaders).toHaveLength(0);
  });

  it('onAuthStateChange signout resets all cached stores (REQ-STATE-015)', async () => {
    const { mockOnAuthStateChange } = createMockSupabaseAuth({
      session: {
        user: { id: 'u1', email: 'test@test.com' },
        access_token: 'tok',
        expires_at: 999,
      },
    });

    await useAuthStore.getState().initialize();

    // Pre-populate stores (as if user was active)
    useLeagueStore.setState({ activeLeagueId: 'league-1' });
    useRosterStore.setState({ activeTeamId: 'team-1' });
    useSimulationStore.setState({ status: 'complete' });

    // Simulate sign-out
    const authCallback = mockOnAuthStateChange.mock.calls[0][0];
    authCallback('SIGNED_OUT', null);

    expect(useLeagueStore.getState().activeLeagueId).toBeNull();
    expect(useRosterStore.getState().activeTeamId).toBeNull();
    expect(useSimulationStore.getState().status).toBe('idle');
  });
});
