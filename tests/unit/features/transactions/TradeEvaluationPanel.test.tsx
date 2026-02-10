// @vitest-environment jsdom
/**
 * Tests for TradeEvaluationPanel component
 *
 * REQ-AI-006: Trade evaluation display with template-first + AI opt-in.
 */

const { mockUseTradeEvaluation } = vi.hoisted(() => ({
  mockUseTradeEvaluation: vi.fn(),
}));

vi.mock('@hooks/useTradeEvaluation', () => ({
  useTradeEvaluation: mockUseTradeEvaluation,
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { TradeEvaluationPanel } from '@features/transactions/TradeEvaluationPanel';
import type { TradeEvaluationRequest } from '@lib/types/ai';

const mockRequest: TradeEvaluationRequest = {
  managerStyle: 'balanced',
  managerName: 'Joe Manager',
  teamName: 'New York Yankees',
  playersOffered: [{ name: 'Player A', position: 'SS', value: 70 }],
  playersRequested: [{ name: 'Player B', position: 'SP', value: 80 }],
  teamNeeds: ['SP'],
};

describe('TradeEvaluationPanel', () => {
  const mockFetchAiEval = vi.fn();

  beforeEach(() => {
    mockFetchAiEval.mockReset();
    mockUseTradeEvaluation.mockReturnValue({
      recommendation: 'accept',
      reasoning: 'The trade fills a rotation need.',
      valueDiff: 10,
      source: 'template',
      fetchAiEval: mockFetchAiEval,
    });
  });

  it('renders recommendation badge and reasoning', () => {
    render(<TradeEvaluationPanel request={mockRequest} />);

    expect(screen.getByText(/accept/i)).toBeInTheDocument();
    expect(screen.getByText(/fills a rotation need/)).toBeInTheDocument();
  });

  it('renders value difference', () => {
    render(<TradeEvaluationPanel request={mockRequest} />);

    expect(screen.getByText(/\+10/)).toBeInTheDocument();
  });

  it('renders AI evaluation button for template source', () => {
    render(<TradeEvaluationPanel request={mockRequest} />);

    expect(screen.getByRole('button', { name: /ai evaluation/i })).toBeInTheDocument();
  });

  it('calls fetchAiEval when button clicked', () => {
    render(<TradeEvaluationPanel request={mockRequest} />);

    fireEvent.click(screen.getByRole('button', { name: /ai evaluation/i }));
    expect(mockFetchAiEval).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when request is null', () => {
    mockUseTradeEvaluation.mockReturnValue({
      recommendation: null,
      reasoning: null,
      valueDiff: 0,
      source: null,
      fetchAiEval: mockFetchAiEval,
    });

    const { container } = render(<TradeEvaluationPanel request={null} />);
    expect(container.firstChild).toBeNull();
  });
});
