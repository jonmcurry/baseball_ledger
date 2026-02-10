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

const { mockFetchDraftState, mockFetchAvailablePlayers, mockSubmitPick, mockUseDraft } = vi.hoisted(() => {
  const mockFetchDraftState = vi.fn();
  const mockFetchAvailablePlayers = vi.fn();
  const mockSubmitPick = vi.fn();
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
    fetchDraftState: mockFetchDraftState,
    fetchAvailablePlayers: mockFetchAvailablePlayers,
  });
  return { mockFetchDraftState, mockFetchAvailablePlayers, mockSubmitPick, mockUseDraft };
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
      fetchDraftState: mockFetchDraftState,
      fetchAvailablePlayers: mockFetchAvailablePlayers,
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
    expect(screen.getByText(/Your turn to pick!/)).toBeInTheDocument();
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
    });
    render(<DraftBoardPage />);
    expect(screen.getByText('Failed to load draft')).toBeInTheDocument();
  });
});
