// @vitest-environment jsdom
/**
 * Tests for DraftTicker
 */

import { render, screen } from '@testing-library/react';
import { DraftTicker } from '@features/draft/DraftTicker';
import { createMockDraftPick } from '../../../fixtures/mock-draft';

describe('DraftTicker', () => {
  it('renders heading', () => {
    render(<DraftTicker picks={[]} currentPick={0} />);
    expect(screen.getByText('Draft Ticker')).toBeInTheDocument();
  });

  it('shows no picks message when empty', () => {
    render(<DraftTicker picks={[]} currentPick={0} />);
    expect(screen.getByText('No picks yet')).toBeInTheDocument();
  });

  it('renders pick entries with round and pick number', () => {
    const picks = [
      createMockDraftPick({ round: 1, pick: 1, playerName: 'Babe Ruth', position: 'RF' }),
      createMockDraftPick({ round: 1, pick: 2, playerName: 'Lou Gehrig', position: '1B' }),
    ];
    render(<DraftTicker picks={picks} currentPick={2} />);
    expect(screen.getByText('R1.1')).toBeInTheDocument();
    expect(screen.getByText('Babe Ruth')).toBeInTheDocument();
    expect(screen.getByText('Lou Gehrig')).toBeInTheDocument();
  });
});
