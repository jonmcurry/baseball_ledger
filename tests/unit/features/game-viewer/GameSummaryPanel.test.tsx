// @vitest-environment jsdom
/**
 * Tests for GameSummaryPanel component
 *
 * REQ-AI-006: Game summary display with template-first + AI opt-in.
 */

const { mockUseGameSummary } = vi.hoisted(() => ({
  mockUseGameSummary: vi.fn(),
}));

vi.mock('@hooks/useGameSummary', () => ({
  useGameSummary: mockUseGameSummary,
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { GameSummaryPanel } from '@features/game-viewer/GameSummaryPanel';
import type { GameSummaryRequest } from '@lib/types/ai';

const mockRequest: GameSummaryRequest = {
  homeTeamName: 'New York Yankees',
  awayTeamName: 'Boston Red Sox',
  homeScore: 5,
  awayScore: 3,
  innings: 9,
  winningPitcherName: 'Ace Johnson',
  losingPitcherName: 'Bad Luck Pete',
  savePitcherName: null,
  keyPlays: [],
  boxScore: {
    lineScore: { away: [0, 1, 0, 2, 0, 0, 0, 0, 0], home: [1, 0, 3, 0, 0, 0, 1, 0, 0] },
    awayHits: 7,
    homeHits: 10,
    awayErrors: 1,
    homeErrors: 0,
  },
  playerHighlights: [],
};

describe('GameSummaryPanel', () => {
  const mockFetchAiSummary = vi.fn();

  beforeEach(() => {
    mockFetchAiSummary.mockReset();
    mockUseGameSummary.mockReturnValue({
      headline: 'Yankees Top Red Sox 5-3',
      summary: 'The Yankees secured a comfortable victory...',
      source: 'template',
      fetchAiSummary: mockFetchAiSummary,
    });
  });

  it('renders headline and summary', () => {
    render(<GameSummaryPanel request={mockRequest} />);

    expect(screen.getByText('Yankees Top Red Sox 5-3')).toBeInTheDocument();
    expect(screen.getByText(/Yankees secured a comfortable victory/)).toBeInTheDocument();
  });

  it('renders Generate AI Recap button for template source', () => {
    render(<GameSummaryPanel request={mockRequest} />);

    expect(screen.getByRole('button', { name: /generate ai recap/i })).toBeInTheDocument();
  });

  it('calls fetchAiSummary when button is clicked', () => {
    render(<GameSummaryPanel request={mockRequest} />);

    fireEvent.click(screen.getByRole('button', { name: /generate ai recap/i }));
    expect(mockFetchAiSummary).toHaveBeenCalledTimes(1);
  });

  it('hides button when source is claude', () => {
    mockUseGameSummary.mockReturnValue({
      headline: 'AI Headline',
      summary: 'AI Summary text',
      source: 'claude',
      fetchAiSummary: mockFetchAiSummary,
    });

    render(<GameSummaryPanel request={mockRequest} />);

    expect(screen.queryByRole('button', { name: /generate ai recap/i })).not.toBeInTheDocument();
  });

  it('renders nothing when headline is null', () => {
    mockUseGameSummary.mockReturnValue({
      headline: null,
      summary: null,
      source: null,
      fetchAiSummary: mockFetchAiSummary,
    });

    const { container } = render(<GameSummaryPanel request={null} />);
    expect(container.firstChild).toBeNull();
  });
});
