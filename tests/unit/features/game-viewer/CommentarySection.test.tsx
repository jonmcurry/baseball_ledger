// @vitest-environment jsdom
/**
 * Tests for CommentarySection component
 *
 * REQ-AI-006: Wraps CommentaryPanel with AI enhance button.
 * REQ-AI-007: Opt-in per play (no bulk AI calls).
 */

const { mockUseCommentary } = vi.hoisted(() => ({
  mockUseCommentary: vi.fn(),
}));

vi.mock('@hooks/useCommentary', () => ({
  useCommentary: mockUseCommentary,
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { CommentarySection } from '@features/game-viewer/CommentarySection';
import type { PlayByPlayEntry } from '@lib/types/game';
import { OutcomeCategory } from '@lib/types/game';

function createPlay(overrides?: Partial<PlayByPlayEntry>): PlayByPlayEntry {
  return {
    inning: 1,
    halfInning: 'top',
    outs: 0,
    batterId: 'batter-1',
    pitcherId: 'pitcher-1',
    cardPosition: 7,
    cardValue: 8,
    outcomeTableRow: 15,
    outcome: OutcomeCategory.SINGLE_CLEAN,
    description: 'Smith: SINGLE_CLEAN',
    basesAfter: { first: 'batter-1', second: null, third: null },
    scoreAfter: { home: 0, away: 0 },
    ...overrides,
  };
}

const mockPlayerNames: Record<string, string> = {
  'batter-1': 'John Smith',
  'pitcher-1': 'Bob Johnson',
};

describe('CommentarySection', () => {
  const mockEnhancePlay = vi.fn();

  beforeEach(() => {
    mockEnhancePlay.mockReset();
    mockUseCommentary.mockReturnValue({
      entries: [
        { text: 'Template commentary for play 1', source: 'template', inning: 1 },
        { text: 'Template commentary for play 2', source: 'template', inning: 3 },
      ],
      enhancePlay: mockEnhancePlay,
    });
  });

  it('renders CommentaryPanel with entries from useCommentary', () => {
    const plays = [createPlay(), createPlay({ inning: 3 })];

    render(
      <CommentarySection
        plays={plays}
        playerNames={mockPlayerNames}
        style="newspaper"
      />,
    );

    expect(screen.getByTestId('commentary-panel')).toBeInTheDocument();
    // Previous entries render as plain text (latest uses TypewriterText)
    expect(screen.getByText(/Template commentary for play 1/)).toBeInTheDocument();
  });

  it('renders nothing when no entries', () => {
    mockUseCommentary.mockReturnValue({
      entries: [],
      enhancePlay: mockEnhancePlay,
    });

    const { container } = render(
      <CommentarySection plays={[]} playerNames={mockPlayerNames} style="newspaper" />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders Enhance with AI button', () => {
    const plays = [createPlay()];

    render(
      <CommentarySection
        plays={plays}
        playerNames={mockPlayerNames}
        style="newspaper"
      />,
    );

    expect(screen.getByRole('button', { name: /enhance with ai/i })).toBeInTheDocument();
  });

  it('calls enhancePlay with last entry index when button clicked', () => {
    const plays = [createPlay(), createPlay({ inning: 3 })];

    render(
      <CommentarySection
        plays={plays}
        playerNames={mockPlayerNames}
        style="newspaper"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /enhance with ai/i }));
    expect(mockEnhancePlay).toHaveBeenCalledWith(1);
  });

  it('hides enhance button when latest entry is already from claude', () => {
    mockUseCommentary.mockReturnValue({
      entries: [
        { text: 'AI commentary', source: 'claude', inning: 1 },
      ],
      enhancePlay: mockEnhancePlay,
    });

    const plays = [createPlay()];

    render(
      <CommentarySection
        plays={plays}
        playerNames={mockPlayerNames}
        style="newspaper"
      />,
    );

    expect(screen.queryByRole('button', { name: /enhance with ai/i })).not.toBeInTheDocument();
  });
});
