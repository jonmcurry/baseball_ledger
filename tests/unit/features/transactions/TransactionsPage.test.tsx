// @vitest-environment jsdom
/**
 * Tests for TransactionsPage
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionsPage } from '@features/transactions/TransactionsPage';

const { mockUseTeam, mockAddPlayer, mockDropPlayer, mockFetchHistory, mockFetchAvailable, mockFetchMyRoster } = vi.hoisted(() => {
  const mockUseTeam = vi.fn();
  const mockAddPlayer = vi.fn().mockResolvedValue({ transactionId: 'tx-1' });
  const mockDropPlayer = vi.fn().mockResolvedValue({ transactionId: 'tx-2' });
  const mockFetchHistory = vi.fn().mockResolvedValue([]);
  const mockFetchAvailable = vi.fn().mockResolvedValue([]);
  const mockFetchMyRoster = vi.fn().mockResolvedValue(undefined);
  return { mockUseTeam, mockAddPlayer, mockDropPlayer, mockFetchHistory, mockFetchAvailable, mockFetchMyRoster };
});

vi.mock('@hooks/useLeague', () => ({
  useLeague: vi.fn().mockReturnValue({
    league: { id: 'league-1' },
    teams: [
      { id: 'team-1', city: 'New York', name: 'Yankees', ownerId: 'u-1' },
      { id: 'team-2', city: 'Boston', name: 'Red Sox', ownerId: 'u-2' },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@hooks/useTeam', () => ({
  useTeam: mockUseTeam,
}));

vi.mock('@stores/rosterStore', () => ({
  useRosterStore: vi.fn().mockImplementation((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ fetchRoster: mockFetchMyRoster }),
  ),
}));

vi.mock('@services/transaction-service', () => ({
  addPlayer: mockAddPlayer,
  dropPlayer: mockDropPlayer,
  submitTrade: vi.fn().mockResolvedValue({}),
  fetchTransactionHistory: mockFetchHistory,
}));

vi.mock('@services/draft-service', () => ({
  fetchAvailablePlayers: mockFetchAvailable,
}));

vi.mock('@services/roster-service', () => ({
  fetchRoster: vi.fn().mockResolvedValue([]),
}));

vi.mock('@components/forms/Select', () => ({
  Select: ({ label }: Record<string, unknown>) => (
    <select aria-label={label as string} />
  ),
}));

vi.mock('@components/forms/Input', () => ({
  Input: ({ label, onChange, value, placeholder }: Record<string, unknown>) => (
    <input
      aria-label={label as string}
      value={(value as string) ?? ''}
      placeholder={placeholder as string}
      onChange={(e) => (onChange as (v: string) => void)(e.target.value)}
    />
  ),
}));

describe('TransactionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchHistory.mockResolvedValue([]);
    mockUseTeam.mockReturnValue({
      myTeam: { id: 'team-1', city: 'New York', name: 'Yankees', ownerId: 'u-1' },
      roster: [],
      starters: [],
      bench: [],
      isRosterLoading: false,
      rosterError: null,
    });
  });

  it('renders page heading', () => {
    render(<TransactionsPage />);
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  it('renders tab buttons', () => {
    render(<TransactionsPage />);
    expect(screen.getAllByText('Add/Drop').length).toBeGreaterThan(0);
    expect(screen.getByText('Trade')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('switches tabs on click', async () => {
    const user = userEvent.setup();
    render(<TransactionsPage />);
    await user.click(screen.getByText('History'));
    expect(screen.getByText('Transaction History')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseTeam.mockReturnValue({
      myTeam: null,
      roster: [],
      starters: [],
      bench: [],
      isRosterLoading: true,
      rosterError: null,
    });
    render(<TransactionsPage />);
    expect(screen.getByText('Loading transactions...')).toBeInTheDocument();
  });

  // REQ-RST-005: Free agent add flow

  it('renders Add a Player section on add-drop tab', () => {
    render(<TransactionsPage />);
    expect(screen.getByText('Add a Player')).toBeInTheDocument();
  });

  it('calls fetchAvailablePlayers when search input changes', async () => {
    const poolRow = {
      id: 'row-1',
      league_id: 'league-1',
      player_id: 'ruthba01',
      season_year: 1927,
      player_card: { playerId: 'ruthba01', nameFirst: 'Babe', nameLast: 'Ruth', seasonYear: 1927, primaryPosition: 'RF' },
      is_drafted: false,
      drafted_by_team_id: null,
      created_at: '2026-01-01',
    };
    mockFetchAvailable.mockResolvedValue([poolRow]);

    const user = userEvent.setup();
    render(<TransactionsPage />);

    const searchInput = screen.getByLabelText('Search free agents');
    await user.type(searchInput, 'Ruth');

    // Wait for debounce + API call
    await waitFor(() => {
      expect(mockFetchAvailable).toHaveBeenCalledWith('league-1', expect.objectContaining({ search: 'Ruth' }));
    }, { timeout: 1000 });
  });

  it('calls addPlayer service on add', async () => {
    const poolRow = {
      id: 'row-1',
      league_id: 'league-1',
      player_id: 'ruthba01',
      season_year: 1927,
      player_card: { playerId: 'ruthba01', nameFirst: 'Babe', nameLast: 'Ruth', seasonYear: 1927, primaryPosition: 'RF' },
      is_drafted: false,
      drafted_by_team_id: null,
      created_at: '2026-01-01',
    };
    mockFetchAvailable.mockResolvedValue([poolRow]);

    const user = userEvent.setup();
    render(<TransactionsPage />);

    // Trigger search and wait for results
    const searchInput = screen.getByLabelText('Search free agents');
    await user.type(searchInput, 'Ruth');

    await waitFor(() => {
      expect(screen.getByText(/Babe Ruth/)).toBeInTheDocument();
    }, { timeout: 1000 });

    // Click Add button
    await user.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(mockAddPlayer).toHaveBeenCalledWith('league-1', 'team-1', expect.objectContaining({
        playerId: 'ruthba01',
        playerName: 'Babe Ruth',
      }));
    });
  });

  it('refreshes roster after successful add', async () => {
    const poolRow = {
      id: 'row-1',
      league_id: 'league-1',
      player_id: 'ruthba01',
      season_year: 1927,
      player_card: { playerId: 'ruthba01', nameFirst: 'Babe', nameLast: 'Ruth', seasonYear: 1927, primaryPosition: 'RF' },
      is_drafted: false,
      drafted_by_team_id: null,
      created_at: '2026-01-01',
    };
    mockFetchAvailable.mockResolvedValue([poolRow]);

    const user = userEvent.setup();
    render(<TransactionsPage />);

    const searchInput = screen.getByLabelText('Search free agents');
    await user.type(searchInput, 'Ruth');

    await waitFor(() => {
      expect(screen.getByText(/Babe Ruth/)).toBeInTheDocument();
    }, { timeout: 1000 });

    await user.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(mockFetchMyRoster).toHaveBeenCalledWith('league-1', 'team-1');
    });
  });

  it('shows error when add fails', async () => {
    mockAddPlayer.mockRejectedValueOnce(new Error('Player already on roster'));

    const poolRow = {
      id: 'row-1',
      league_id: 'league-1',
      player_id: 'ruthba01',
      season_year: 1927,
      player_card: { playerId: 'ruthba01', nameFirst: 'Babe', nameLast: 'Ruth', seasonYear: 1927, primaryPosition: 'RF' },
      is_drafted: false,
      drafted_by_team_id: null,
      created_at: '2026-01-01',
    };
    mockFetchAvailable.mockResolvedValue([poolRow]);

    const user = userEvent.setup();
    render(<TransactionsPage />);

    const searchInput = screen.getByLabelText('Search free agents');
    await user.type(searchInput, 'Ruth');

    await waitFor(() => {
      expect(screen.getByText(/Babe Ruth/)).toBeInTheDocument();
    }, { timeout: 1000 });

    await user.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(screen.getByText('Player already on roster')).toBeInTheDocument();
    });
  });
});
