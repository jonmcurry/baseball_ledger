# Backlog Implementation Plan

> Per CLAUDE.md Rule 7 -- plan checklist for `docs/backlog.md` items.

---

## Priority Order

| Priority | Backlog Item | Rationale |
|----------|-------------|-----------|
| P0 | 2a) Stats not tracking | Root cause blocks items 1 and 2 |
| P1 | 2) Player stats display | Depends on P0 fix |
| P2 | 1) Box score after each game | Data generated but not persisted |
| P3 | 4) Play-by-play simulation viewer | Same persistence gap as P2 |
| P4 | 5) Trade evaluation scoring | Functional but needs tuning |
| P5 | 3) Draft modal text contrast | Investigation needed -- no contrast issue found in code |

---

## Phase 84 -- Fix Season Stats Accumulation (P0)

**Problem:** `accumulator.ts` has full batting/pitching accumulation logic but is
never called. The `simulate_day_commit` RPC inserts `game_logs` and updates team
W/L/RS/RA but does NOT update the `season_stats` table. Every stat page shows
nothing.

**Root cause chain:**
- `game-runner.ts` returns `GameResult` with `playerBattingLines` + `playerPitchingLines`
- `season-runner.ts:compactResult()` (lines 81-94) strips box_score and play_by_play
  but keeps batting/pitching lines
- `simulate-day.ts` sends lines to `simulate_day_commit` RPC
- RPC inserts into `game_logs` and updates `teams` standings
- Nobody calls `accumulator.ts` to update `season_stats`

**Fix approach:** After `simulate_day_commit` succeeds in `simulate-day.ts`, call a
new `accumulateGameDay()` function that reads the batting/pitching lines from each
game result and upserts into `season_stats`.

### Checklist

- [ ] Write failing test: simulate a day, verify `season_stats` rows are created
- [ ] Create `api/_lib/accumulate-season-stats.ts`:
  - Accept array of game results (with batting/pitching lines)
  - For each player line, upsert into `season_stats` using `accumulator.ts` logic
  - Use Supabase upsert on `(league_id, player_id)` unique constraint
- [ ] Create migration `00016_simulate_day_stats.sql`:
  - New RPC or extend existing to atomically update `season_stats` JSONB columns
  - OR use client-side upserts after RPC commit (simpler, acceptable for MVP)
- [ ] Wire into `simulate-day.ts`:
  - After successful `simulate_day_commit`, call `accumulateGameDay()`
  - Pass supabase client, league_id, season_year, game results
- [ ] Update unit tests for `accumulator.ts` (already has tests, verify coverage)
- [ ] Add integration test: simulate day -> check season_stats table has correct totals
- [ ] Verify: run `npx vitest run`, `npx tsc --noEmit`
- [ ] Update `docs/changelog.md`

### Files Modified

| File | Change |
|------|--------|
| `api/_lib/accumulate-season-stats.ts` | NEW -- server-side accumulation caller |
| `api/_lib/simulate-day.ts` | Call accumulation after RPC commit |
| `supabase/migrations/00016_*.sql` | Stats accumulation support (if RPC needed) |
| `tests/unit/api/_lib/accumulate-season-stats.test.ts` | NEW -- unit tests |
| `tests/unit/api/_lib/simulate-day.test.ts` | Add stats accumulation assertion |

---

## Phase 85 -- Player Stats Display (P1)

**Problem:** No UI shows individual player season stats. User wants ESPN-style stats
on player profiles and team pages.

**Current state:**
- `season_stats` table has `batting_stats` and `pitching_stats` JSONB columns
- `PlayerProfileModal` exists but only shows card data (APBA ratings), not season stats
- Team page (`RosterPage.tsx`) shows roster but no stats

**Fix approach:** Two views:
1. **Player modal stats tab**: Add season stats section to `PlayerProfileModal`
2. **Team stats table**: Add batting/pitching leaderboard tables to team page

### Checklist

- [ ] Create `api/leagues/[id]/stats/players.ts` endpoint:
  - GET with query params: `?team=<teamId>` (optional filter)
  - Returns season_stats rows with player names joined from player_pool
  - Sort by relevant stat (BA for batting, ERA for pitching)
- [ ] Create `src/services/stats-service.ts`:
  - `fetchPlayerStats(leagueId, teamId?)` -> typed stat rows
- [ ] Create `src/lib/types/stats.ts`:
  - `PlayerSeasonBatting`, `PlayerSeasonPitching` interfaces
- [ ] Extend `PlayerProfileModal` with season stats section:
  - Fetch stats for the selected player
  - Show batting line: G, AB, R, H, 2B, 3B, HR, RBI, BB, SO, BA, OBP, SLG, OPS
  - Show pitching line: G, GS, W, L, SV, IP, H, R, ER, BB, SO, ERA, WHIP
  - Only show relevant section based on player type
- [ ] Create `src/features/roster/TeamStatsPanel.tsx`:
  - Batting table: sortable columns (PA, AB, H, HR, RBI, BA, OBP, SLG, OPS)
  - Pitching table: sortable columns (W, L, ERA, G, GS, IP, SO, WHIP)
  - Ballpark Night theme -- scoreboard-panel styling with gold headers
- [ ] Add stats tab or section to team/roster page
- [ ] Write component tests
- [ ] Verify: run `npx vitest run`, `npx tsc --noEmit`
- [ ] Update `docs/changelog.md`

### Design Direction (Frontend-Design Skill)

**Aesthetic:** Scoreboard data display -- dense stat tables styled like the back of a
baseball card or stadium scoreboard. Gold column headers on dark navy, warm cream text,
monospace stat font (`font-stat` from design system). Alternating row backgrounds with
subtle warmth. Sortable column headers with small directional indicators.

### Files Modified

| File | Change |
|------|--------|
| `api/leagues/[id]/stats/players.ts` | NEW -- player stats endpoint |
| `src/services/stats-service.ts` | NEW -- client service |
| `src/lib/types/stats.ts` | NEW -- stat type definitions |
| `src/features/roster/TeamStatsPanel.tsx` | NEW -- team stats tables |
| `src/components/baseball/PlayerProfileModal.tsx` | Add season stats section |
| `src/features/roster/RosterPage.tsx` | Wire in stats panel |

---

## Phase 86 -- Box Score Persistence and Display (P2)

**Problem:** `game-runner.ts` generates complete `BoxScore` objects but
`season-runner.ts:compactResult()` strips them. The `game_logs.box_score` column
exists (nullable JSONB) but is always NULL.

**Current state:**
- `BoxScoreDisplay.tsx` exists and renders line score + batting/pitching tables
- It expects `BoxScore`, `BattingLine[]`, `PitchingLine[]` props
- `game_logs` already stores `batting_lines` and `pitching_lines`
- `box_score` column is nullable and always NULL

**Fix approach:**
1. Stop stripping `box_score` in `compactResult()`
2. Persist `box_score` JSONB alongside batting/pitching lines
3. Build a game log viewer page that loads from DB and renders `BoxScoreDisplay`

### Checklist

- [ ] Write failing test: after simulation, `game_logs.box_score` is not NULL
- [ ] Modify `season-runner.ts:compactResult()` to preserve `boxScore`
- [ ] Modify `simulate-day.ts` to include `box_score` in RPC payload
- [ ] Update `simulate_day_commit` RPC (migration) to write `box_score` column
- [ ] Create `api/leagues/[id]/games/[gameId].ts` endpoint:
  - GET: Returns full game log with box_score, batting_lines, pitching_lines
- [ ] Create `src/features/game-viewer/GameLogPage.tsx`:
  - Route: `/leagues/:id/games/:gameId`
  - Fetches game log from API
  - Renders `BoxScoreDisplay` with DB data
  - Link from schedule page (completed games become clickable)
- [ ] Update schedule UI: completed games show score as clickable link to box score
- [ ] Write component tests for GameLogPage
- [ ] Verify: run `npx vitest run`, `npx tsc --noEmit`
- [ ] Update `docs/changelog.md`

### Design Direction

**Aesthetic:** Classic newspaper box score. Warm sepia-tinted card with fine borders.
Compact stat tables using `font-stat` monospace. Line score rendered as a traditional
inning-by-inning grid (1-9 + extras | R H E). Team abbreviations in bold display font.

### Files Modified

| File | Change |
|------|--------|
| `src/lib/simulation/season-runner.ts` | Preserve boxScore in compactResult |
| `api/_lib/simulate-day.ts` | Include box_score in RPC payload |
| `supabase/migrations/00017_*.sql` | Update RPC to write box_score |
| `api/leagues/[id]/games/[gameId].ts` | NEW -- game log endpoint |
| `src/features/game-viewer/GameLogPage.tsx` | NEW -- box score page |
| `src/features/schedule/SchedulePage.tsx` | Clickable completed game scores |

---

## Phase 87 -- Play-by-Play Persistence and Viewer (P3)

**Problem:** `game-runner.ts` generates `PlayByPlayEntry[]` but it is stripped by
`compactResult()`. The `game_logs.play_by_play` column exists but is always NULL.
`PlayByPlayFeed.tsx` exists but only works with in-memory simulation data.

**Fix approach:** Same pattern as Phase 86 -- persist play-by-play alongside box
score, then expose via the game log viewer.

**Size concern:** Play-by-play arrays can be large (50-80 entries per game, ~100
bytes each). For a 162-game season with ~80 games/day = ~500KB/day. This is
manageable for JSONB storage but should be monitored.

### Checklist

- [ ] Write failing test: after simulation, `game_logs.play_by_play` is not NULL
- [ ] Modify `compactResult()` to also preserve `playByPlay`
- [ ] Modify `simulate-day.ts` to include `play_by_play` in RPC payload
- [ ] Update RPC migration to write `play_by_play` column
- [ ] Extend `GameLogPage.tsx` with play-by-play tab/section:
  - Render `PlayByPlayFeed` component with DB data
  - Tab toggle between "Box Score" and "Play-by-Play"
- [ ] Write tests
- [ ] Verify: run `npx vitest run`, `npx tsc --noEmit`
- [ ] Update `docs/changelog.md`

### Design Direction

**Aesthetic:** Scrolling ticker tape / radio broadcast feel. Each play entry in a
narrow card with inning marker on the left edge. Score state shown as small
scoreboard chips. Auto-scroll with pause-on-hover. Monospace play descriptions.

### Files Modified

| File | Change |
|------|--------|
| `src/lib/simulation/season-runner.ts` | Also preserve playByPlay |
| `api/_lib/simulate-day.ts` | Include play_by_play in payload |
| `supabase/migrations/00017_*.sql` | Same migration as Phase 86 (combined) |
| `src/features/game-viewer/GameLogPage.tsx` | Add PBP tab |

**Note:** Phases 86 and 87 share the same migration and `compactResult()` changes.
They can be combined into a single phase if preferred.

---

## Phase 88 -- Trade Evaluation Improvements (P4)

**Problem:** User reports trade evaluation "doesn't work or isn't implemented."
Investigation shows template-based evaluation IS implemented, but the scoring method
(sum of APBA card byte values with positional premiums) may feel arbitrary and the
UI may not be discoverable.

**Current state:**
- `template-trade-eval.ts`: Scoring via `calculateSideValue()` with positional
  premiums (SP 1.15x, C 1.10x, SS 1.10x, CF 1.05x, CL 1.05x)
- 4 manager personality thresholds (conservative +15%, aggressive -5%, balanced +5%,
  analytical +10%)
- `TradeEvaluationPanel.tsx`: Shows accept/reject/counter badge with reasoning
- `useTradeEvaluation.ts`: Hook that runs template eval immediately

**Possible issues:**
1. Trade UI flow may not trigger evaluation (discoverability)
2. Raw card byte sum is a crude value metric
3. User may expect a more transparent scoring breakdown

### Checklist

- [ ] Investigate: reproduce the user's "doesn't work" claim -- is it a UI flow
  issue (can't reach the eval) or a logic issue (eval returns wrong results)?
- [ ] If UI flow issue: fix navigation/trigger for trade evaluation
- [ ] Improve scoring transparency in `TradeEvaluationPanel.tsx`:
  - Show per-player value breakdown (not just total diff)
  - Show positional premium applied (if analytical manager)
  - Show threshold explanation ("Your manager requires +15% value")
- [ ] Consider improved value formula:
  - Weight card outcomes by importance (HR, K, BB correlations from APBA mechanics)
  - Factor in player age / years remaining
  - Factor in positional scarcity within the league
- [ ] Write tests for improved scoring
- [ ] Verify: run `npx vitest run`, `npx tsc --noEmit`
- [ ] Update `docs/changelog.md`

### Design Direction

**Aesthetic:** Scouting report card. Split-panel comparison (your side vs their side).
Player value bars as horizontal gauges with gold fill on dark background. Manager
personality icon/badge. Clear accept/reject/counter recommendation with reasoning
in a callout box.

### Files Modified

| File | Change |
|------|--------|
| `src/lib/ai/template-trade-eval.ts` | Improved scoring + transparency |
| `src/features/transactions/TradeEvaluationPanel.tsx` | Per-player breakdown UI |
| `src/hooks/useTradeEvaluation.ts` | Pass through detailed breakdown |
| Trade flow pages (TBD) | Fix navigation if needed |

---

## Phase 89 -- Draft Modal Text Review (P5)

**Problem:** User reports "the textbox is white and the text is barely visible."
Code investigation found no contrast issue -- draft panels use cream text (#F5F0E6)
on dark navy (#132337) with ~12:1 contrast ratio (exceeds WCAG AAA).

**Possible explanations:**
1. The issue was in a previous version and has been fixed by the Phase 82 redesign
2. A specific browser/OS rendering issue
3. A specific modal (e.g., draft reasoning panel with `bg-old-lace/50` background)
   that looks washed out on certain displays

### Checklist

- [ ] Ask user to reproduce: screenshot the exact screen where text is hard to read
- [ ] If reproducible: identify the specific component and fix contrast
- [ ] If not reproducible: mark as resolved (likely fixed in Phase 82 redesign)
- [ ] If it is the DraftReasoningPanel (`bg-old-lace/50`): replace with
  `scoreboard-panel` styling for consistency
- [ ] Verify: visual check across browsers
- [ ] Update `docs/changelog.md`

---

## Dependency Graph

```
Phase 84 (stats accumulation)
    |
    v
Phase 85 (stats display)

Phase 86 (box score persist) --+--> can combine into single phase
Phase 87 (play-by-play persist) -+

Phase 88 (trade eval) -- independent
Phase 89 (draft text)  -- independent, possibly already fixed
```

## Estimated Scope

| Phase | New Files | Modified Files | Tests | Complexity |
|-------|-----------|---------------|-------|------------|
| 84 | 2 | 2-3 | 3-5 | Medium (DB + server logic) |
| 85 | 4 | 2 | 4-6 | Medium (API + UI components) |
| 86 | 2 | 3 | 3-4 | Medium (persistence + new page) |
| 87 | 0 | 3 | 2-3 | Low (extends Phase 86 work) |
| 88 | 0 | 3-4 | 2-3 | Medium (scoring redesign) |
| 89 | 0 | 0-1 | 0-1 | Low (investigation + possible fix) |
