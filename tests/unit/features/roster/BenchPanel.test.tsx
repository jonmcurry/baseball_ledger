// @vitest-environment jsdom
/**
 * Tests for BenchPanel
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BenchPanel } from '@features/roster/BenchPanel';
import { createMockRosterEntry } from '../../../fixtures/mock-roster';

describe('BenchPanel', () => {
  const mockOnSelect = vi.fn();

  it('renders heading', () => {
    render(<BenchPanel bench={[]} onPlayerSelect={mockOnSelect} />);
    expect(screen.getByText('Bench')).toBeInTheDocument();
  });

  it('shows no players message when bench is empty', () => {
    render(<BenchPanel bench={[]} onPlayerSelect={mockOnSelect} />);
    expect(screen.getByText('No players on bench')).toBeInTheDocument();
  });

  it('calls onPlayerSelect when add to lineup button is clicked', async () => {
    const user = userEvent.setup();
    const benchPlayer = createMockRosterEntry({
      id: 'r-10',
      lineupOrder: null,
      lineupPosition: null,
      rosterSlot: 'bench',
    });
    render(<BenchPanel bench={[benchPlayer]} onPlayerSelect={mockOnSelect} />);
    await user.click(screen.getByText('Add to Lineup'));
    expect(mockOnSelect).toHaveBeenCalledWith(benchPlayer);
  });
});
