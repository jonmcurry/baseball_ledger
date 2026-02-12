# Phase 79: Draft Pick Responsiveness + Auto-Pick Quality

## Issues

1. **Slow draft pick registration**: User clicks "Draft", waits 5-15s before it registers.
   - Root cause: `handlePick()` calls `processCpuPicks()` synchronously after recording
     the human pick. In an 8-team league with 7 CPU teams, this runs ~42 sequential
     DB queries before the POST response returns.

2. **Alphabetical auto-pick on timer expiry**: If the human doesn't pick in time,
   the auto-pick selects from "A" players only.
   - Root cause: `handleAutoPickOnExpire` calls `selectBestAvailable(availablePlayers)`
     where `availablePlayers` is page 1 of 50 players sorted by `nameLast asc`.

## Fix Plan

### Server: `api/leagues/[id]/draft.ts`

- [x] **`handlePick`**: Remove `processCpuPicks()` call. Return immediately after recording
  the human pick. Include a `cpuPicksPending: true` flag in the response.
- [x] **`handleAutoPick`**: Two changes:
  1. Relax auth from commissioner-only to any team owner in the league.
     This endpoint only processes CPU team picks + timed-out human picks, so it is safe.
  2. Add human auto-pick: When the current pick is for a human team (timer expired),
     make a valuation-based pick for them using the top-500 player pool + AI strategy,
     then continue processing subsequent CPU picks.

### Frontend: `src/stores/draftStore.ts`

- [x] **`submitPick`**: After the pick POST returns:
  1. Refetch draft state + available players immediately (user sees their pick fast).
  2. Fire a `draftService.autoPick()` POST to trigger CPU processing.
  3. After CPU processing completes, refetch state again.

### Frontend: `src/features/draft/DraftBoardPage.tsx`

- [x] **`handleAutoPickOnExpire`**: Instead of client-side `selectBestAvailable`,
  call the server-side `draftService.autoPick()` endpoint which uses valuation-based
  ordering and AI strategy.

## Files Modified

| File | Change |
|------|--------|
| `api/leagues/[id]/draft.ts` | Remove sync CPU picks from handlePick; enhance handleAutoPick |
| `src/stores/draftStore.ts` | Split submitPick into immediate response + background CPU processing |
| `src/features/draft/DraftBoardPage.tsx` | Use server-side auto-pick on timer expiry |
| `tests/unit/api/draft-pick.test.ts` | Tests for fast pick response + auto-pick quality |
| `docs/changelog.md` | Phase 79 entry |

## Verification

1. `npx tsc --noEmit` -- type check
2. `npx vitest run` -- all tests pass
3. Manual: Click Draft, pick registers within 1-2 seconds
4. Manual: Let timer expire, auto-picked player is not alphabetical
