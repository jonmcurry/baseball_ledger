/**
 * LoginPage
 *
 * Email/password login form placeholder.
 */

export function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-old-lace p-gutter-xl">
      <div className="w-full max-w-sm rounded-card border border-sandstone bg-white p-gutter-xl shadow-card">
        <h1 className="font-headline text-2xl font-bold text-ballpark">Sign In</h1>
        <form className="mt-gutter-lg space-y-gutter" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="mt-1 w-full rounded-button border border-sandstone px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="mt-1 w-full rounded-button border border-sandstone px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-button bg-ballpark py-2 font-medium text-old-lace hover:opacity-90"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
