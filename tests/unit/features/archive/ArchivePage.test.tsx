// @vitest-environment jsdom
/**
 * Tests for ArchivePage
 */

import { render, screen } from '@testing-library/react';
import { ArchivePage } from '@features/archive/ArchivePage';

const { mockUseLeague } = vi.hoisted(() => {
  const mockUseLeague = vi.fn();
  return { mockUseLeague };
});

vi.mock('@hooks/useLeague', () => ({
  useLeague: mockUseLeague,
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
    });
    render(<ArchivePage />);
    expect(screen.getByText('Loading archives...')).toBeInTheDocument();
  });
});
