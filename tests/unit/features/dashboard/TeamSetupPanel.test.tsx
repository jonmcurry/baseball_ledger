// @vitest-environment jsdom
/**
 * Tests for TeamSetupPanel component
 *
 * REQ-LGE-004: Display auto-generated team names.
 * REQ-LGE-005: Show AL/NL division assignments.
 * REQ-LGE-006: Ownership badges (You / Player).
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamSetupPanel } from '@features/dashboard/TeamSetupPanel';
import type { TeamSummary } from '@lib/types/league';

function makeTeam(overrides: Partial<TeamSummary> = {}): TeamSummary {
  return {
    id: 'team-1',
    name: 'Aces',
    city: 'Austin',
    ownerId: null,
    managerProfile: 'balanced',
    leagueDivision: 'AL',
    division: 'East',
    wins: 0,
    losses: 0,
    runsScored: 0,
    runsAllowed: 0,
    homeWins: 0,
    homeLosses: 0,
    awayWins: 0,
    awayLosses: 0,
    streak: '-',
    lastTenWins: 0,
    lastTenLosses: 0,
    ...overrides,
  };
}

const defaultProps = {
  isCommissioner: true,
  userId: 'user-1',
  onStartDraft: vi.fn(),
  isStartingDraft: false,
  inviteKey: 'ABC12345',
};

describe('TeamSetupPanel', () => {
  it('renders league overview header', () => {
    const teams = [makeTeam()];
    render(<TeamSetupPanel {...defaultProps} teams={teams} />);

    expect(screen.getByText('League Overview')).toBeInTheDocument();
  });

  it('renders AL and NL league tabs', () => {
    const teams = [
      makeTeam({ id: 't1', city: 'Austin', name: 'Aces', leagueDivision: 'AL', division: 'East' }),
      makeTeam({ id: 't2', city: 'Boston', name: 'Barons', leagueDivision: 'NL', division: 'West' }),
    ];
    render(<TeamSetupPanel {...defaultProps} teams={teams} />);

    expect(screen.getByText('American League')).toBeInTheDocument();
    expect(screen.getByText('National League')).toBeInTheDocument();
  });

  it('shows AL teams by default, NL teams after tab click', async () => {
    const user = userEvent.setup();
    const teams = [
      makeTeam({ id: 't1', name: 'Aces', leagueDivision: 'AL', division: 'East' }),
      makeTeam({ id: 't2', name: 'Barons', leagueDivision: 'NL', division: 'West' }),
    ];
    render(<TeamSetupPanel {...defaultProps} teams={teams} />);

    // AL tab is active by default -- shows AL team name
    expect(screen.getByText('Aces')).toBeInTheDocument();
    expect(screen.queryByText('Barons')).not.toBeInTheDocument();

    // Click NL tab
    await user.click(screen.getByText('National League'));
    expect(screen.getByText('Barons')).toBeInTheDocument();
    expect(screen.queryByText('Aces')).not.toBeInTheDocument();
  });

  it('shows You badge for current user team', () => {
    const teams = [
      makeTeam({ id: 't1', ownerId: 'user-1' }),
    ];
    render(<TeamSetupPanel {...defaultProps} userId="user-1" teams={teams} />);

    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('shows Player badge for other user teams', () => {
    const teams = [
      makeTeam({ id: 't1', ownerId: 'other-user' }),
    ];
    render(<TeamSetupPanel {...defaultProps} userId="user-1" teams={teams} />);

    expect(screen.getByText('Player')).toBeInTheDocument();
  });

  it('does not show CPU badge for unowned teams', () => {
    const teams = [
      makeTeam({ id: 't1', ownerId: null }),
    ];
    render(<TeamSetupPanel {...defaultProps} teams={teams} />);

    expect(screen.queryByText('CPU')).not.toBeInTheDocument();
  });

  it('renders Start Draft button only for commissioners', () => {
    const teams = [makeTeam()];
    const { rerender } = render(
      <TeamSetupPanel {...defaultProps} isCommissioner={true} teams={teams} />,
    );
    expect(screen.getByRole('button', { name: /start draft/i })).toBeInTheDocument();

    rerender(
      <TeamSetupPanel {...defaultProps} isCommissioner={false} teams={teams} />,
    );
    expect(screen.queryByRole('button', { name: /start draft/i })).not.toBeInTheDocument();
  });

  it('calls onStartDraft when button clicked', async () => {
    const user = userEvent.setup();
    const onStartDraft = vi.fn();
    const teams = [makeTeam()];
    render(
      <TeamSetupPanel {...defaultProps} onStartDraft={onStartDraft} teams={teams} />,
    );

    await user.click(screen.getByRole('button', { name: /start draft/i }));
    expect(onStartDraft).toHaveBeenCalledTimes(1);
  });

  it('renders invite key', () => {
    const teams = [makeTeam()];
    render(<TeamSetupPanel {...defaultProps} inviteKey="XYZ99999" teams={teams} />);

    expect(screen.getByText('XYZ99999')).toBeInTheDocument();
  });

  it('shows summary stats', () => {
    const teams = [
      makeTeam({ id: 't1', leagueDivision: 'AL', division: 'East' }),
      makeTeam({ id: 't2', leagueDivision: 'NL', division: 'West' }),
    ];
    render(<TeamSetupPanel {...defaultProps} teams={teams} />);

    expect(screen.getByText('Teams')).toBeInTheDocument();
    expect(screen.getByText('Leagues')).toBeInTheDocument();
    expect(screen.getByText('Divisions')).toBeInTheDocument();
  });

  it('highlights user team in overview section', () => {
    const teams = [
      makeTeam({ id: 't1', city: 'Austin', name: 'Aces', ownerId: 'user-1', leagueDivision: 'AL', division: 'East' }),
    ];
    render(<TeamSetupPanel {...defaultProps} userId="user-1" teams={teams} />);

    expect(screen.getByText('Your Team')).toBeInTheDocument();
    expect(screen.getByText(/Austin Aces/)).toBeInTheDocument();
    expect(screen.getByText(/AL East/)).toBeInTheDocument();
  });
});
