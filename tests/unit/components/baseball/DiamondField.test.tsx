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
  it('renders SVG diamond with aria-label', () => {
    render(<DiamondField positions={POSITIONS} />);
    expect(screen.getByRole('img', { name: 'Baseball diamond' })).toBeInTheDocument();
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
});
