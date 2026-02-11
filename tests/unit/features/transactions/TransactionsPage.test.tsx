// @vitest-environment jsdom
/**
 * Tests for TransactionsPage
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionsPage } from '@features/transactions/TransactionsPage';

const { mockUseTeam, mockAddPlayer, mockDropPlayer, mockSubmitTrade, mockFetchHistory, mockFetchAvailable, mockFetchMyRoster, mockFetchRoster } = vi.hoisted(() => {
  const mockUseTeam = vi.fn();
  const mockAddPlayer = vi.fn().mockResolvedValue({ transactionId: 'tx-1' });
  const mockDropPlayer = vi.fn().mockResolvedValue({ transactionId: 'tx-2' });
  const mockSubmitTrade = vi.fn().mockResolvedValue({});
  const mockFetchHistory = vi.fn().mockResolvedValue([]);
  const mockFetchAvailable = vi.fn().mockResolvedValue([]);
  const mockFetchMyRoster = vi.fn().mockResolvedValue(undefined);
  const mockFetchRoster = vi.fn().mockResolvedValue([]);
  return { mockUseTeam, mockAddPlayer, mockDropPlayer, mockSubmitTrade, mockFetchHistory, mockFetchAvailable, mockFetchMyRoster, mockFetchRoster };
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
  submitTrade: mockSubmitTrade,
  fetchTransactionHistory: mockFetchHistory,
}));

vi.mock('@services/draft-service', () => ({
  fetchAvailablePlayers: mockFetchAvailable,
}));

vi.mock('@services/roster-service', () => ({
  fetchRoster: mockFetchRoster,
}));

vi.mock('@components/forms/Select', () => ({
  Select: ({ label, onChange, options, placeholder, value }: Record<string, unknown>) => (
    <select
      aria-label={label as string}
      value={(value as string) ?? ''}
      onChange={(e) => (onChange as (v: string) => void)?.(e.target.value)}
    >
      {placeholder && <option value="">{placeholder as string}</option>}
      {((options || []) as Array<{ value: string; label: string }>).map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
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

  // REQ-RST-005, REQ-AI-006: CPU trade evaluation

  it('renders trade tab with evaluation panel', async () => {
    const user = userEvent.setup();
    render(<TransactionsPage />);

    await user.click(screen.getByText('Trade'));

    expect(screen.getByText('Propose Trade')).toBeInTheDocument();
    // TradeEvaluationPanel renders when there's no request (null), it renders nothing visible
    // Verify the trade form rendered without errors after refactoring
    expect(screen.getByLabelText('Trade with')).toBeInTheDocument();
  });

  it('shows trade rejection error from CPU evaluation', async () => {
    const rosterEntries = [
      {
        id: 'r-1',
        playerId: 'ruth01',
        playerCard: { nameFirst: 'Babe', nameLast: 'Ruth', eligiblePositions: ['RF'], card: [10] },
        rosterSlot: 'starter',
        lineupOrder: 1,
        lineupPosition: 'RF',
      },
    ];

    const targetEntries = [
      {
        id: 'r-2',
        playerId: 'cobb01',
        playerCard: { nameFirst: 'Ty', nameLast: 'Cobb', eligiblePositions: ['CF'], card: [9] },
        rosterSlot: 'starter',
        lineupOrder: 1,
        lineupPosition: 'CF',
      },
    ];

    mockUseTeam.mockReturnValue({
      myTeam: { id: 'team-1', city: 'New York', name: 'Yankees', ownerId: 'u-1' },
      roster: rosterEntries,
      starters: rosterEntries,
      bench: [],
      isRosterLoading: false,
      rosterError: null,
    });

    mockFetchRoster.mockResolvedValue(targetEntries);
    mockSubmitTrade.mockRejectedValue({
      category: 'CONFLICT',
      code: 'TRADE_REJECTED',
      message: 'Cap Spalding is not interested in this deal.',
      statusCode: 409,
    });

    const user = userEvent.setup();
    render(<TransactionsPage />);

    // Switch to trade tab
    await user.click(screen.getByText('Trade'));

    // Select target team
    const teamSelect = screen.getByLabelText('Trade with');
    await user.selectOptions(teamSelect, 'team-2');

    // Wait for target roster to load
    await waitFor(() => {
      expect(mockFetchRoster).toHaveBeenCalledWith('league-1', 'team-2');
    });

    // Select players from both sides
    await waitFor(() => {
      expect(screen.getByLabelText('Babe Ruth')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Babe Ruth'));

    await waitFor(() => {
      expect(screen.getByLabelText('Ty Cobb')).toBeInTheDocument();
    });
    await user.click(screen.getByLabelText('Ty Cobb'));

    // Submit trade
    await user.click(screen.getByText('Submit Trade'));

    // Verify rejection error is displayed
    await waitFor(() => {
      expect(screen.getByText('Cap Spalding is not interested in this deal.')).toBeInTheDocument();
    });
  });
});
