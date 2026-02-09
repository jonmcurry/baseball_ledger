// @vitest-environment jsdom
/**
 * Tests for TransactionsPage
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionsPage } from '@features/transactions/TransactionsPage';

const { mockUseTeam } = vi.hoisted(() => {
  const mockUseTeam = vi.fn();
  return { mockUseTeam };
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

vi.mock('@components/forms/Select', () => ({
  Select: ({ label }: Record<string, unknown>) => (
    <select aria-label={label as string} />
  ),
}));

describe('TransactionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
