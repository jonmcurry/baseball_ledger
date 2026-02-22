// @vitest-environment jsdom
/**
 * Tests for ArchivePage (REQ-UI-011, REQ-SCH-009)
 */

import { render, screen } from '@testing-library/react';
import { ArchivePage, getBaseballEra } from '@features/archive/ArchivePage';

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
      detail: null,
      detailLoading: false,
      fetchDetail: vi.fn(),
      clearDetail: vi.fn(),
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
      detail: null,
      detailLoading: false,
      fetchDetail: vi.fn(),
      clearDetail: vi.fn(),
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
      detail: null,
      detailLoading: false,
      fetchDetail: vi.fn(),
      clearDetail: vi.fn(),
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
      detail: null,
      detailLoading: false,
      fetchDetail: vi.fn(),
      clearDetail: vi.fn(),
    });

    render(<ArchivePage />);
    expect(screen.getByText('Failed to load archives')).toBeInTheDocument();
  });

  it('does not set data-era when no detail is shown', () => {
    const { container } = render(<ArchivePage />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute('data-era')).toBeNull();
  });

  it('sets data-era attribute based on season year when detail is shown', () => {
    mockUseArchive.mockReturnValue({
      seasons: [],
      isLoading: false,
      error: null,
      detail: {
        seasonNumber: 1955,
        champion: 'Dodgers',
        playoffResults: null,
        leagueLeaders: null,
      },
      detailLoading: false,
      fetchDetail: vi.fn(),
      clearDetail: vi.fn(),
    });

    const { container } = render(<ArchivePage />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute('data-era')).toBe('golden');
  });

  it('sets data-era to deadball for pre-1920 seasons', () => {
    mockUseArchive.mockReturnValue({
      seasons: [],
      isLoading: false,
      error: null,
      detail: {
        seasonNumber: 1910,
        champion: 'Athletics',
        playoffResults: null,
        leagueLeaders: null,
      },
      detailLoading: false,
      fetchDetail: vi.fn(),
      clearDetail: vi.fn(),
    });

    const { container } = render(<ArchivePage />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute('data-era')).toBe('deadball');
  });
});

describe('getBaseballEra', () => {
  it('returns deadball for years <= 1919', () => {
    expect(getBaseballEra(1919)).toBe('deadball');
    expect(getBaseballEra(1900)).toBe('deadball');
  });

  it('returns liveball for years 1920-1941', () => {
    expect(getBaseballEra(1920)).toBe('liveball');
    expect(getBaseballEra(1941)).toBe('liveball');
  });

  it('returns golden for years 1942-1960', () => {
    expect(getBaseballEra(1942)).toBe('golden');
    expect(getBaseballEra(1960)).toBe('golden');
  });

  it('returns expansion for years 1961-1976', () => {
    expect(getBaseballEra(1961)).toBe('expansion');
    expect(getBaseballEra(1976)).toBe('expansion');
  });

  it('returns freeagent for years 1977-1993', () => {
    expect(getBaseballEra(1977)).toBe('freeagent');
    expect(getBaseballEra(1993)).toBe('freeagent');
  });

  it('returns steroid for years 1994-2005', () => {
    expect(getBaseballEra(1994)).toBe('steroid');
    expect(getBaseballEra(2005)).toBe('steroid');
  });

  it('returns modern for years > 2005', () => {
    expect(getBaseballEra(2006)).toBe('modern');
    expect(getBaseballEra(2024)).toBe('modern');
  });
});
