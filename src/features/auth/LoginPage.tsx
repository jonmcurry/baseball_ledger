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
    <div className="flex min-h-screen flex-col items-center justify-center bg-old-lace p-gutter-xl">
      <div className="w-full max-w-sm rounded-card border border-sandstone bg-surface-raised p-gutter-xl shadow-card">
        <h1 className="font-headline text-2xl font-bold text-ballpark">Sign In</h1>
        {error && (
          <p className="mt-gutter text-sm text-semantic-danger">{error}</p>
        )}
        <form className="mt-gutter-lg space-y-gutter" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-button border border-sandstone px-3 py-2 text-sm"
              placeholder="you@example.com"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-button border border-sandstone px-3 py-2 text-sm"
              disabled={isSubmitting}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-button bg-ballpark py-2 font-medium text-old-lace hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-gutter-lg flex items-center gap-2">
          <div className="h-px flex-1 bg-sandstone" />
          <span className="text-xs text-muted">or</span>
          <div className="h-px flex-1 bg-sandstone" />
        </div>

        <button
          type="button"
          onClick={handleGuestLogin}
          disabled={isSubmitting}
          className="mt-gutter w-full rounded-button border border-sandstone py-2 text-sm font-medium text-ink hover:bg-sandstone/20 disabled:opacity-50"
        >
          Play as Guest
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
