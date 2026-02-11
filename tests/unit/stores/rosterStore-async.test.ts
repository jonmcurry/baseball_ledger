/**
 * Tests for Roster Store -- async actions
 *
 * Covers fetchRoster and saveLineup.
 * REQ-STATE-009 through REQ-STATE-011.
 */

vi.mock('@services/roster-service', () => ({
  fetchRoster: vi.fn(),
  updateLineup: vi.fn(),
  updateTeam: vi.fn(),
}));

import { useRosterStore } from '../../../src/stores/rosterStore';
import * as rosterService from '@services/roster-service';
import type { RosterEntry } from '@lib/types/roster';
import type { PlayerCard } from '@lib/types/player';

const mockCard = (nameFirst: string, nameLast: string, pos: string, year: number): PlayerCard => ({
  playerId: `p-${nameLast.toLowerCase()}`,
  nameFirst,
  nameLast,
  seasonYear: year,
  battingHand: 'R',
  throwingHand: 'R',
  primaryPosition: pos,
  eligiblePositions: [pos],
  isPitcher: false,
  card: [7, 8, 9, 7, 13, 8, 7, 9, 8, 14, 7, 8, 9, 13, 14, 7, 8, 9, 8, 7, 9, 7, 8, 19, 8, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  powerRating: 19,
  archetype: { byte33: 7, byte34: 0 },
  speed: 0.6,
  power: 0.5,
  discipline: 0.5,
  contactRate: 0.7,
  fieldingPct: 0.98,
  range: 0.7,
  arm: 0.6,
});

const mockRoster: RosterEntry[] = [
  {
    id: 'r-1',
    playerId: 'p-1',
    playerCard: mockCard('Ken', 'Griffey', 'CF', 1993),
    rosterSlot: 'starter',
    lineupOrder: 1,
    lineupPosition: 'CF',
  },
  {
    id: 'r-2',
    playerId: 'p-2',
    playerCard: mockCard('Cal', 'Ripken', 'SS', 1991),
    rosterSlot: 'starter',
    lineupOrder: 2,
    lineupPosition: 'SS',
  },
];

describe('rosterStore async actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRosterStore.getState().reset();
  });

  // -----------------------------------------------------------------------
  // fetchRoster
  // -----------------------------------------------------------------------

  it('fetchRoster sets loading state', async () => {
    let resolveRoster!: (value: RosterEntry[]) => void;
    vi.mocked(rosterService.fetchRoster).mockReturnValue(
      new Promise((resolve) => { resolveRoster = resolve; }),
    );

    const promise = useRosterStore.getState().fetchRoster('league-1', 'team-1');
    expect(useRosterStore.getState().isLoading).toBe(true);

    resolveRoster(mockRoster);
    await promise;

    expect(useRosterStore.getState().isLoading).toBe(false);
  });

  it('fetchRoster populates roster and sets activeTeamId', async () => {
    vi.mocked(rosterService.fetchRoster).mockResolvedValue(mockRoster);

    await useRosterStore.getState().fetchRoster('league-1', 'team-1');

    const state = useRosterStore.getState();
    expect(state.activeTeamId).toBe('team-1');
    expect(state.roster).toEqual(mockRoster);
    expect(state.error).toBeNull();
  });

  it('fetchRoster sets error on failure', async () => {
    vi.mocked(rosterService.fetchRoster).mockRejectedValue(new Error('Roster not found'));

    await useRosterStore.getState().fetchRoster('league-1', 'team-1');

    const state = useRosterStore.getState();
    expect(state.error).toBe('Roster not found');
    expect(state.isLoading).toBe(false);
  });

  // -----------------------------------------------------------------------
  // saveLineup
  // -----------------------------------------------------------------------

  it('saveLineup maps current roster to lineup updates', async () => {
    // Pre-populate roster
    useRosterStore.getState().setRoster(mockRoster);
    vi.mocked(rosterService.updateLineup).mockResolvedValue(mockRoster);

    await useRosterStore.getState().saveLineup('league-1', 'team-1');

    const callArgs = vi.mocked(rosterService.updateLineup).mock.calls[0];
    const updates = callArgs[2];
    expect(updates).toHaveLength(2);
    expect(updates[0]).toEqual({
      rosterId: 'r-1',
      lineupOrder: 1,
      lineupPosition: 'CF',
      rosterSlot: 'starter',
    });
    expect(updates[1]).toEqual({
      rosterId: 'r-2',
      lineupOrder: 2,
      lineupPosition: 'SS',
      rosterSlot: 'starter',
    });
  });

  it('saveLineup calls updateLineup with correct params', async () => {
    useRosterStore.getState().setRoster(mockRoster);
    vi.mocked(rosterService.updateLineup).mockResolvedValue(mockRoster);

    await useRosterStore.getState().saveLineup('league-1', 'team-1');

    expect(rosterService.updateLineup).toHaveBeenCalledWith(
      'league-1',
      'team-1',
      expect.any(Array),
    );
    expect(useRosterStore.getState().isLoading).toBe(false);
  });

  it('saveLineup sets error on failure', async () => {
    useRosterStore.getState().setRoster(mockRoster);
    vi.mocked(rosterService.updateLineup).mockRejectedValue(new Error('Save failed'));

    await useRosterStore.getState().saveLineup('league-1', 'team-1');

    const state = useRosterStore.getState();
    expect(state.error).toBe('Save failed');
    expect(state.isLoading).toBe(false);
  });

  // -----------------------------------------------------------------------
  // invalidateRosterCache (REQ-STATE-011, REQ-STATE-012)
  // -----------------------------------------------------------------------

  it('invalidateRosterCache sets isStale and triggers refetch (REQ-STATE-012)', async () => {
    // Pre-populate
    vi.mocked(rosterService.fetchRoster).mockResolvedValue(mockRoster);
    useRosterStore.setState({ activeTeamId: 'team-1' });
    await useRosterStore.getState().fetchRoster('league-1', 'team-1');
    vi.clearAllMocks();

    vi.mocked(rosterService.fetchRoster).mockResolvedValue(mockRoster);

    useRosterStore.getState().invalidateRosterCache('league-1');

    await vi.waitFor(() => {
      expect(useRosterStore.getState().isStale).toBe(false);
    });
    expect(rosterService.fetchRoster).toHaveBeenCalledWith('league-1', 'team-1');
  });

  it('invalidateRosterCache preserves stale data during refetch (REQ-STATE-012)', async () => {
    // Pre-populate
    vi.mocked(rosterService.fetchRoster).mockResolvedValue(mockRoster);
    useRosterStore.setState({ activeTeamId: 'team-1' });
    await useRosterStore.getState().fetchRoster('league-1', 'team-1');
    vi.clearAllMocks();

    let resolveRoster!: (value: RosterEntry[]) => void;
    vi.mocked(rosterService.fetchRoster).mockReturnValue(
      new Promise((resolve) => { resolveRoster = resolve; }),
    );

    useRosterStore.getState().invalidateRosterCache('league-1');

    expect(useRosterStore.getState().roster).toEqual(mockRoster);
    expect(useRosterStore.getState().isStale).toBe(true);

    resolveRoster(mockRoster);
  });

  it('invalidateRosterCache is a no-op when no activeTeamId', () => {
    useRosterStore.getState().reset();
    vi.mocked(rosterService.fetchRoster).mockResolvedValue([]);

    useRosterStore.getState().invalidateRosterCache('league-1');

    expect(rosterService.fetchRoster).not.toHaveBeenCalled();
    expect(useRosterStore.getState().isStale).toBe(false);
  });

  it('fetchRoster clears isStale on success', async () => {
    useRosterStore.setState({ isStale: true });
    vi.mocked(rosterService.fetchRoster).mockResolvedValue(mockRoster);

    await useRosterStore.getState().fetchRoster('league-1', 'team-1');

    expect(useRosterStore.getState().isStale).toBe(false);
  });
});
