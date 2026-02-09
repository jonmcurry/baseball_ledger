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

const mockRoster: RosterEntry[] = [
  {
    id: 'r-1',
    playerId: 'p-1',
    playerCard: {
      playerId: 'p-1',
      firstName: 'Ken',
      lastName: 'Griffey',
      yearId: 1993,
      bats: 'L',
      throws: 'L',
      positions: ['CF'],
      primaryPosition: 'CF',
      cardValues: [7, 8, 9, 7, 13, 8, 7, 9, 8, 14, 7, 8, 9, 13, 14, 7, 8, 9, 8, 7, 9, 7, 8, 19, 8, 7],
      pitcherGrade: null,
      powerRating: 19,
      speedRating: 6,
      battingStats: {
        G: 150, AB: 580, R: 90, H: 175, doubles: 30, triples: 5, HR: 25,
        RBI: 85, SB: 20, CS: 5, BB: 60, SO: 100, IBB: 3, HBP: 5,
        SH: 2, SF: 4, GIDP: 10, BA: 0.302, OBP: 0.370, SLG: 0.510, OPS: 0.880,
      },
      pitchingStats: null,
    },
    rosterSlot: 'starter',
    lineupOrder: 1,
    lineupPosition: 'CF',
  },
  {
    id: 'r-2',
    playerId: 'p-2',
    playerCard: {
      playerId: 'p-2',
      firstName: 'Cal',
      lastName: 'Ripken',
      yearId: 1991,
      bats: 'R',
      throws: 'R',
      positions: ['SS'],
      primaryPosition: 'SS',
      cardValues: [7, 8, 9, 7, 13, 8, 7, 9, 8, 14, 7, 8, 9, 13, 14, 7, 8, 9, 8, 7, 9, 7, 8, 19, 8, 7],
      pitcherGrade: null,
      powerRating: 19,
      speedRating: 4,
      battingStats: {
        G: 160, AB: 600, R: 85, H: 180, doubles: 28, triples: 2, HR: 20,
        RBI: 80, SB: 5, CS: 3, BB: 55, SO: 80, IBB: 2, HBP: 3,
        SH: 1, SF: 5, GIDP: 14, BA: 0.300, OBP: 0.360, SLG: 0.480, OPS: 0.840,
      },
      pitchingStats: null,
    },
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
});
