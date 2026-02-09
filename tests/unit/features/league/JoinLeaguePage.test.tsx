// @vitest-environment jsdom
/**
 * Tests for JoinLeaguePage
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JoinLeaguePage } from '@features/league/JoinLeaguePage';

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock('@hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 'user-1', email: 'test@test.com' },
    isInitialized: true,
    error: null,
  }),
}));

vi.mock('@services/league-service', () => ({
  joinLeague: vi.fn().mockResolvedValue({ leagueId: 'league-1' }),
}));

describe('JoinLeaguePage', () => {
  it('renders page heading', () => {
    render(<JoinLeaguePage />);
    expect(screen.getByText('Join a League')).toBeInTheDocument();
  });

  it('renders invite code input', () => {
    render(<JoinLeaguePage />);
    expect(screen.getByLabelText('Invite Code')).toBeInTheDocument();
  });

  it('submit button is disabled when invite code is empty', () => {
    render(<JoinLeaguePage />);
    expect(screen.getByText('Join League')).toBeDisabled();
  });

  it('submit button becomes enabled when code is entered', async () => {
    const user = userEvent.setup();
    render(<JoinLeaguePage />);

    await user.type(screen.getByLabelText('Invite Code'), 'ABC123');
    expect(screen.getByText('Join League')).not.toBeDisabled();
  });
});
