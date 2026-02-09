/**
 * Tests for AuthGuard component
 *
 * Verifies authentication gating and redirect behavior.
 *
 * @vitest-environment jsdom
 */

vi.mock('@hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthGuard } from '../../../../src/features/auth/AuthGuard';
import { useAuth } from '@hooks/useAuth';

function renderWithRouter(initialEntry = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<AuthGuard />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isInitialized is false', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isInitialized: false,
      user: null,
      session: null,
      error: null,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      initialize: vi.fn(),
    });

    const { container } = renderWithRouter();

    // AuthGuard returns null before initialization -- container should be empty
    expect(container.innerHTML).not.toContain('Protected Content');
    expect(container.innerHTML).not.toContain('Login Page');
  });

  it('redirects to /login when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isInitialized: true,
      user: null,
      session: null,
      error: null,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      initialize: vi.fn(),
    });

    renderWithRouter();

    expect(screen.getByText('Login Page')).toBeDefined();
  });

  it('renders outlet content when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isInitialized: true,
      user: { id: 'u1', email: 'test@test.com', displayName: 'Tester' },
      session: { accessToken: 'tok', expiresAt: 9999 },
      error: null,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      initialize: vi.fn(),
    });

    renderWithRouter();

    expect(screen.getByText('Protected Content')).toBeDefined();
  });

  it('does not show protected content when redirected to login', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isInitialized: true,
      user: null,
      session: null,
      error: null,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      initialize: vi.fn(),
    });

    renderWithRouter();

    expect(screen.queryByText('Protected Content')).toBeNull();
    expect(screen.getByText('Login Page')).toBeDefined();
  });
});
