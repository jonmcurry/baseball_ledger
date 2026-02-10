// @vitest-environment jsdom
/**
 * Tests for ArchivePage (REQ-UI-011, REQ-SCH-009)
 */

import { render, screen } from '@testing-library/react';
import { ArchivePage } from '@features/archive/ArchivePage';

const { mockUseLeague, mockUseArchive } = vi.hoisted(() => ({
  mockUseLeague: vi.fn(),
  mockUseArchive: vi.fn(),
}));

vi.mock('@hooks/useLeague', () => ({
  useLeague: mockUseLeague,
}));

vi.mock('@hooks/useArchive', () => ({
  useArchive: mockUseArchive,
}));

describe('ArchivePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLeague.mockReturnValue({
      league: { id: 'league-1' },
      teams: [],
      standings: [],
      isLoading: false,
      error: null,
      leagueStatus: 'regular_season',
    });
    mockUseArchive.mockReturnValue({
      seasons: [],
      isLoading: false,
      error: null,
    });
  });

  it('renders page heading', () => {
    render(<ArchivePage />);
    expect(screen.getByText('Archive')).toBeInTheDocument();
  });

  it('shows archived seasons heading', () => {
    render(<ArchivePage />);
    expect(screen.getByText('Archived Seasons')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseLeague.mockReturnValue({
      league: null,
      teams: [],
      standings: [],
      isLoading: true,
      error: null,
      leagueStatus: null,
    });
    render(<ArchivePage />);
    expect(screen.getByText('Loading archives...')).toBeInTheDocument();
  });

  it('shows loading when archive is loading', () => {
    mockUseArchive.mockReturnValue({
      seasons: [],
      isLoading: true,
      error: null,
    });
    render(<ArchivePage />);
    expect(screen.getByText('Loading archives...')).toBeInTheDocument();
  });

  it('displays archived seasons from API', () => {
    mockUseArchive.mockReturnValue({
      seasons: [
        { id: 'arc-1', seasonNumber: 2024, champion: 'Yankees', createdAt: '2024-01-01' },
      ],
      isLoading: false,
      error: null,
    });

    render(<ArchivePage />);
    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByText(/Yankees/)).toBeInTheDocument();
  });

  it('shows "No archived seasons" when list is empty', () => {
    render(<ArchivePage />);
    expect(screen.getByText('No archived seasons')).toBeInTheDocument();
  });

  it('shows StampAnimation when season is completed', () => {
    mockUseLeague.mockReturnValue({
      league: { id: 'league-1' },
      teams: [],
      standings: [],
      isLoading: false,
      error: null,
      leagueStatus: 'completed',
    });

    render(<ArchivePage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('SEASON COMPLETED')).toBeInTheDocument();
  });

  it('does not show StampAnimation during regular season', () => {
    render(<ArchivePage />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('displays archive error', () => {
    mockUseArchive.mockReturnValue({
      seasons: [],
      isLoading: false,
      error: 'Failed to load archives',
    });

    render(<ArchivePage />);
    expect(screen.getByText('Failed to load archives')).toBeInTheDocument();
  });
});
