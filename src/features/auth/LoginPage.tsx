/**
 * LoginPage
 *
 * Newspaper "classified ad" style login form.
 * Kicker label "SUBSCRIBER ACCESS" + editorial form styling.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { usePageTitle } from '@hooks/usePageTitle';

export function LoginPage() {
  usePageTitle('Sign In');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, loginAsGuest, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await login(email, password);
    setIsSubmitting(false);
    if (success) {
      navigate('/');
    }
  };

  const handleGuestLogin = async () => {
    setIsSubmitting(true);
    const success = await loginAsGuest();
    setIsSubmitting(false);
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-base px-gutter-lg py-gutter-xl">
      <div className="w-full max-w-sm border border-[var(--border-default)] bg-surface-raised p-gutter-xl relative">
        {/* Kicker */}
        <p className="kicker mb-2">Subscriber Access</p>

        <h1 className="font-headline text-type-4 font-bold text-[var(--text-primary)]">
          Sign In
        </h1>

        <hr className="rule-hairline" />

        {error && (
          <p className="mt-gutter text-type-1 text-semantic-danger">{error}</p>
        )}

        <form className="mt-gutter space-y-gutter" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block font-body text-type-1 font-semibold text-[var(--text-primary)]">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-[var(--border-default)] bg-[var(--surface-overlay)] px-3 py-2 font-body text-type-1 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-secondary)] focus:outline-none"
              placeholder="you@example.com"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="password" className="block font-body text-type-1 font-semibold text-[var(--text-primary)]">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border border-[var(--border-default)] bg-[var(--surface-overlay)] px-3 py-2 font-body text-type-1 text-[var(--text-primary)] focus:border-[var(--accent-secondary)] focus:outline-none"
              disabled={isSubmitting}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-vintage btn-vintage-primary w-full"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-gutter-lg flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--border-default)]" />
          <span className="font-body text-type-0 text-[var(--text-tertiary)] italic">or</span>
          <div className="h-px flex-1 bg-[var(--border-default)]" />
        </div>

        <button
          type="button"
          onClick={handleGuestLogin}
          disabled={isSubmitting}
          className="btn-vintage btn-vintage-secondary w-full mt-gutter"
        >
          Play as Guest
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
