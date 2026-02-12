// @vitest-environment jsdom
/**
 * Tests for draftStore.fetchAvailablePlayers
 *
 * REQ-DATA-002: Player pool feeds draft board with available players.
 */

const { mockFetchAvailablePlayers } = vi.hoisted(() => ({
  mockFetchAvailablePlayers: vi.fn(),
}));

vi.mock('@services/draft-service', () => ({
  fetchDraftState: vi.fn(),
  submitPick: vi.fn(),
  startDraft: vi.fn(),
  autoPick: vi.fn(),
  fetchAvailablePlayers: mockFetchAvailablePlayers,
}));

import { act } from '@testing-library/react';
import { useDraftStore } from '@stores/draftStore';

describe('draftStore.fetchAvailablePlayers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => useDraftStore.getState().reset());
  });

  it('sets availablePlayers on success', async () => {
    const mockPlayers = [
      {
        player_id: 'ruthba01',
        season_year: 1927,
        player_card: {
          playerId: 'ruthba01',
          nameFirst: 'Babe',
          nameLast: 'Ruth',
          seasonYear: 1927,
          primaryPosition: 'RF',
          eligiblePositions: ['RF'],
        },
      },
    ];
    mockFetchAvailablePlayers.mockResolvedValue({ rows: mockPlayers, totalRows: 1 });

    await act(async () => {
      await useDraftStore.getState().fetchAvailablePlayers('league-1');
    });

    const state = useDraftStore.getState();
    expect(state.availablePlayers).toHaveLength(1);
    expect(state.availablePlayers[0].playerId).toBe('ruthba01');
    expect(state.availablePlayers[0].nameFirst).toBe('Babe');
    expect(state.isLoading).toBe(false);
  });

  it('sets error on fetch failure', async () => {
    mockFetchAvailablePlayers.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      await useDraftStore.getState().fetchAvailablePlayers('league-1');
    });

    const state = useDraftStore.getState();
    expect(state.error).toBe('Network error');
    expect(state.availablePlayers).toHaveLength(0);
    expect(state.isLoading).toBe(false);
  });

  it('calls draft service with correct league ID', async () => {
    mockFetchAvailablePlayers.mockResolvedValue({ rows: [], totalRows: 0 });

    await act(async () => {
      await useDraftStore.getState().fetchAvailablePlayers('league-42');
    });

    expect(mockFetchAvailablePlayers).toHaveBeenCalledWith('league-42', { pageSize: 50, sortBy: 'nameLast', sortOrder: 'asc' });
  });

  it('passes filter options to service', async () => {
    mockFetchAvailablePlayers.mockResolvedValue({ rows: [], totalRows: 0 });

    await act(async () => {
      await useDraftStore.getState().fetchAvailablePlayers('league-1', {
        position: 'SP',
        search: 'ruth',
      });
    });

    expect(mockFetchAvailablePlayers).toHaveBeenCalledWith('league-1', {
      pageSize: 50,
      sortBy: 'nameLast',
      sortOrder: 'asc',
      position: 'SP',
      search: 'ruth',
    });
  });

  it('does not set isLoading during player fetch (background update)', async () => {
    let resolvePromise: (value: unknown) => void;
    mockFetchAvailablePlayers.mockReturnValue(
      new Promise((resolve) => { resolvePromise = resolve; }),
    );

    const fetchPromise = act(async () => {
      useDraftStore.getState().fetchAvailablePlayers('league-1');
    });

    // Player fetches are silent background updates -- isLoading stays false
    expect(useDraftStore.getState().isLoading).toBe(false);

    // Resolve and verify it completes
    resolvePromise!({ rows: [], totalRows: 0 });
    await fetchPromise;
  });
});
