// @vitest-environment jsdom
/**
 * Tests for LoginPage
 *
 * REQ-AUTH-001: Email/password + anonymous guest login.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '@features/auth/LoginPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockLogin = vi.fn();
const mockLoginAsGuest = vi.fn();

vi.mock('@hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    loginAsGuest: mockLoginAsGuest,
    error: null,
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign in heading', () => {
    render(<LoginPage />);
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('renders email and password inputs', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('renders the Play as Guest button', () => {
    render(<LoginPage />);
    expect(screen.getByText('Play as Guest')).toBeInTheDocument();
  });

  it('calls loginAsGuest when guest button is clicked', async () => {
    mockLoginAsGuest.mockResolvedValue(true);
    const user = userEvent.setup();

    render(<LoginPage />);
    await user.click(screen.getByText('Play as Guest'));

    expect(mockLoginAsGuest).toHaveBeenCalled();
  });

  it('navigates to dashboard on successful guest login', async () => {
    mockLoginAsGuest.mockResolvedValue(true);
    const user = userEvent.setup();

    render(<LoginPage />);
    await user.click(screen.getByText('Play as Guest'));

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('does not navigate on failed guest login', async () => {
    mockLoginAsGuest.mockResolvedValue(false);
    const user = userEvent.setup();

    render(<LoginPage />);
    await user.click(screen.getByText('Play as Guest'));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
