// @vitest-environment jsdom
/**
 * Tests for RosterPage
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RosterPage } from '@features/roster/RosterPage';
import { createMockRosterEntry, createMockRoster } from '../../../fixtures/mock-roster';

const { mockFetchRoster, mockSaveLineup, mockUseTeam } = vi.hoisted(() => {
  const mockFetchRoster = vi.fn();
  const mockSaveLineup = vi.fn().mockResolvedValue(undefined);
  const mockUseTeam = vi.fn();
  return { mockFetchRoster, mockSaveLineup, mockUseTeam };
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
    selector({ fetchRoster: mockFetchRoster, saveLineup: mockSaveLineup }),
  ),
}));

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
});
