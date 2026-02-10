// @vitest-environment jsdom
/**
 * Tests for TradeForm
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TradeForm } from '@features/transactions/TradeForm';

vi.mock('@components/forms/Select', () => ({
  Select: ({ label, onChange, options, value, placeholder }: Record<string, unknown>) => (
    <select
      aria-label={label as string}
      value={value as string}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
        (onChange as (v: string) => void)(e.target.value)
      }
    >
      {placeholder && <option value="">{placeholder as string}</option>}
      {(options as Array<{ value: string; label: string }>).map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
}));

describe('TradeForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnTargetChange = vi.fn();
  const teams = [
    { id: 'team-2', name: 'Boston Red Sox' },
    { id: 'team-3', name: 'Chicago Cubs' },
  ];
  const myRoster = [
    { id: 'r-1', name: 'Babe Ruth' },
    { id: 'r-2', name: 'Lou Gehrig' },
  ];
  const targetRoster = [
    { id: 'r-3', name: 'Ted Williams' },
    { id: 'r-4', name: 'Ernie Banks' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders heading', () => {
    render(
      <TradeForm
        teams={teams}
        myRoster={myRoster}
        targetRoster={[]}
        onSubmit={mockOnSubmit}
      />,
    );
    expect(screen.getByText('Propose Trade')).toBeInTheDocument();
  });

  it('renders submit button disabled by default', () => {
    render(
      <TradeForm
        teams={teams}
        myRoster={myRoster}
        targetRoster={[]}
        onSubmit={mockOnSubmit}
      />,
    );
    expect(screen.getByText('Submit Trade')).toBeDisabled();
  });

  it('renders team select', () => {
    render(
      <TradeForm
        teams={teams}
        myRoster={myRoster}
        targetRoster={[]}
        onSubmit={mockOnSubmit}
      />,
    );
    expect(screen.getByLabelText('Trade with')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Player selection tests (REQ-RST-005)
  // ---------------------------------------------------------------------------

  it('renders my roster player checkboxes', () => {
    render(
      <TradeForm
        teams={teams}
        myRoster={myRoster}
        targetRoster={[]}
        onSubmit={mockOnSubmit}
      />,
    );
    expect(screen.getByLabelText('Babe Ruth')).toBeInTheDocument();
    expect(screen.getByLabelText('Lou Gehrig')).toBeInTheDocument();
  });

  it('shows target roster when targetRoster provided', () => {
    render(
      <TradeForm
        teams={teams}
        myRoster={myRoster}
        targetRoster={targetRoster}
        onSubmit={mockOnSubmit}
      />,
    );
    expect(screen.getByLabelText('Ted Williams')).toBeInTheDocument();
    expect(screen.getByLabelText('Ernie Banks')).toBeInTheDocument();
  });

  it('disables submit until players selected on both sides and team chosen', async () => {
    const user = userEvent.setup();
    render(
      <TradeForm
        teams={teams}
        myRoster={myRoster}
        targetRoster={targetRoster}
        onSubmit={mockOnSubmit}
      />,
    );

    const submitBtn = screen.getByText('Submit Trade');
    expect(submitBtn).toBeDisabled();

    // Select a player from my side only
    await user.click(screen.getByLabelText('Babe Ruth'));
    expect(submitBtn).toBeDisabled();

    // Select target team
    await user.selectOptions(screen.getByLabelText('Trade with'), 'team-2');

    // Select a player from their side
    await user.click(screen.getByLabelText('Ted Williams'));
    expect(submitBtn).toBeEnabled();
  });

  it('calls onSubmit with correct payload', async () => {
    const user = userEvent.setup();
    render(
      <TradeForm
        teams={teams}
        myRoster={myRoster}
        targetRoster={targetRoster}
        onTargetChange={mockOnTargetChange}
        onSubmit={mockOnSubmit}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Trade with'), 'team-2');
    expect(mockOnTargetChange).toHaveBeenCalledWith('team-2');

    await user.click(screen.getByLabelText('Babe Ruth'));
    await user.click(screen.getByLabelText('Ted Williams'));
    await user.click(screen.getByText('Submit Trade'));

    expect(mockOnSubmit).toHaveBeenCalledWith({
      targetTeamId: 'team-2',
      playersFromMe: ['r-1'],
      playersFromThem: ['r-3'],
    });
  });
});
