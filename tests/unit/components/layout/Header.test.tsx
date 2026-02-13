// @vitest-environment jsdom
/**
 * Tests for Header component
 *
 * Rich banner header with app title, league name, navigation, and user info.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '@components/layout/Header';

describe('Header', () => {
  const defaultProps = {
    leagueName: 'Test League',
    leagueStatus: 'regular_season' as const,
    userName: 'Player 1',
    isCommissioner: false,
    onNavigate: vi.fn(),
    onLogout: vi.fn(),
  };

  it('renders app title "Baseball Ledger"', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('Baseball Ledger')).toBeInTheDocument();
  });

  it('renders league name', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('Test League')).toBeInTheDocument();
  });

  it('renders user name', () => {
    render(<Header {...defaultProps} />);
    const matches = screen.getAllByText('Player 1');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders navigation element', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('shows nav links when league is active', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText(/season/i)).toBeInTheDocument();
    expect(screen.getByText(/roster/i)).toBeInTheDocument();
    expect(screen.getByText(/stats/i)).toBeInTheDocument();
  });

  it('shows nav links even when leagueStatus is "setup"', () => {
    render(<Header {...defaultProps} leagueStatus="setup" />);
    expect(screen.getByText(/season/i)).toBeInTheDocument();
    expect(screen.getByText(/roster/i)).toBeInTheDocument();
  });

  it('calls onNavigate with route when nav link clicked', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<Header {...defaultProps} onNavigate={onNavigate} />);

    await user.click(screen.getByText(/season/i));
    expect(onNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('calls onLogout when logout button clicked', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(<Header {...defaultProps} onLogout={onLogout} />);

    const logoutButtons = screen.getAllByRole('button', { name: /log out/i });
    await user.click(logoutButtons[0]);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('shows league config link for commissioners', () => {
    render(<Header {...defaultProps} isCommissioner={true} />);
    expect(screen.getByText(/league config/i)).toBeInTheDocument();
  });

  it('hides league config link for non-commissioners', () => {
    render(<Header {...defaultProps} isCommissioner={false} />);
    expect(screen.queryByText(/league config/i)).not.toBeInTheDocument();
  });

  it('uses font-display for app title', () => {
    render(<Header {...defaultProps} />);
    const titleEl = screen.getByText('Baseball Ledger');
    expect(titleEl.className).toContain('font-display');
  });

  it('shows playoff variant when status is playoffs', () => {
    render(<Header {...defaultProps} leagueStatus="playoffs" />);
    const header = screen.getByRole('banner');
    expect(header.className).toContain('border-[var(--accent-primary)]');
  });

  it('renders header element with role="banner"', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});
