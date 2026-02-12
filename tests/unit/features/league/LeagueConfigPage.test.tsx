// @vitest-environment jsdom
/**
 * Tests for LeagueConfigPage
 */

import { render, screen, act } from '@testing-library/react';
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
  createLeague: vi.fn().mockResolvedValue({ id: 'league-1', inviteKey: 'ABC123' }),
}));

import * as leagueService from '@services/league-service';
const mockCreateLeague = leagueService.createLeague as ReturnType<typeof vi.fn>;

describe('LeagueConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockCreateLeague.mockResolvedValue({ id: 'league-1', inviteKey: 'ABC123' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<LeagueConfigPage />);

    await user.type(screen.getByLabelText('League Name'), 'AB');
    await user.click(screen.getByText('Create League'));

    expect(screen.getByText('League name must be at least 3 characters')).toBeInTheDocument();
  });

  it('shows progress indicator while creating league', async () => {
    // Make createLeague hang so we can inspect progress state
    let resolveCreate!: (val: { id: string; inviteKey: string }) => void;
    mockCreateLeague.mockReturnValue(
      new Promise((resolve) => { resolveCreate = resolve; }),
    );

    vi.useRealTimers();
    const user = userEvent.setup();
    render(<LeagueConfigPage />);

    await user.type(screen.getByLabelText('League Name'), 'Test League');
    await user.click(screen.getByText('Create League'));

    // Progress indicator should appear
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Generating teams...')).toBeInTheDocument();

    // Clean up
    await act(async () => {
      resolveCreate({ id: 'league-1', inviteKey: 'ABC123' });
    });
  });

  it('shows progressbar with aria attributes', async () => {
    let resolveCreate!: (val: { id: string; inviteKey: string }) => void;
    mockCreateLeague.mockReturnValue(
      new Promise((resolve) => { resolveCreate = resolve; }),
    );

    vi.useRealTimers();
    const user = userEvent.setup();
    render(<LeagueConfigPage />);

    await user.type(screen.getByLabelText('League Name'), 'Test League');
    await user.click(screen.getByText('Create League'));

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuenow');

    await act(async () => {
      resolveCreate({ id: 'league-1', inviteKey: 'ABC123' });
    });
  });

  it('hides form while submitting', async () => {
    let resolveCreate!: (val: { id: string; inviteKey: string }) => void;
    mockCreateLeague.mockReturnValue(
      new Promise((resolve) => { resolveCreate = resolve; }),
    );

    vi.useRealTimers();
    const user = userEvent.setup();
    render(<LeagueConfigPage />);

    await user.type(screen.getByLabelText('League Name'), 'Test League');
    await user.click(screen.getByText('Create League'));

    // Form elements should be hidden during submission
    expect(screen.queryByLabelText('League Name')).not.toBeInTheDocument();
    expect(screen.queryByText('Create League')).not.toBeInTheDocument();

    await act(async () => {
      resolveCreate({ id: 'league-1', inviteKey: 'ABC123' });
    });
  });

  it('shows error and restores form on failure', async () => {
    mockCreateLeague.mockRejectedValue(new Error('Server error'));

    vi.useRealTimers();
    const user = userEvent.setup();
    render(<LeagueConfigPage />);

    await user.type(screen.getByLabelText('League Name'), 'Test League');
    await user.click(screen.getByText('Create League'));

    // Wait for error to appear (form is restored after failure)
    const errorMsg = await screen.findByText('Server error');
    expect(errorMsg).toBeInTheDocument();

    // Form should be visible again
    expect(screen.getByLabelText('League Name')).toBeInTheDocument();
  });
});
