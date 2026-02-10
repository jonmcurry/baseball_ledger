// @vitest-environment jsdom
/**
 * Tests for CommentaryPanel (REQ-UI-010)
 *
 * Displays AI commentary for game plays.
 */

import { render, screen } from '@testing-library/react';
import { CommentaryPanel } from '@features/game-viewer/CommentaryPanel';

vi.mock('@components/feedback/TypewriterText', () => ({
  TypewriterText: ({ text }: { text: string }) => <span data-testid="typewriter">{text}</span>,
}));

describe('CommentaryPanel', () => {
  it('renders nothing when entries are empty', () => {
    const { container } = render(<CommentaryPanel entries={[]} />);
    expect(container.querySelector('[data-testid="commentary-panel"]')).toBeNull();
  });

  it('renders commentary entries', () => {
    render(
      <CommentaryPanel
        entries={[
          { text: 'Ruth crushes one to deep center!', inning: 3 },
          { text: 'A routine groundout to end the inning.', inning: 3 },
        ]}
      />,
    );
    expect(screen.getByText('Ruth crushes one to deep center!')).toBeInTheDocument();
    expect(screen.getByText('A routine groundout to end the inning.')).toBeInTheDocument();
  });

  it('uses TypewriterText for the latest entry', () => {
    render(
      <CommentaryPanel
        entries={[
          { text: 'First play.', inning: 1 },
          { text: 'Latest play commentary.', inning: 2 },
        ]}
      />,
    );
    const typewriter = screen.getByTestId('typewriter');
    expect(typewriter).toHaveTextContent('Latest play commentary.');
  });

  it('renders heading', () => {
    render(
      <CommentaryPanel
        entries={[{ text: 'Some commentary.', inning: 1 }]}
      />,
    );
    expect(screen.getByText('Commentary')).toBeInTheDocument();
  });

  it('shows inning labels', () => {
    render(
      <CommentaryPanel
        entries={[
          { text: 'Top of the first.', inning: 1 },
          { text: 'Second inning action.', inning: 2 },
        ]}
      />,
    );
    expect(screen.getByText(/Inning 1/)).toBeInTheDocument();
    expect(screen.getByText(/Inning 2/)).toBeInTheDocument();
  });
});
