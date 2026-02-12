# Phase 81: Fix Blank Screen on AuthGuard Routes

## Problem

Clicking "Create a League" (or any /leagues/* route) shows a blank screen with no
console errors. The screen stays blank while the Supabase auth session check completes.

## Root Cause

`AuthGuard.tsx` returns `null` when `isInitialized` is `false`:

```tsx
if (!isInitialized) {
  return null; // <-- blank screen
}
```

Auth initialization is async (`App.tsx` calls `initialize()` via useEffect). While the
Supabase `getSession()` call resolves, `isInitialized` stays `false`, and AuthGuard
renders nothing.

## Fix

Replace `return null` with `return <LoadingLedger message="Initializing..." />` in
AuthGuard. This shows a loading indicator during the brief init period instead of a
blank screen.

## Files Modified

| File | Change |
|------|--------|
| `src/features/auth/AuthGuard.tsx` | Import LoadingLedger, show it when `!isInitialized` |
| `tests/unit/features/auth/AuthGuard.test.tsx` | Update test to expect LoadingLedger instead of empty container |
| `docs/changelog.md` | Phase 81 entry |

## Verification

1. `npx vitest run` -- all tests pass
2. Visual: /leagues/new shows loading indicator briefly, then league config form
3. Commit
