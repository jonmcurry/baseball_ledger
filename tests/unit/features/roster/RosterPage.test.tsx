// @vitest-environment jsdom
/**
 * Tests for RosterPage
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RosterPage } from '@features/roster/RosterPage';
import { createMockRoster } from '../../../fixtures/mock-roster';

const { mockFetchRoster, mockSaveLineup, mockUpdateRosterSlot, mockUseTeam } = vi.hoisted(() => {
  const mockFetchRoster = vi.fn();
  const mockSaveLineup = vi.fn().mockResolvedValue(undefined);
  const mockUpdateRosterSlot = vi.fn();
  const mockUseTeam = vi.fn();
  return { mockFetchRoster, mockSaveLineup, mockUpdateRosterSlot, mockUseTeam };
});

vi.mock('@hooks/useLeague', () => ({
  useLeague: vi.fn().mockReturnValue({
    league: { id: 'league-1', commissionerId: 'user-1', status: 'active' },
    teams: [],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@hooks/useTeam', () => ({
  useTeam: mockUseTeam,
}));

vi.mock('@stores/rosterStore', () => ({
  useRosterStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      fetchRoster: mockFetchRoster,
      saveLineup: mockSaveLineup,
      updateRosterSlot: mockUpdateRosterSlot,
    }),
  ),
}));

function setupRosterView() {
  const roster = createMockRoster();
  const starters = roster.filter((r) => r.lineupOrder !== null);
  const bench = roster.filter((r) => r.lineupOrder === null);
  mockUseTeam.mockReturnValue({
    myTeam: { id: 'team-1', city: 'New York', name: 'Yankees', ownerId: 'user-1' },
    roster,
    starters,
    bench,
    isRosterLoading: false,
    rosterError: null,
  });
  return { roster, starters, bench };
}

describe('RosterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeam.mockReturnValue({
      myTeam: { id: 'team-1', city: 'New York', name: 'Yankees', ownerId: 'user-1' },
      roster: [],
      starters: [],
      bench: [],
      isRosterLoading: false,
      rosterError: null,
    });
  });

  it('renders page heading', () => {
    render(<RosterPage />);
    expect(screen.getByText('Roster')).toBeInTheDocument();
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
    render(<RosterPage />);
    expect(screen.getByText('Loading roster...')).toBeInTheDocument();
  });

  it('shows no roster message when roster is empty', () => {
    render(<RosterPage />);
    expect(screen.getByText('No Roster')).toBeInTheDocument();
  });

  it('renders lineup diamond when roster has players', () => {
    setupRosterView();
    render(<RosterPage />);
    expect(screen.getByText('Lineup')).toBeInTheDocument();
  });

  it('shows save lineup button', () => {
    render(<RosterPage />);
    expect(screen.getByText('Save Lineup')).toBeInTheDocument();
  });

  it('shows error banner when error exists', () => {
    mockUseTeam.mockReturnValue({
      myTeam: { id: 'team-1', city: 'New York', name: 'Yankees', ownerId: 'user-1' },
      roster: [],
      starters: [],
      bench: [],
      isRosterLoading: false,
      rosterError: 'Failed to load roster',
    });
    render(<RosterPage />);
    expect(screen.getByText('Failed to load roster')).toBeInTheDocument();
  });

  describe('bench-to-lineup interactions', () => {
    it('clicking "Add to Lineup" calls updateRosterSlot for bench player', async () => {
      const user = userEvent.setup();
      const { bench } = setupRosterView();
      render(<RosterPage />);

      // bench has Tony Gwynn (r-10, primaryPosition: RF)
      const addBtn = screen.getByRole('button', { name: 'Add to Lineup' });
      await user.click(addBtn);

      // Should promote bench player to starter at their primary position (RF)
      // Current RF starter (r-6, Larry Walker) should be sent to bench
      expect(mockUpdateRosterSlot).toHaveBeenCalledWith(
        'r-6', 'bench', null, null,
      );
      expect(mockUpdateRosterSlot).toHaveBeenCalledWith(
        'r-10', 'starter', 6, 'RF',
      );
    });

    it('clicking position then "Add to Lineup" uses selected position', async () => {
      const user = userEvent.setup();
      setupRosterView();
      render(<RosterPage />);

      // Click the 3B position on the diamond
      const posButton = screen.getByRole('button', { name: /3B:/ });
      await user.click(posButton);

      // Now click Add to Lineup for Tony Gwynn
      const addBtn = screen.getByRole('button', { name: 'Add to Lineup' });
      await user.click(addBtn);

      // Should move current 3B (r-5, Chipper Jones) to bench
      expect(mockUpdateRosterSlot).toHaveBeenCalledWith(
        'r-5', 'bench', null, null,
      );
      // Should promote Tony Gwynn to 3B with Chipper's lineup order (5)
      expect(mockUpdateRosterSlot).toHaveBeenCalledWith(
        'r-10', 'starter', 5, '3B',
      );
    });

    it('clears position selection after swap', async () => {
      const user = userEvent.setup();
      setupRosterView();
      render(<RosterPage />);

      // Click a position, then Add to Lineup
      const posButton = screen.getByRole('button', { name: /3B:/ });
      await user.click(posButton);
      const addBtn = screen.getByRole('button', { name: 'Add to Lineup' });
      await user.click(addBtn);

      // The selection indicator should be gone
      expect(screen.queryByText('Selected: 3B')).not.toBeInTheDocument();
    });

    it('clicking same position twice deselects it', async () => {
      const user = userEvent.setup();
      setupRosterView();
      render(<RosterPage />);

      const posButton = screen.getByRole('button', { name: /CF:/ });
      await user.click(posButton);
      expect(screen.getByText('Selected: CF')).toBeInTheDocument();

      await user.click(posButton);
      expect(screen.queryByText('Selected: CF')).not.toBeInTheDocument();
    });

    it('shows selected position indicator', async () => {
      const user = userEvent.setup();
      setupRosterView();
      render(<RosterPage />);

      const posButton = screen.getByRole('button', { name: /SS:/ });
      await user.click(posButton);

      expect(screen.getByText('Selected: SS')).toBeInTheDocument();
    });
  });
});
