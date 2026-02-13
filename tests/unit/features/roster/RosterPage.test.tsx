// @vitest-environment jsdom
/**
 * Tests for RosterPage
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RosterPage } from '@features/roster/RosterPage';
import { createMockRoster, createMockRosterEntry } from '../../../fixtures/mock-roster';

const { mockFetchRoster, mockSaveLineup, mockUpdateRosterSlot, mockSwapBattingOrder, mockChangePitcherRole, mockUseTeam } = vi.hoisted(() => {
  const mockFetchRoster = vi.fn();
  const mockSaveLineup = vi.fn().mockResolvedValue(undefined);
  const mockUpdateRosterSlot = vi.fn();
  const mockSwapBattingOrder = vi.fn();
  const mockChangePitcherRole = vi.fn();
  const mockUseTeam = vi.fn();
  return { mockFetchRoster, mockSaveLineup, mockUpdateRosterSlot, mockSwapBattingOrder, mockChangePitcherRole, mockUseTeam };
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
      swapBattingOrder: mockSwapBattingOrder,
      changePitcherRole: mockChangePitcherRole,
    }),
  ),
}));

function setupRosterView() {
  const roster = createMockRoster();
  const starters = roster
    .filter((r) => r.rosterSlot === 'starter' && r.lineupOrder !== null)
    .sort((a, b) => a.lineupOrder! - b.lineupOrder!);
  const bench = roster.filter((r) => r.rosterSlot === 'bench');
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

/** Setup with a full 9-starter lineup to test displacement logic */
function setupFullRosterView() {
  const roster = createMockRoster();
  // Add a DH starter so lineup has all 9 positions filled
  const dhEntry = createMockRosterEntry({
    id: 'r-11',
    playerId: 'p-11',
    lineupOrder: 9,
    lineupPosition: 'DH',
    rosterSlot: 'starter',
  });
  dhEntry.playerCard = {
    ...dhEntry.playerCard,
    playerId: 'p-11',
    nameFirst: 'Edgar',
    nameLast: 'Martinez',
    primaryPosition: 'DH',
  };
  roster.push(dhEntry);
  const starters = roster
    .filter((r) => r.rosterSlot === 'starter' && r.lineupOrder !== null)
    .sort((a, b) => a.lineupOrder! - b.lineupOrder!);
  const bench = roster.filter((r) => r.rosterSlot === 'bench');
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

  it('renders field diamond when roster has players', () => {
    setupRosterView();
    render(<RosterPage />);
    expect(screen.getByText('Field')).toBeInTheDocument();
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
    it('clicking "Add to Lineup" promotes bench player as next starter', async () => {
      const user = userEvent.setup();
      setupRosterView();
      render(<RosterPage />);

      // bench has Tony Gwynn (r-10, primaryPosition: RF)
      // 8 starters means lineup not full, adds as 9th
      const addBtn = screen.getByRole('button', { name: 'Add to Lineup' });
      await user.click(addBtn);

      expect(mockUpdateRosterSlot).toHaveBeenCalledWith(
        'r-10', 'starter', 9, 'RF',
      );
    });

    it('clicking "Add to Lineup" displaces current starter when lineup is full', async () => {
      const user = userEvent.setup();
      setupFullRosterView();
      render(<RosterPage />);

      // With 9 starters (full lineup), Gwynn (RF) should displace Larry Walker (r-6, RF)
      const addBtn = screen.getByRole('button', { name: 'Add to Lineup' });
      await user.click(addBtn);

      expect(mockUpdateRosterSlot).toHaveBeenCalledWith(
        'r-6', 'bench', null, null,
      );
      expect(mockUpdateRosterSlot).toHaveBeenCalledWith(
        'r-10', 'starter', 6, 'RF',
      );
    });

    it('clicking position then bench player assigns selected position', async () => {
      const user = userEvent.setup();
      setupRosterView();
      render(<RosterPage />);

      // Click the DH position on the diamond (empty slot Gwynn can fill)
      const posButton = screen.getByRole('button', { name: /DH/ });
      await user.click(posButton);

      // Button text changes to "Add DH" when DH is selected
      const addBtn = screen.getByRole('button', { name: 'Add DH' });
      await user.click(addBtn);

      expect(mockUpdateRosterSlot).toHaveBeenCalledWith(
        'r-10', 'starter', 9, 'DH',
      );
    });

    it('clears position selection after assignment', async () => {
      const user = userEvent.setup();
      setupRosterView();
      render(<RosterPage />);

      const posButton = screen.getByRole('button', { name: /DH/ });
      await user.click(posButton);
      const addBtn = screen.getByRole('button', { name: 'Add DH' });
      await user.click(addBtn);

      expect(screen.queryByText(/Assigning/)).not.toBeInTheDocument();
    });

    it('clicking same position twice deselects it', async () => {
      const user = userEvent.setup();
      setupRosterView();
      render(<RosterPage />);

      const posButton = screen.getByRole('button', { name: /CF/ });
      await user.click(posButton);
      expect(screen.getByText(/Assigning: CF/)).toBeInTheDocument();

      await user.click(posButton);
      expect(screen.queryByText(/Assigning: CF/)).not.toBeInTheDocument();
    });

    it('shows selected position indicator', async () => {
      const user = userEvent.setup();
      setupRosterView();
      render(<RosterPage />);

      const posButton = screen.getByRole('button', { name: /SS/ });
      await user.click(posButton);

      expect(screen.getByText(/Assigning: SS/)).toBeInTheDocument();
    });
  });
});
