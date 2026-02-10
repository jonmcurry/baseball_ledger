// @vitest-environment jsdom
/**
 * Tests for DraftReasoningPanel component
 *
 * REQ-AI-006: Draft reasoning display with template-first + AI opt-in.
 */

const { mockUseDraftReasoning } = vi.hoisted(() => ({
  mockUseDraftReasoning: vi.fn(),
}));

vi.mock('@hooks/useDraftReasoning', () => ({
  useDraftReasoning: mockUseDraftReasoning,
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { DraftReasoningPanel } from '@features/draft/DraftReasoningPanel';
import type { DraftReasoningRequest } from '@lib/types/ai';

const mockRequest: DraftReasoningRequest = {
  round: 1,
  managerStyle: 'balanced',
  managerName: 'Joe Manager',
  teamName: 'New York Yankees',
  pickedPlayerName: 'Star Player',
  pickedPlayerPosition: 'SS',
  pickedPlayerValue: 85,
  alternativePlayers: [],
  teamNeeds: ['SS'],
};

describe('DraftReasoningPanel', () => {
  const mockFetchAiReasoning = vi.fn();

  beforeEach(() => {
    mockFetchAiReasoning.mockReset();
    mockUseDraftReasoning.mockReturnValue({
      reasoning: 'Star Player was selected for the shortstop position.',
      source: 'template',
      fetchAiReasoning: mockFetchAiReasoning,
    });
  });

  it('renders reasoning text', () => {
    render(<DraftReasoningPanel request={mockRequest} />);

    expect(screen.getByText(/Star Player was selected/)).toBeInTheDocument();
  });

  it('renders source badge', () => {
    render(<DraftReasoningPanel request={mockRequest} />);

    expect(screen.getByText(/template/i)).toBeInTheDocument();
  });

  it('renders AI reasoning button for template source', () => {
    render(<DraftReasoningPanel request={mockRequest} />);

    expect(screen.getByRole('button', { name: /ai reasoning/i })).toBeInTheDocument();
  });

  it('calls fetchAiReasoning when button clicked', () => {
    render(<DraftReasoningPanel request={mockRequest} />);

    fireEvent.click(screen.getByRole('button', { name: /ai reasoning/i }));
    expect(mockFetchAiReasoning).toHaveBeenCalledTimes(1);
  });
});
