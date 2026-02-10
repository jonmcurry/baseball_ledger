/**
 * SplashPage
 *
 * Landing page with "Create a League" and "Join a League" options.
 */

export function SplashPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-old-lace p-gutter-xl">
      <h1 className="font-headline text-4xl font-bold text-ballpark">Baseball Ledger</h1>
      <p className="mt-gutter text-lg text-ink">APBA Baseball Simulation</p>
      <div className="mt-gutter-xl flex gap-gutter-lg">
        <a
          href="/leagues/new"
          className="rounded-button bg-ballpark px-6 py-3 font-medium text-old-lace shadow-card hover:opacity-90"
        >
          Create a League
        </a>
        <a
          href="/leagues/join"
          className="rounded-button border-2 border-ballpark px-6 py-3 font-medium text-ballpark shadow-card hover:bg-ballpark/10"
        >
          Join a League
        </a>
      </div>
    </div>
  );
}

export default SplashPage;
