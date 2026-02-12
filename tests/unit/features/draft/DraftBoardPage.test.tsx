// @vitest-environment jsdom
/**
 * Tests for DraftBoardPage
 */

import { render, screen } from '@testing-library/react';
import { DraftBoardPage } from '@features/draft/DraftBoardPage';
import {
  createMockDraftState,
  createMockAvailablePlayer,
} from '../../../fixtures/mock-draft';

const { mockFetchDraftState, mockFetchAvailablePlayers, mockSubmitPick, mockTriggerAutoPick, mockTickTimer, mockResetTimer, mockUseDraft, mockUseDraftTimer } = vi.hoisted(() => {
  const mockFetchDraftState = vi.fn();
  const mockFetchAvailablePlayers = vi.fn();
  const mockSubmitPick = vi.fn();
  const mockTriggerAutoPick = vi.fn();
  const mockTickTimer = vi.fn();
  const mockResetTimer = vi.fn();
  const mockUseDraftTimer = vi.fn();
  const mockUseDraft = vi.fn().mockReturnValue({
    draftState: null,
    availablePlayers: [],
    isLoading: false,
    error: null,
    myTeam: { id: 'team-1', city: 'New York', name: 'Yankees', ownerId: 'user-1' },
    isMyPick: false,
    currentTeamName: null,
    timeRemaining: 60,
    submitPick: mockSubmitPick,
    triggerAutoPick: mockTriggerAutoPick,
    fetchDraftState: mockFetchDraftState,
    fetchAvailablePlayers: mockFetchAvailablePlayers,
    tickTimer: mockTickTimer,
    resetTimer: mockResetTimer,
  });
  return { mockFetchDraftState, mockFetchAvailablePlayers, mockSubmitPick, mockTriggerAutoPick, mockTickTimer, mockResetTimer, mockUseDraft, mockUseDraftTimer };
});

vi.mock('@hooks/useLeague', () => ({
  useLeague: vi.fn().mockReturnValue({
    league: { id: 'league-1', commissionerId: 'user-1', status: 'draft' },
    teams: [],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@hooks/useDraft', () => ({
  useDraft: mockUseDraft,
}));

vi.mock('@features/draft/hooks/useDraftTimer', () => ({
  useDraftTimer: mockUseDraftTimer,
}));

vi.mock('@components/forms/Input', () => ({
  Input: ({ value, onChange, name, label, placeholder }: Record<string, unknown>) => (
    <input value={value as string} onChange={(e) => (onChange as (v: string) => void)(e.target.value)} name={name as string} aria-label={label as string} placeholder={placeholder as string} />
  ),
}));

vi.mock('@components/forms/Select', () => ({
  Select: ({ value, onChange, name, label }: Record<string, unknown>) => (
    <select value={value as string} onChange={(e) => (onChange as (v: string) => void)(e.target.value)} name={name as string} aria-label={label as string} />
  ),
}));

describe('DraftBoardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDraft.mockReturnValue({
      draftState: null,
      availablePlayers: [],
      isLoading: false,
      error: null,
      myTeam: { id: 'team-1', city: 'New York', name: 'Yankees', ownerId: 'user-1' },
      isMyPick: false,
      currentTeamName: null,
      timeRemaining: 60,
      submitPick: mockSubmitPick,
      triggerAutoPick: mockTriggerAutoPick,
      fetchDraftState: mockFetchDraftState,
      fetchAvailablePlayers: mockFetchAvailablePlayers,
      tickTimer: mockTickTimer,
      resetTimer: mockResetTimer,
    });
  });

  it('renders page heading', () => {
    render(<DraftBoardPage />);
    expect(screen.getByText('Draft Board')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseDraft.mockReturnValue({
      draftState: null,
      availablePlayers: [],
      isLoading: true,
      error: null,
      myTeam: null,
      isMyPick: false,
      currentTeamName: null,
      timeRemaining: 60,
      submitPick: mockSubmitPick,
      fetchDraftState: mockFetchDraftState,
      fetchAvailablePlayers: mockFetchAvailablePlayers,
    });
    render(<DraftBoardPage />);
    expect(screen.getByText('Loading draft board...')).toBeInTheDocument();
  });

  it('shows waiting message when draft has not started', () => {
    render(<DraftBoardPage />);
    expect(screen.getByText('Waiting for Draft')).toBeInTheDocument();
  });

  it('shows draft complete banner', () => {
    mockUseDraft.mockReturnValue({
      draftState: createMockDraftState({ status: 'completed', totalRounds: 21 }),
      availablePlayers: [],
      isLoading: false,
      error: null,
      myTeam: { id: 'team-1', city: 'New York', name: 'Yankees', ownerId: 'user-1' },
      isMyPick: false,
      currentTeamName: null,
      timeRemaining: 0,
      submitPick: mockSubmitPick,
      fetchDraftState: mockFetchDraftState,
      fetchAvailablePlayers: mockFetchAvailablePlayers,
    });
    render(<DraftBoardPage />);
    expect(screen.getByText('Draft Complete')).toBeInTheDocument();
  });

  it('shows your turn message when it is my pick', () => {
    mockUseDraft.mockReturnValue({
      draftState: createMockDraftState({ status: 'in_progress', currentRound: 3, currentPick: 5 }),
      availablePlayers: [createMockAvailablePlayer()],
      isLoading: false,
      error: null,
      myTeam: { id: 'team-1', city: 'New York', name: 'Yankees', ownerId: 'user-1' },
      isMyPick: true,
      currentTeamName: 'New York Yankees',
      timeRemaining: 45,
      submitPick: mockSubmitPick,
      fetchDraftState: mockFetchDraftState,
      fetchAvailablePlayers: mockFetchAvailablePlayers,
    });
    render(<DraftBoardPage />);
    // "On the Clock" appears in both banner and PickTimer; verify at least one
    expect(screen.getAllByText(/On the Clock/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows error banner when error exists', () => {
    mockUseDraft.mockReturnValue({
      draftState: null,
      availablePlayers: [],
      isLoading: false,
      error: 'Failed to load draft',
      myTeam: null,
      isMyPick: false,
      currentTeamName: null,
      timeRemaining: 60,
      submitPick: mockSubmitPick,
      fetchDraftState: mockFetchDraftState,
      fetchAvailablePlayers: mockFetchAvailablePlayers,
      tickTimer: mockTickTimer,
      resetTimer: mockResetTimer,
    });
    render(<DraftBoardPage />);
    expect(screen.getByText('Failed to load draft')).toBeInTheDocument();
  });

  // REQ-DFT-004: Timer integration tests
  it('calls useDraftTimer with isActive=true when it is my pick and draft is in_progress', () => {
    mockUseDraft.mockReturnValue({
      draftState: createMockDraftState({ status: 'in_progress', currentTeamId: 'team-1' }),
      availablePlayers: [createMockAvailablePlayer()],
      isLoading: false,
      error: null,
      myTeam: { id: 'team-1', city: 'New York', name: 'Yankees', ownerId: 'user-1' },
      isMyPick: true,
      currentTeamName: 'New York Yankees',
      timeRemaining: 45,
      submitPick: mockSubmitPick,
      fetchDraftState: mockFetchDraftState,
      fetchAvailablePlayers: mockFetchAvailablePlayers,
      tickTimer: mockTickTimer,
      resetTimer: mockResetTimer,
    });

    render(<DraftBoardPage />);

    expect(mockUseDraftTimer).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
    );
  });

  it('triggers server-side auto-pick when onExpire fires', () => {
    const players = [
      createMockAvailablePlayer({ playerId: 'p1' }),
      createMockAvailablePlayer({ playerId: 'p2' }),
    ];

    mockUseDraft.mockReturnValue({
      draftState: createMockDraftState({ status: 'in_progress', currentTeamId: 'team-1' }),
      availablePlayers: players,
      isLoading: false,
      error: null,
      myTeam: { id: 'team-1', city: 'New York', name: 'Yankees', ownerId: 'user-1' },
      isMyPick: true,
      currentTeamName: 'New York Yankees',
      timeRemaining: 0,
      submitPick: mockSubmitPick,
      triggerAutoPick: mockTriggerAutoPick,
      fetchDraftState: mockFetchDraftState,
      fetchAvailablePlayers: mockFetchAvailablePlayers,
      tickTimer: mockTickTimer,
      resetTimer: mockResetTimer,
    });

    // Capture the onExpire callback
    mockUseDraftTimer.mockImplementation((opts: { onExpire: () => void }) => {
      opts.onExpire();
    });

    render(<DraftBoardPage />);

    expect(mockTriggerAutoPick).toHaveBeenCalledWith('league-1', true);
    expect(mockSubmitPick).not.toHaveBeenCalled();
  });

  it('triggers server-side auto-pick even with empty local player list', () => {
    mockUseDraft.mockReturnValue({
      draftState: createMockDraftState({ status: 'in_progress', currentTeamId: 'team-1' }),
      availablePlayers: [],
      isLoading: false,
      error: null,
      myTeam: { id: 'team-1', city: 'New York', name: 'Yankees', ownerId: 'user-1' },
      isMyPick: true,
      currentTeamName: 'New York Yankees',
      timeRemaining: 0,
      submitPick: mockSubmitPick,
      triggerAutoPick: mockTriggerAutoPick,
      fetchDraftState: mockFetchDraftState,
      fetchAvailablePlayers: mockFetchAvailablePlayers,
      tickTimer: mockTickTimer,
      resetTimer: mockResetTimer,
    });

    mockUseDraftTimer.mockImplementation((opts: { onExpire: () => void }) => {
      opts.onExpire();
    });

    render(<DraftBoardPage />);

    // Server-side auto-pick does not depend on client-side player list
    expect(mockTriggerAutoPick).toHaveBeenCalledWith('league-1', true);
  });
});
