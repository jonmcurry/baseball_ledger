// @vitest-environment jsdom
/**
 * Tests for DeleteLeagueButton (REQ-LGE-010)
 *
 * Destructive action with typed confirmation.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteLeagueButton } from '@features/league/DeleteLeagueButton';

vi.mock('@services/league-service', () => ({
  deleteLeague: vi.fn().mockResolvedValue(undefined),
}));

import { deleteLeague } from '@services/league-service';

describe('DeleteLeagueButton', () => {
  it('renders delete button', () => {
    render(<DeleteLeagueButton leagueId="lg-1" leagueName="Test League" onDeleted={vi.fn()} />);
    expect(screen.getByRole('button', { name: /delete league/i })).toBeInTheDocument();
  });

  it('opens confirmation dialog when button is clicked', () => {
    render(<DeleteLeagueButton leagueId="lg-1" leagueName="Test League" onDeleted={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /delete league/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('requires typing league name to confirm', async () => {
    const user = userEvent.setup();
    render(<DeleteLeagueButton leagueId="lg-1" leagueName="Test League" onDeleted={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /delete league/i }));

    const confirmBtn = screen.getByRole('button', { name: /confirm delete/i });
    expect(confirmBtn).toBeDisabled();

    await user.type(screen.getByPlaceholderText(/type league name/i), 'Test League');
    expect(confirmBtn).toBeEnabled();
  });

  it('calls deleteLeague and onDeleted when confirmed', async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    render(<DeleteLeagueButton leagueId="lg-1" leagueName="Test League" onDeleted={onDeleted} />);

    fireEvent.click(screen.getByRole('button', { name: /delete league/i }));
    await user.type(screen.getByPlaceholderText(/type league name/i), 'Test League');
    fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }));

    await waitFor(() => {
      expect(deleteLeague).toHaveBeenCalledWith('lg-1');
    });

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalled();
    });
  });

  it('closes dialog when cancel is clicked', () => {
    render(<DeleteLeagueButton leagueId="lg-1" leagueName="Test League" onDeleted={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /delete league/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
