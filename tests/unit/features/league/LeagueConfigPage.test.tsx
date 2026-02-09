// @vitest-environment jsdom
/**
 * Tests for LeagueConfigPage
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeagueConfigPage } from '@features/league/LeagueConfigPage';

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
  createLeague: vi.fn().mockResolvedValue({ id: 'league-1' }),
}));

describe('LeagueConfigPage', () => {
  it('renders page heading', () => {
    render(<LeagueConfigPage />);
    expect(screen.getByText('Create a League')).toBeInTheDocument();
  });

  it('renders league name input', () => {
    render(<LeagueConfigPage />);
    expect(screen.getByLabelText('League Name')).toBeInTheDocument();
  });

  it('renders team count select', () => {
    render(<LeagueConfigPage />);
    expect(screen.getByLabelText('Number of Teams')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<LeagueConfigPage />);
    expect(screen.getByText('Create League')).toBeInTheDocument();
  });

  it('shows validation error for short league name', async () => {
    const user = userEvent.setup();
    render(<LeagueConfigPage />);

    await user.type(screen.getByLabelText('League Name'), 'AB');
    await user.click(screen.getByText('Create League'));

    expect(screen.getByText('League name must be at least 3 characters')).toBeInTheDocument();
  });
});
