// @vitest-environment jsdom
/**
 * Tests for AddDropForm
 */

import { render, screen } from '@testing-library/react';
import { AddDropForm } from '@features/transactions/AddDropForm';
import { createMockRosterEntry } from '../../../fixtures/mock-roster';

vi.mock('@components/forms/Select', () => ({
  Select: ({ label }: Record<string, unknown>) => (
    <select aria-label={label as string} />
  ),
}));

describe('AddDropForm', () => {
  const mockOnDrop = vi.fn();
  const mockOnAdd = vi.fn();

  it('renders heading', () => {
    render(<AddDropForm roster={[]} onDrop={mockOnDrop} onAdd={mockOnAdd} />);
    expect(screen.getByText('Add/Drop')).toBeInTheDocument();
  });

  it('renders drop section', () => {
    render(<AddDropForm roster={[]} onDrop={mockOnDrop} onAdd={mockOnAdd} />);
    expect(screen.getByText('Drop a Player')).toBeInTheDocument();
  });

  it('renders drop button as disabled when no player selected', () => {
    const roster = [createMockRosterEntry()];
    render(<AddDropForm roster={roster} onDrop={mockOnDrop} onAdd={mockOnAdd} />);
    expect(screen.getByText('Drop')).toBeDisabled();
  });
});
