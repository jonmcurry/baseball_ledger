// @vitest-environment jsdom
/**
 * Tests for ManagerDecisionsPanel component
 *
 * REQ-AI-006: Manager decision explanations with template-first + AI opt-in.
 */

const { mockUseManagerExplanations } = vi.hoisted(() => ({
  mockUseManagerExplanations: vi.fn(),
}));

vi.mock('@hooks/useManagerExplanations', () => ({
  useManagerExplanations: mockUseManagerExplanations,
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { ManagerDecisionsPanel } from '@features/game-viewer/ManagerDecisionsPanel';
import type { DetectedDecision } from '@lib/ai/decision-detector';

const mockDecisions: DetectedDecision[] = [
  { type: 'intentional_walk', playIndex: 10, inning: 7, halfInning: 'top', outs: 1, scoreDiff: -1 },
];

describe('ManagerDecisionsPanel', () => {
  const mockEnhanceDecision = vi.fn();

  beforeEach(() => {
    mockEnhanceDecision.mockReset();
    mockUseManagerExplanations.mockReturnValue({
      explanations: [
        {
          type: 'intentional_walk',
          inning: 7,
          explanation: 'Manager issued the intentional walk.',
          source: 'template',
        },
      ],
      enhanceDecision: mockEnhanceDecision,
    });
  });

  it('renders decision list with explanation', () => {
    render(
      <ManagerDecisionsPanel
        decisions={mockDecisions}
        managerStyle="balanced"
        homeTeamName="New York Yankees"
        awayTeamName="Boston Red Sox"
      />,
    );

    expect(screen.getByText('Intentional Walk')).toBeInTheDocument();
    expect(screen.getByText(/issued the intentional walk/)).toBeInTheDocument();
  });

  it('renders enhance button for template explanations', () => {
    render(
      <ManagerDecisionsPanel
        decisions={mockDecisions}
        managerStyle="balanced"
        homeTeamName="New York Yankees"
        awayTeamName="Boston Red Sox"
      />,
    );

    const buttons = screen.getAllByRole('button', { name: /enhance/i });
    expect(buttons).toHaveLength(1);
  });

  it('calls enhanceDecision when button clicked', () => {
    render(
      <ManagerDecisionsPanel
        decisions={mockDecisions}
        managerStyle="balanced"
        homeTeamName="New York Yankees"
        awayTeamName="Boston Red Sox"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /enhance/i }));
    expect(mockEnhanceDecision).toHaveBeenCalledWith(0);
  });

  it('renders nothing when no decisions', () => {
    mockUseManagerExplanations.mockReturnValue({
      explanations: [],
      enhanceDecision: mockEnhanceDecision,
    });

    const { container } = render(
      <ManagerDecisionsPanel
        decisions={[]}
        managerStyle="balanced"
        homeTeamName="New York Yankees"
        awayTeamName="Boston Red Sox"
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
