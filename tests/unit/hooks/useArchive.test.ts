// @vitest-environment jsdom
/**
 * Tests for useArchive hook (REQ-UI-011)
 *
 * Validates:
 * - Fetches archived seasons from API on mount
 * - Returns loading/data/error states
 * - Handles API errors gracefully
 */

import { renderHook, waitFor } from '@testing-library/react';

const { mockApiGet } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
}));

vi.mock('@services/api-client', () => ({
  apiGet: mockApiGet,
}));

vi.mock('@hooks/useLeague', () => ({
  useLeague: vi.fn().mockReturnValue({
    league: { id: 'league-1' },
  }),
}));

import { useArchive } from '@hooks/useArchive';

describe('useArchive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state', () => {
    mockApiGet.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useArchive('league-1'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.seasons).toEqual([]);
  });

  it('fetches archived seasons and updates state', async () => {
    const mockSeasons = [
      { id: 'arc-1', seasonNumber: 2024, champion: 'Yankees', createdAt: '2024-01-01' },
      { id: 'arc-2', seasonNumber: 2023, champion: 'Red Sox', createdAt: '2023-01-01' },
    ];
    mockApiGet.mockResolvedValue({ data: mockSeasons });

    const { result } = renderHook(() => useArchive('league-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.seasons).toHaveLength(2);
    expect(result.current.seasons[0].id).toBe('arc-1');
    expect(result.current.error).toBeNull();
  });

  it('calls API with correct league ID', async () => {
    mockApiGet.mockResolvedValue({ data: [] });

    renderHook(() => useArchive('league-42'));

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/api/leagues/league-42/archive');
    });
  });

  it('handles API errors', async () => {
    mockApiGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useArchive('league-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.seasons).toEqual([]);
  });

  it('does not fetch when leagueId is empty', () => {
    const { result } = renderHook(() => useArchive(''));

    expect(mockApiGet).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });
});
