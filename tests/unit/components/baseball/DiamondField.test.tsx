// @vitest-environment jsdom
/**
 * Tests for DiamondField component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiamondField } from '@components/baseball/DiamondField';

const POSITIONS = [
  { position: 'C', playerName: 'Piazza' },
  { position: '1B', playerName: 'Thomas' },
  { position: '2B', playerName: 'Alomar' },
  { position: 'SS', playerName: 'Ripken' },
  { position: '3B', playerName: 'Ventura' },
  { position: 'LF', playerName: 'Bonds' },
  { position: 'CF', playerName: 'Griffey' },
  { position: 'RF', playerName: 'Gwynn' },
  { position: 'DH', playerName: 'Martinez' },
];

describe('DiamondField', () => {
  it('uses group role with lineup aria-label (REQ-COMP-012)', () => {
    render(<DiamondField positions={POSITIONS} />);
    expect(screen.getByRole('group', { name: 'Baseball diamond lineup' })).toBeInTheDocument();
  });

  it('displays player names at positions', () => {
    render(<DiamondField positions={POSITIONS} />);
    expect(screen.getByText('Griffey')).toBeInTheDocument();
    expect(screen.getByText('Ripken')).toBeInTheDocument();
  });

  it('shows position labels', () => {
    render(<DiamondField positions={POSITIONS} />);
    expect(screen.getByText('CF')).toBeInTheDocument();
    expect(screen.getByText('SS')).toBeInTheDocument();
  });

  it('calls onPositionClick in editable mode', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<DiamondField positions={POSITIONS} isEditable onPositionClick={handleClick} />);

    const ssButton = screen.getByRole('button', { name: /SS/ });
    await user.click(ssButton);
    expect(handleClick).toHaveBeenCalledWith('SS');
  });

  it('renders without base runners when not provided', () => {
    const { container } = render(<DiamondField positions={POSITIONS} />);
    // No base runner rects should be rendered (beyond home plate)
    const rects = container.querySelectorAll('rect');
    // Only home plate rect
    expect(rects.length).toBe(1);
  });

  it('activates position with Enter key in editable mode (REQ-COMP-012)', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<DiamondField positions={POSITIONS} isEditable onPositionClick={handleClick} />);

    const cfButton = screen.getByRole('button', { name: /CF/ });
    cfButton.focus();
    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledWith('CF');
  });

  it('navigates to next position with ArrowRight key (REQ-COMP-012)', async () => {
    const user = userEvent.setup();
    render(<DiamondField positions={POSITIONS} isEditable onPositionClick={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    // Focus the first button (C)
    buttons[0].focus();
    expect(document.activeElement).toBe(buttons[0]);

    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(buttons[1]);
  });

  it('navigates to previous position with ArrowLeft key (REQ-COMP-012)', async () => {
    const user = userEvent.setup();
    render(<DiamondField positions={POSITIONS} isEditable onPositionClick={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    // Focus the second button (1B)
    buttons[1].focus();
    expect(document.activeElement).toBe(buttons[1]);

    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('wraps from last to first position with ArrowRight (REQ-COMP-012)', async () => {
    const user = userEvent.setup();
    render(<DiamondField positions={POSITIONS} isEditable onPositionClick={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    // Focus the last button (DH)
    buttons[buttons.length - 1].focus();
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);

    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('wraps from first to last position with ArrowLeft (REQ-COMP-012)', async () => {
    const user = userEvent.setup();
    render(<DiamondField positions={POSITIONS} isEditable onPositionClick={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    buttons[0].focus();

    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  });
});
