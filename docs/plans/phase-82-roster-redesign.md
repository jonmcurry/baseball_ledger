# Phase 82: Roster Page Redesign

## Bugs Fixed
1. **11 players in lineup**: `useTeam.ts` filters by `lineupOrder !== null` instead of `rosterSlot === 'starter'`
2. **DH invisible on diamond**: `LineupDiamond.tsx` passes `'P'` to position mapping instead of `'DH'`
3. **No batting order reorder**: No UI to change batting order
4. **Multiple DH assignments**: No enforcement of 1 DH max
5. **No pitcher role management**: Can't move closer to bullpen or vice versa
6. **Batting order overflow**: Shows >9 players when data is inconsistent

## Changes

### useTeam.ts
- Filter starters by `rosterSlot === 'starter'`, limit to first 9 by lineupOrder

### rosterStore.ts
- Add `swapBattingOrder(rosterId1, rosterId2)` action
- Add `changePitcherRole(rosterId, newSlot)` action

### RosterPage.tsx
- New layout: Diamond + Batting Order side by side
- Batting order shows numbered 1-9 with move up/down buttons
- Bench panel with "Add to Lineup" shows target position selector
- Pitching staff with role change buttons

### LineupDiamond.tsx
- Fix position list: DH instead of P
- Highlight selected position for assignment

### BenchPanel.tsx
- Show primary position badge
- Improved swap interaction

### PitchingRotation.tsx
- Add role change buttons (to bullpen, to rotation, to closer)
- Enforce roster limits (4 rotation, 3 bullpen, 1 closer)

## Files Modified
- src/hooks/useTeam.ts
- src/stores/rosterStore.ts
- src/features/roster/RosterPage.tsx
- src/features/roster/LineupDiamond.tsx
- src/features/roster/BenchPanel.tsx
- src/features/roster/PitchingRotation.tsx
- tests/unit/hooks/useTeam.test.ts
- tests/unit/features/roster/RosterPage.test.tsx (if exists)
- docs/changelog.md
