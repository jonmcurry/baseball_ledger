# Changelog

## 2026-02-13 - Auto-Draft Toggle

Added ability for human players to have the CPU draft for them:

- **Auto-Draft toggle button**: Lightning bolt button in draft board header toggles
  auto-draft ON/OFF. Gold styling when active, muted when inactive.
- **Auto-fire on turn**: When enabled, auto-pick fires 500ms after it becomes the
  player's turn, using the existing server-side AI strategy (round-aware, position
  needs-based). Brief delay gives visual feedback of "on the clock" state.
- **Timer disabled**: Pick timer shows --:-- when auto-draft is active since picks
  fire automatically. Player table is also disabled to prevent accidental manual picks.
- **Banner update**: "On the Clock" banner shows "Auto-Drafting..." when enabled.
- Store: `autoDraftEnabled` boolean + `setAutoDraftEnabled` action in draftStore.
  Resets on store reset (new draft session).

## 2026-02-13 - Stats Page Data Loading + Box Score Resilience

Fixed stats not populating and box score "Detailed game data not available":

- **StatsPage loads data on mount**: Added useEffect with leagueId from useParams
  to fetch batting/pitching leaders when the page mounts with empty store data.
  Previously stats only loaded after simulation completed (invalidateStatsCache).
- **Stats API includes league_division**: Batting and pitching endpoints now join
  with teams table to include league_division, enabling AL/NL filtering.
- **Box score shows batting/pitching lines**: hasDetailedData check now includes
  battingLines and pitchingLines (not just boxScore and playByPlay). BoxScoreDisplay
  accepts null boxScore, rendering the LineScore only when available. Games stored
  before migration 00023 now show stat lines instead of "not yet available".

## 2026-02-13 - Simulate Endpoint Resilience (502 Fix for Multi-Day Sim)

Fixed the simulate endpoint crashing mid-loop, causing Sim Week/Month/Season to
stop after ~3 days:

- **Non-fatal post-commit steps**: Schedule row updates and stats accumulation
  now wrapped in separate try/catch blocks -- if they fail after the atomic RPC
  commits game_logs + standings, the endpoint still returns 200 instead of 502
- **Compact response body**: Stripped full DayResult (play-by-play, box scores,
  batting/pitching lines for all 14 games) down to just game IDs and scores,
  reducing response payload from ~500KB to ~2KB per simulated day

## 2026-02-13 - Season Page Overhaul (Full Schedule, Simulate Fix, Game Viewer Final)

Four issues addressed across simulation, schedule, and game viewer:

- **Simulate 502 fix**: Parallelized sequential schedule row updates (14 games
  done one-by-one -> Promise.all) to reduce Vercel function execution time
- **Full season schedule**: Replaced standings + single-day ScheduleView on the
  Season page with a scrollable SeasonScheduleView showing all days, auto-scrolled
  to the current day, with completed games clickable for box scores
- **Game viewer "Final" status**: Scoreboard now shows "Final" instead of "Bot 9"
  for completed games via new `isComplete` prop on Scoreboard and GameStatePanel
- **Standings removed from Season page**: Per user request, standings panel
  removed from the Season page grid (accessible via dedicated Standings nav link)

## 2026-02-13 - Dashboard Fixes (Season Rename, Ticker Redesign, Game Viewer, CRLF)

Six issues addressed across the dashboard, game viewer, and configuration:

- **Dashboard -> Season rename**: Navigation label, page title, and heading all
  changed from "Dashboard" to "Season"
- **Score ticker redesign**: Complete redesign with "Press Box Wire" vintage
  scoreboard aesthetic -- miniature riveted-metal cards with winner badges,
  glowing gold scores, snap scrolling, and "View Box Score" hover reveal
- **Box score click-through**: ResultsTicker and ScheduleView now navigate to
  the game viewer when clicking a completed game result
- **Game viewer DB fallback**: GameViewerPage now fetches from the database
  game_logs API when game data is not in the in-memory simulation store, so
  games persist across page refreshes and sessions
- **Game detail API fix**: Changed query from `.eq('id', ...)` to
  `.eq('game_id', ...)` to match schedule row IDs to game_logs entries
- **Env var CRLF fix**: All three `requireEnv()` functions now return trimmed
  values, preventing Windows line-ending corruption (`\r\n`) from breaking
  Supabase WebSocket URLs and API keys
- **Schedule games clickable**: Completed games in ScheduleView are now
  interactive with click/keyboard navigation to the game viewer

## 2026-02-13 - Draft Board UX Fixes (Search, Badges, Position Filters)

Six draft board issues addressed:

- **Search input**: Fixed white-on-white text in player search field by using
  proper surface/text CSS variables instead of `--color-ink` opacity
- **Position badges**: Fixed blue-on-blue badges by switching to predefined CSS
  badge classes (`position-badge-pitcher`, `position-badge-outfield`, etc.)
- **Position filter dropdown**: Consolidated LF/CF/RF into single "Outfielder"
  option; added "Closer" as separate filter option distinct from "Relief Pitcher"
- **API outfield filter**: When filtering by "Outfielder", the draft API now
  matches all outfield positions (OF, LF, CF, RF) using PostgREST `.in()` filter
- **Timer auto-pick**: Confirmed already working via `useDraftTimer` hook
- **Backlog coverage**: Confirmed all backlog-plan.md items implemented (box
  score, play-by-play, stats, trade evaluation)

## 2026-02-13 - Roster Bug Fixes (Pitcher Slots, Draft Completion)

Three bug fixes for roster and draft management:

- **Pitcher roster slot**: Adding a pitcher via transaction (add/drop/trade)
  now assigns the correct roster slot based on their pitching role (SP ->
  rotation, RP -> bullpen, CL -> closer) instead of always defaulting to
  bench. Applies to both free agent adds and traded players.
- **Draft completion dashboard**: After the draft completes, the league store
  is now refreshed so the dashboard transitions from "Draft in Progress" to
  showing standings, schedule, and simulation controls. Covers all completion
  paths: human final pick, CPU auto-picks, and polling detection.
- **Pitching staff changes**: The 400 error on lineup save (fixed in previous
  hotfix) was also preventing pitcher role changes (rotation/bullpen/closer
  buttons) from persisting. Now resolved.
- 7 new tests for pitcher slot assignment and draft completion league refresh

## 2026-02-13 - Fix Lineup Save 400 Error (Hotfix)

The lineup save PATCH endpoint rejected requests containing 'OF' as a
lineupPosition. Phase 80 added 'OF' as a valid Position type but the Zod
validation schema in `api/leagues/[id]/teams.ts` was not updated to include it.

- Added 'OF' to the `lineupPosition` enum in `LineupUpdateSchema`
- Added test verifying 'OF' is accepted as a valid lineup position

## 2026-02-13 - Draft Modal Text Contrast Review (Phase 89)

Investigation of reported "white textbox with barely visible text" in draft
modals. All draft components use the Ballpark Night dark theme: dark navy
backgrounds (#132337, #0C1B2A) with cream/tan text (#F5F0E6, #BDB5A7).
All color pairs pass WCAG AA+ contrast standards. No contrast issues found
in current codebase -- the issue was resolved by the Phase 82 UI redesign.

## 2026-02-13 - Trade Evaluation Improvements (Phase 88)

Improved trade evaluation scoring, transparency, and team needs awareness.

- Replaced crude card byte sum with stats-based valuation:
  batters use OPS*100 + SB*0.5 + fieldingPct*20; pitchers use
  (4.50-ERA)*30 + K9*5; falls back to card bytes when stats unavailable
- Added 10% value bonus for incoming players that fill a team positional need
- Added per-player value breakdown (`playerBreakdowns`) to evaluation response
  showing raw value, adjusted value, positional premiums, and needs bonuses
- Updated `TradeEvaluationPanel` with manager style badge, percentage-based
  value diff display, and two-column "Giving Up" / "Receiving" breakdown table
- Extended `PlayerBreakdown` type in `ai.ts` with position, premium, needsBonus
- Updated `useTradeEvaluation` hook to expose playerBreakdowns
- 6 new tests: 2 for stats-based valuation, 4 for breakdowns and needs bonus

## 2026-02-13 - Box Score and Play-by-Play Persistence (Phase 86+87)

Box scores and play-by-play data were generated during simulation but discarded
before database persistence. The `compactResult()` function stripped these fields
from `GameResult` to save memory, leaving `game_logs.box_score` and
`game_logs.play_by_play` columns always NULL.

- Added `boxScore` and `playByPlay` fields to `CompactGameResult` interface
- Updated `compactResult()` to preserve box score and play-by-play data
- Updated `simulate-day.ts` to include `box_score` and `play_by_play` as
  JSON-stringified columns in game log entries
- Updated `simulate-playoff-game.ts` to persist box_score and play_by_play
  for playoff games as well
- Created migration `00023_simulate_day_rpc_box_score.sql` to update the
  `simulate_day_commit` RPC function with `box_score` and `play_by_play` columns
- Game detail endpoint (`games/[gid].ts`) already uses `select('*')` so it
  automatically returns the now-populated data
- Updated season-runner test to verify box score and play-by-play are retained
- Updated migration count tests (22 -> 23)

## 2026-02-12 - Player Season Stats Display (Phase 85)

Added individual player season stats viewing. The PlayerProfileModal now has a
"Season" tab (shown during regular season) that fetches and displays the player's
accumulated batting and pitching stats from the simulation.

- Extended stats API (`stats.ts`) with `?type=player&playerId=X` handler using
  `maybeSingle()` query
- Added `fetchPlayerSeasonStats` to `stats-service.ts`
- Added `SeasonStatsTab` component to `PlayerProfileModal` with loading/error states
- Modal accepts optional `leagueId` prop; when provided, the Season tab appears
- RosterPage passes `league.id` to the modal for season stats access
- 3 new API tests for the player stats handler

## 2026-02-12 - Fix Season Stats Accumulation (Phase 84)

Season stats were not tracking at all. The `accumulator.ts` pure logic existed and was
fully tested, but was never called from the simulation pipeline. After each simulated
day, batting and pitching lines were written to `game_logs` but never accumulated into
the `season_stats` table.

- Created `api/_lib/accumulate-season-stats.ts`: fetches existing season stats, runs
  accumulation via pure `accumulateBatting`/`accumulatePitching` functions, upserts
  updated totals back to `season_stats`
- Wired into `api/leagues/[id]/simulate.ts`: called after `simulateDayOnServer` with
  starter pitcher IDs extracted from `DayGameConfig`
- Added `season_year` to league query in simulate endpoint
- 9 unit tests for accumulation function, 2 integration tests for endpoint wiring

## 2026-02-12 - Fix Dashboard Crash: Schedule Row Grouping (Phase 83)

Dashboard crashed with "h.games is not iterable" because the schedule API returns
flat game rows (`{id, dayNumber, homeTeamId, ...}`) but the dashboard expects
`ScheduleDay[]` objects with a `games` array. Added grouping transform in
`fetchSchedule` to convert flat rows into `{dayNumber, games: [...]}` grouped by day.

- `league-service.ts:fetchSchedule` groups flat API rows into `ScheduleDay[]`
- Updated league-service tests to use flat row mock data

## 2026-02-12 - Fix Multiple Closers Not Showing in Pitching Staff (Phase 82b)

When multiple CL-role pitchers were drafted (e.g., Mariano Rivera + Dennis Eckersley),
`generateAndInsertLineups` assigned all of them `roster_slot = 'closer'`. The UI used
`roster.find()` which returns only the first match, making extra closers invisible.

- Server: `generate-lineup-rows.ts` now assigns only the first CL as closer; extras go
  to bullpen
- Client: `RosterPage` uses `roster.filter()` for closers (shows all)
- `PitchingRotation` accepts `closers: RosterEntry[]` array instead of single entry
- Added test for multi-closer lineup generation

## 2026-02-12 - Roster Page Redesign: Batting Order, Lineup Fixes, Pitcher Roles (Phase 82)

Redesigned the roster management page to fix multiple bugs and add missing
functionality:

1. **Batting order reordering**: New BattingOrder component with numbered 1-9 list,
   move up/down arrows, and remove-to-bench button. Added `swapBattingOrder` store
   action to swap lineup order between two starters.
2. **Lineup capped at 9**: Starters filter now uses `rosterSlot === 'starter'` with
   `.slice(0, 9)` instead of `lineupOrder !== null` which incorrectly included
   pitchers and allowed >9 starters.
3. **Diamond shows DH not P**: LineupDiamond position list changed from 'P' to 'DH'
   so the DH slot renders correctly on the field diamond.
4. **Pitcher role management**: PitchingRotation now shows role-change buttons (SP/BP/CL)
   so closers can be moved to bullpen and relievers promoted to rotation. Added
   `changePitcherRole` store action with automatic demotion of current closer.
5. **Bench player position matching**: BenchPanel highlights players who can fill the
   selected diamond position and dims those who cannot. Button text changes
   contextually ("Add to Lineup" vs "Add DH").
6. **New layout**: Diamond + batting order side by side, bench + pitching side by side.

- Rewrote RosterPage, LineupDiamond, BattingOrder, BenchPanel, PitchingRotation
- Added swapBattingOrder and changePitcherRole to rosterStore
- DiamondField supports selectedPosition highlight prop
- Updated all roster feature tests including displacement and position selection tests

## 2026-02-12 - Fix Blank Screen on AuthGuard Routes (Phase 81)

Fixed blank screen when navigating to protected routes (e.g., "Create a League").
AuthGuard returned `null` while Supabase auth initialization was in progress, causing
a blank screen with no visible feedback. Now shows LoadingLedger with "Initializing..."
message during the brief async auth check.

Added 10-second timeout to `getSession()` call in authStore `initialize()`. When
Supabase is unreachable (CORS errors, network issues), the auth client's internal retry
logic can block the promise from ever resolving, leaving the app stuck on
"Initializing..." indefinitely. The timeout ensures the app falls through to the login
page with an error message instead of hanging forever.

- AuthGuard shows LoadingLedger instead of null when `isInitialized` is false
- Auth initialization wraps `getSession()` in `Promise.race` with 10s timeout
- Updated AuthGuard test to verify loading indicator renders
- Added authStore initialize tests (no-session, timeout, valid session)

## 2026-02-12 - Fix Roster Display: OF Labels, Pitcher Categorization, Diamond (Phase 80)

Fixed three roster page bugs:

1. **Outfielders labeled "RF" instead of "OF"**: Lahman Fielding.csv uses generic "OF"
   for most outfielders, but the fielding loader mapped all "OF" to "RF". Now maps to
   "OF" and added 'OF' to the Position type.
2. **Diamond only showed one outfielder**: Lineup generator blindly copied
   `primaryPosition` as the defensive slot, creating duplicate RF entries. Added
   `assignDefensivePositions()` to distribute OF players across LF, CF, RF slots.
3. **Pitchers appeared in Bench panel**: Bench filter used `lineupOrder === null` which
   included pitchers. Changed to `rosterSlot === 'bench'` which correctly excludes
   rotation/bullpen/closer entries.

- Added 'OF' to Position union type
- Lineup generator distributes generic 'OF' players across available outfield slots
- RosterPage resolves 'OF' to first open outfield slot when adding from bench
- Updated fielding-loader, lineup-generator, and useTeam tests

## 2026-02-12 - Draft Pick Responsiveness + Auto-Pick Quality (Phase 79)

Fixed two draft UX bugs: (1) human draft picks took 5-15 seconds to register because
the server synchronously processed all subsequent CPU picks before responding, and
(2) timer-expired auto-picks chose players alphabetically because the client only
evaluated the current page of 50 players sorted by last name.

- Decoupled CPU pick processing from human pick response -- `handlePick` now returns
  immediately after recording the human pick, and the frontend triggers CPU processing
  separately via the auto-pick endpoint
- Moved timer-expired auto-pick logic to server-side using valuation-based AI strategy
  (top 500 players by `valuation_score`) instead of client-side page-1 selection
- Relaxed auto-pick auth from commissioner-only to any league team owner (needed for
  timer-expired picks and post-human-pick CPU processing)
- Added `timerExpired` parameter to auto-pick endpoint to distinguish timer expiry
  from post-pick CPU processing (prevents accidentally auto-picking for the next
  human team)
- Updated DraftBoardPage to use `triggerAutoPick(leagueId, true)` on timer expiry
- Updated draftStore with separate `triggerAutoPick` action and immediate-response
  `submitPick` flow
- Updated tests: 246 files, 2816 tests passing

## 2026-02-12 - Wire Delete League Button into Config Page (Phase 78)

Wired the existing `DeleteLeagueButton` component into `LeagueConfigPage` so
commissioners can delete leagues from the UI (REQ-LGE-010).

- Delete button appears in "Danger Zone" section on League Config page
- Only visible to commissioners of existing leagues (hidden in creation mode)
- Updated `DeleteLeagueButton` modal styles to Ballpark Night theme
- After deletion, navigates to league creation page
- Added 3 new tests for delete button visibility logic

## 2026-02-12 - Fix CPU Draft Alphabetical Bias (Phase 77)

Fixed a bug where CPU teams only drafted players whose last names start with "A".
Root cause: Supabase/PostgREST defaults to returning 1000 rows when no `.limit()`
is specified. With ~55K players inserted alphabetically from CSVs, the AI only
evaluated the first 1000 (all "A" names).

- Added `valuation_score` column to `player_pool` table (migration 00022)
- Pre-compute valuation score during league creation using `calculatePlayerValue()`
- CPU draft query now uses `ORDER BY valuation_score DESC LIMIT 500` so AI sees
  the 500 highest-valued available players across all positions
- Added partial index on `(league_id, valuation_score DESC) WHERE is_drafted = false`
- Backfill SQL for existing leagues using approximate JSONB-based valuation
- Added `valuation` sort option to player list endpoint
- Added tests for mlbBattingStats-based valuation and elite vs average batter spread

## 2026-02-12 - Rich Header Banner (Phase 76)

Redesigned the header from a minimal flat bar into a rich "Stadium Night" banner
with the application title, league name, and decorative baseball stitching.

- Added "BASEBALL LEDGER" as prominent gold app title (Barlow Condensed, wide tracking)
- League name displayed below with gold separator line
- Decorative baseball seam SVGs flanking the title (hidden on small screens)
- Gradient background: deep navy (#081422) to navy (#132337) with subtle gold glow
- Removed status badge text ("SETUP", "regular season") from header
- User info / logout positioned at top-right over the banner
- Navigation strip centered below the banner
- Dashboard page now shows "Dashboard" heading instead of duplicating league name
- Playoff variant: accent-hover gold title when in playoffs

## 2026-02-12 - Baseball Color Palette + League Creation Progress (Phase 75)

### Color Palette: Ballpark Night

Replaced the cold charcoal "Press Box" palette with a warm baseball-inspired
"Ballpark Night" theme. The new palette evokes the warmth of a ballpark under
the lights -- warm navy surfaces, cream text, rich gold accents.

- Surface colors: deep midnight navy (#0C1B2A) through warm navy tiers
- Text: warm cream (#F5F0E6) primary, warm muted (#BDB5A7) secondary
- Accent: rich gold (#D4A843) with bright gold hover (#E4BC5A)
- Semantic: ballpark green success, stitch red danger, classic blue info
- Fixed hardcoded gradient colors in DashboardPage, SimulationNotification,
  and NewSeasonPanel to match new palette

### League Creation Progress Indicator

Added an animated progress bar with stage-specific status messages during
league creation (~60 second process). Replaces the static "Creating..." button
text with a visual progress view.

- Asymptotic progress curve (rises quickly, approaches 95% asymptotically)
- Status messages: Generating teams, Loading player database, Building player
  cards, Populating player pool, Finalizing league setup
- Form hidden during creation, restored on error
- Progress bar with aria attributes for accessibility
- Baseball stitching SVG animation as decorative element
- Jumps to 100% on completion with brief pause before navigation

## 2026-02-12 - Simplify Setup Dashboard (Phase 74)

Redesign the initial setup dashboard to be less busy and more focused.

- Replaced verbose 32-team division-by-division roster dump with compact overview
- Added summary stats bar (teams, leagues, divisions, players at a glance)
- Added user team highlight card with league/division info
- AL/NL league tabs -- only one league visible at a time (halves vertical space)
- Compact 4-column division grid with team names only
- Removed CPU badge noise -- only show badges for player-controlled teams
- Hidden empty standings table and "No games scheduled" during setup phase

## 2026-02-12 - Dark Theme Form Input Fix (Phase 73b)

Fix form inputs and backgrounds that were unreadable in the dark theme due to
the `old-lace` Tailwind alias mapping to a light color (#E8EAED) -- correct for
text use but wrong for background use.

- Changed `old-lace` alias from `var(--text-primary)` to `var(--surface-raised)`
  so `bg-old-lace` renders as a dark surface
- Replaced all `text-old-lace` usages with `text-ink` (both resolve to light text)
- Added `bg-surface-overlay` to Input and Select components for dark input fields
- Fixed Toggle knob to use explicit light color instead of `bg-old-lace`
- Fixed LoginPage inline inputs with dark background and light text
- Changed standalone page backgrounds (Splash, Login, 404) to `bg-surface-base`

## 2026-02-12 - Complete UI/UX Redesign: Press Box Theme (Phase 73)

### Phase 73: Modern editorial sports design overhaul

Complete redesign replacing the inconsistent vintage/legacy dual design system
with a cohesive dark theme inspired by premium sports journalism (The Athletic,
ESPN+ longform, SI editorial layouts).

**Design System (3 core files rewritten):**
- New color palette: dark charcoal surfaces (#0F1419, #1A1F26, #242B35), warm
  amber accent (#E6A817), semantic colors for success/danger/warning/info
- New typography: Barlow Condensed (headlines), DM Sans (body), IBM Plex Mono
  (stats/monospace) -- replacing Archivo Black, Oswald, Source Sans, Roboto Slab
- Removed all texture patterns (paper grain, stitch pattern, wood grain)
- Simplified shadows and borders for clean dark aesthetic
- Legacy CSS variable aliases maintained for backward compatibility

**Layout cleanup:**
- AppShell: Removed paper texture overlay, leather spine, binding shadow
- Header: Dark surface background, accent border on playoffs, clean nav links
- Footer: Updated to use new border and text tokens

**Component updates (~50 files):**
- All feature pages updated (Dashboard, Draft, Game Viewer, Roster, Stats,
  Standings, Playoffs, Archive, Transactions, League Config)
- All shared components updated (forms, feedback, data-display, baseball)
- Removed decorative baseball SVGs and ornamental divs
- Cleaned up inline style gradients with hardcoded vintage colors
- Replaced var(--color-ballpark) and var(--color-sandstone) references
- Added Tailwind aliases for legacy color names (ballpark, old-lace, sandstone,
  stitch-red) to ensure full backward compatibility

**Font files:**
- Added: barlow-condensed-latin.woff2, dm-sans-latin.woff2,
  ibm-plex-mono-latin.woff2
- Retained old fonts for any remaining references

**Tests:** All 2,802 tests passing across 246 test files.

## 2026-02-12 - Fix Redesign Build Errors + Test Failures (Phase 72b)

### Phase 72b: Resolve missing assets and 44 broken tests from Gemini redesign

The Phase 72 redesign introduced font references, CSS variable names, and
component text changes that broke the build and test suite.

**Missing font files:**
- Downloaded `source-sans-3-latin.woff2`, `archivo-black-latin.woff2`, and
  `oswald-latin.woff2` from Google Fonts into `public/fonts/`

**Missing CSS variable:**
- Added `--color-scoreboard-green` alias (= `--color-scoreboard`) to both
  light and postseason theme in `globals.css`

**Test fixes (44 failures across 20 files):**
- Updated text assertions to match new vintage-styled headings, labels, and
  component structure throughout dashboard, draft, layout, and config tests
- Updated architecture test for new components that use named exports
- Updated migration count tests for new SQL migration files
- Updated font test: Google Fonts import is now expected (used as fallback)
- Updated responsive tests for new AppShell/Header class names

## 2026-02-11 - Vintage Baseball UI Redesign (Phase 72)

### Phase 72: Golden Era Ballpark aesthetic overhaul

Complete UI redesign capturing the essence of vintage baseball with a 1940s-60s
"Golden Era Ballpark" aesthetic. All components updated with scoreboard styling,
leather textures, gold accents, and period-appropriate typography.

**Design System (globals.css, fonts.css):**
- New color palette: scoreboard green, aged cream, leather brown, stitch red, championship gold
- Custom CSS properties for consistent theming across all components
- Vintage font stack: Archivo Black (headlines), Oswald (stats), JetBrains Mono (scoreboard numerals)
- Component classes: `.vintage-card`, `.scoreboard-panel`, `.pennant-header`, `.btn-vintage-primary`
- Animations: `animate-glow` for urgency states, gold-glow text effects

**Draft Board Components:**
- `PickTimer.tsx`: Scoreboard-style countdown with glow effects for urgency
- `DraftTicker.tsx`: Vintage scrolling pick feed with gold accents and position badges
- `RosterPreviewPanel.tsx`: Lineup card with position groupings (infield/outfield/pitching)
- `AvailablePlayersTable.tsx`: Box score styled player table with vintage inputs/pagination
- `DraftBoardPage.tsx`: Full vintage layout with decorative baseball icons

**Dashboard Components:**
- `SimulationControls.tsx`: Press box control panel with scoreboard numerals
- `ResultsTicker.tsx`: Stadium ticker-tape results feed with winner highlighting
- `ScheduleView.tsx`: Vintage scorecard game display
- `SeasonCompletePanel.tsx`: Championship trophy card with gold stars
- `NewSeasonPanel.tsx`: Opening day announcement with baseball icon
- `TeamSetupPanel.tsx`: Vintage program roster display with AL/NL badges
- `PlayoffStatusPanel.tsx`: October baseball bracket with trophy icon
- `SimulationNotification.tsx`: Press box ticker notification with typewriter effect
- `DashboardPage.tsx`: Full ballpark dashboard with decorative header

**PlayerProfileModal.tsx (previously completed):**
- Vintage baseball card design with leather header
- Tab-based Card Ratings / MLB Stats views
- Position badges with pitching/fielding distinction
- Gold-accented rating bars

## 2026-02-11 - Fix Draft Board Infinite Refresh Loop (Phase 71b)

### Phase 71b: Stop draft board from refreshing every second

The AvailablePlayersTable's search debounce `useEffect` fired on mount with
an empty string, triggering a fetch. Each fetch set `isLoading = true` in the
store, which caused the DraftBoardPage to unmount the entire page and show
`LoadingLedger`. On remount, the initial-load effect fired again, creating an
infinite loop.

- **AvailablePlayersTable**: Use `useRef` to skip debounce effect on first
  render. Use a ref for `onFilterChange` callback to avoid stale closures
  without re-triggering the debounce effect.
- **draftStore**: `fetchAvailablePlayers` no longer sets `isLoading = true`
  since player fetches are background updates.
- **DraftBoardPage**: Loading spinner only shows when no data has loaded yet
  (`!draftState && availablePlayers.length === 0`).

## 2026-02-11 - Server-Side Pagination for Draft Player Pool (Phase 71)

### Phase 71: Full player pool browsing with server-side pagination

Previously only 500 of ~55,686 players loaded into the draft board. Converted
the AvailablePlayersTable from client-side filtering/sorting to server-driven
pagination with Prev/Next controls.

**Backend (`api/leagues/[id]/draft.ts`):**
- Added secondary sort by `season_year` when primary sort is `nameLast` or
  `primaryPosition` for stable ordering within groups

**Frontend:**
- `AvailablePlayersTable`: Server-driven with `onFilterChange` callback. Search
  debounced (300ms), position filter and sort headers trigger server refetch.
  Prev/Next pagination controls. Names display as "Last, First". Removed all
  client-side filtering/sorting logic.
- `draftStore`: Default pageSize reduced from 500 to 50, default sort set to
  `nameLast` ascending. Tracks `playerCurrentPage` and `playerPageSize`.
- `DraftBoardPage`: Added `handleFilterChange` callback wiring table events to
  `fetchAvailablePlayers`. Passes pagination state to table.
- `useDraft`: Exposes `playerCurrentPage` and `playerPageSize` from store.

## 2026-02-11 - Dashboard Drafting Panel + Pool Batch Fix (Phase 70)

### Phase 70: Drafting phase UX gap + player pool reliability

After clicking "Start Draft", the dashboard transitioned to `drafting` status but
had no handler for that phase -- users saw only standings with no guidance. Also,
player pool batch inserts could fail silently on large JSONB payloads.

**Dashboard (`DashboardPage.tsx`):**
- Added `drafting` phase panel with "Draft In Progress" heading and link to
  Draft Board page, displayed between setup and regular_season phases
- "Start Draft" now navigates directly to the Draft Board after starting
- Fixed "Go to Draft Board" link: was `/draft` (404), now uses relative
  `navigate('draft')` which resolves to `/leagues/:leagueId/draft`

**Player pool reliability (`api/leagues/index.ts`):**
- Reduced BATCH_SIZE from 1000 to 200 to avoid Supabase payload limits with
  large PlayerCard JSONB objects
- Added per-batch success/failure logging with counts for diagnostics
- Logged pipeline card count, pool entries, and errors at generation time

## 2026-02-11 - CPU Auto-Drafting + Player Pool Fix (Phase 69)

### Phase 69: CPU teams auto-draft + player pool display improvements

CPU teams did not pick automatically during the draft. After clicking "Start
Draft", the board showed "Waiting for [CPU team]..." indefinitely because no
backend mechanism triggered CPU picks. Additionally, the player pool table only
showed ~100 players (default page size).

**Backend (`api/leagues/[id]/draft.ts`):**
- New `processCpuPicks()` helper: loops through consecutive CPU team turns,
  selects best available player via APBA card scoring (`selectBestAvailable`),
  inserts roster entry, marks player as drafted
- `handleStart` now calls `processCpuPicks` after setting draft status, so
  initial CPU picks happen before returning to the frontend
- `handlePick` calls `processCpuPicks` after each human pick, processing all
  subsequent CPU team turns before responding
- `handleAutoPick` is no longer a stub -- actually processes CPU picks

**Frontend:**
- `draftStore.submitPick` refetches draft state + available players after each
  pick (ensures UI reflects all CPU auto-picks processed server-side)
- Default player pool page size increased from 100 to 500
- `fetchAvailablePlayers` now returns pagination metadata (`totalRows`)
- `AvailablePlayersTable` shows "Showing X of Y" count for diagnostics
- `DraftBoardPage` polls draft state every 5s when waiting for CPU teams
  (edge case recovery)

**Files changed:** `api/leagues/[id]/draft.ts`, `draftStore.ts`,
`draft-service.ts`, `DraftBoardPage.tsx`, `AvailablePlayersTable.tsx`,
`useDraft.ts`, `TransactionsPage.tsx`

**Test count:** 2,799 across 246 files (all passing). TypeScript clean.

## 2026-02-11 - League Setup Workflow (Phase 68)

### Phase 68: Auto-generate teams on league creation + setup dashboard

After creating a league, no teams existed because the team generation logic
(`generateTeamNames`, `assignDivisions`) was never called from the API. Users
saw only an invite key and sim buttons with no way to proceed to draft.

**Backend (`api/leagues/index.ts`):**
- Wire `generateTeamNames()` + `assignDivisions()` into `POST /api/leagues`
- Auto-generate N teams with random city/mascot pairs and AL/NL divisions
- Rotate manager profiles (balanced, conservative, aggressive, analytical)
- Auto-assign first team to commissioner (REQ-LGE-007)

**Frontend:**
- New `TeamSetupPanel` component shows all teams by division during setup phase
- Each team displays ownership badge: You / Player / CPU
- Invite key integrated into the panel
- Commissioner sees "Start Draft" button
- Sim controls hidden during setup/drafting phases (no schedule to simulate)
- Added `startDraft()` to league-service.ts

**Files changed:** `api/leagues/index.ts`, `TeamSetupPanel.tsx` (new),
`DashboardPage.tsx`, `league-service.ts`

**Test count:** 2,799 across 246 files (all passing). TypeScript clean.

## 2026-02-11 - Navigation + Hooks Fix (Phase 67)

### Phase 67: Show full navigation in all league phases + fix React error #300

Navigation bar was completely hidden during `setup` and `draft` phases because
the Header component only rendered nav links when `leagueStatus` was in
`regular_season`, `playoffs`, or `offseason`. Users could not navigate to any
pages (Draft Board, Roster, Stats, etc.) after creating a league.

**Navigation fixes:**
- Removed `ACTIVE_STATUSES` gate -- navigation is now always visible regardless
  of league phase (setup, draft, regular_season, playoffs, offseason).
- Added missing nav items: Draft Board, Playoffs, Transactions, Archive.
- Fixed League Config route from `/league-config` to `/config` (matching the
  actual router path).
- Hamburger menu now always available on narrow viewports.

**React error #300 fix (DraftBoardPage):**
- `useState` and `useMemo` hooks were called after an early `return` for
  loading state, violating React's Rules of Hooks ("Rendered fewer hooks
  than expected"). Moved all hooks above the early return.

**Files changed:** `Header.tsx`, `Header.test.tsx`, `responsive.test.tsx`,
`DraftBoardPage.tsx`

**Test count:** 2,792 across 245 files (all passing). TypeScript clean.

## 2026-02-11 - Vercel Serverless Fix + Form Improvements (Phase 66)

### Phase 66: Fix FUNCTION_INVOCATION_FAILED on Vercel

All API endpoints were returning 500 FUNCTION_INVOCATION_FAILED on Vercel.
Three cascading issues were identified and fixed through systematic diagnosis.

**Root causes (in order of discovery):**

1. **tsconfig path aliases**: `@lib/*` imports compiled but were not resolved by
   Vercel's function builder at runtime. Converted all 79 `@lib/*` imports to
   relative paths across 37 files (25 in `api/`, 12 in `src/lib/`).

2. **api/tsconfig.json module settings**: Changed from `ESNext`/`bundler` to
   `CommonJS`/`node` for compatibility with `@vercel/node`'s TypeScript compiler.

3. **"type": "module" in package.json** (the actual root cause): `@vercel/node@5.x`
   compiles TypeScript to CJS (`require()`/`exports`) and deploys individual files
   (not a single bundle). The root `"type": "module"` told Node.js to treat the
   compiled `.js` files as ESM, causing `require is not defined in ES module scope`.
   Removed `"type": "module"` from root package.json. Vite and vitest handle modules
   internally and do not depend on this field.

**Other changes:**
- **League form**: Team count options now 4, 8, 16, 24, 32 (was 4, 6, 8).
  Year range defaults to 1901-2025 with proper validation bounds.
- **vercel.json**: Added `includeFiles: "data_files/**"` for CSV data bundling.
- **api/package.json**: Added `"type": "commonjs"` as explicit CJS marker.
- **Health endpoint**: `GET /api/health` for production monitoring.

**Diagnosis method**: Used `vercel build` locally to inspect compiled output,
confirmed CJS syntax in `.js` files conflicting with ESM `"type": "module"`.

**Test count**: 2,792 across 245 files (all passing). TypeScript clean.

## 2026-02-11 - Production App Wiring (Phase 65)

### Phase 65: Fix Create League + Join League flows for production

Critical fixes to make the deployed app functional at baseball-ledger.vercel.app.

- **Auth initialization**: App.tsx now calls `authStore.initialize()` on mount.
  Without this, `isInitialized` stayed false and AuthGuard rendered nothing.
- **SPA navigation**: SplashPage and NotFoundPage use React Router `Link`
  instead of `<a href>` to avoid full page reloads.
- **Join league API**: New `POST /api/leagues/join` endpoint looks up league by
  invite key (users only have the invite code, not the league UUID).
- **Join league frontend**: `leagueService.joinLeague()` takes a single invite
  key argument; JoinLeaguePage navigates to `/leagues/{id}/dashboard` on success.
- **AuthenticatedLayout**: Replaced mock data with real league data from
  leagueStore. Reads `:leagueId` from URL params and fetches on mount.
  Header shows actual league name, status, user name, and commissioner flag.
  Navigation and logout are wired.
- **JoinLeagueResult type**: Added `leagueId` field returned by new join endpoint.

**Test count**: 2,792 across 245 files (all passing). TypeScript clean.

## 2026-02-11 - Supabase Deployment + Type Generation (Phase 64)

### Phase 64: Supabase Cloud deployment and auto-generated types

Linked project to Supabase Cloud, pushed all 20 migrations, and switched to
auto-generated database types from the live schema.

- **Supabase Cloud**: Linked project `kdqptbbfhdopfujmwlws`, pushed migrations 00001-00020
- **Migration 00020**: Added `draft_order JSONB` column to leagues (REQ-DFT-001)
- **Auto-generated types**: `npm run db:types` now generates `src/lib/types/database.ts` from live schema
  - All 10 tables present: archives, game_logs, leagues, player_pool, rosters, schedule, season_stats, simulation_progress, teams, transactions
  - Custom type aliases (`PlayerPoolRow`, `TransactionRow`) appended after generation
- **API type fixes**: Stricter `Json` type from auto-generated types required `as unknown as Json` casts
  - Fixed: `api/leagues/index.ts`, `api/leagues/[id]/teams.ts`, `api/leagues/[id]/archive.ts`, `api/leagues/[id]/draft.ts`
  - Fixed: `src/lib/transforms/transaction-transform.ts` type narrowing
- **Migration count tests**: Updated from 19 to 20 in cascade-delete and unique-owner tests

**Test count**: 2,792 across 245 files (all passing). TypeScript clean.

## 2026-02-11 - pgTAP Full Coverage + CI Migration Validation (Phase 63)

### Phase 63: REQ-MIG-009, REQ-MIG-012, REQ-MIG-013, REQ-TEST-018

Completes all code-level pgTAP test coverage, adds CI migration validation,
and provides Supabase CLI tooling for deployment workflow.

- **REQ-MIG-009: Full pgTAP coverage** (all 8 RLS-enabled tables)
  - New: `player_pool_rls.test.sql` (6 assertions: SELECT for members, no INSERT/UPDATE/DELETE for authenticated)
  - New: `transactions_rls.test.sql` (8 assertions: SELECT for members, INSERT for owner only, no UPDATE/DELETE)
  - Total: 54 pgTAP assertions across 8 test files (was 40 across 6)
  - 2 structural tests: every RLS table has test file + test file format validation

- **REQ-MIG-012: CI migration validation**
  - Added conditional `supabase db push --dry-run` step to `.github/workflows/ci.yml`
  - Activates when `SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD` secrets are configured

- **REQ-MIG-013: Type generation tooling**
  - `npm run db:types` runs `supabase gen types typescript --linked > src/lib/types/database.ts`

- **Supabase CLI config**: Created `supabase/config.toml` for CLI tooling
- **npm scripts**: `db:test`, `db:types`, `db:push`, `db:push:dry` (4 new, 4 test assertions)

**Test count**: 2,792 across 245 files (all passing). TypeScript clean.

## 2026-02-11 - PROJECT_STATUS Docker Cleanup (Phase 62)

### Phase 62: Documentation cleanup

Removed Docker references from PROJECT_STATUS.md per user clarification.
Infrastructure uses Supabase Cloud + Vercel only (no Docker).

- Reframed "What Still Needs Work" section for Supabase Cloud workflow
- Replaced Docker-based pgTAP testing with `supabase db test`
- Replaced Docker-based type generation with `supabase gen types typescript`
- Replaced Docker-based CI migration validation with `supabase db push --dry-run`
- Full SRD gap analysis confirmed: all code-level requirements complete (209/213, 4 are infra-only)

## 2026-02-11 - Arrow Key Navigation + Global API Error Handler (Phase 61)

### Phase 61: REQ-COMP-012, REQ-ERR-009

Closes two remaining code-level SRD gaps: DiamondField keyboard navigation
and a defense-in-depth API error handler wrapper.

- **REQ-COMP-012: DiamondField Arrow key navigation**
  - Added ArrowRight/ArrowDown to cycle to next position, ArrowLeft/ArrowUp for previous
  - Wraps from last (DH) to first (C) and vice versa
  - Uses refs for direct focus management within the SVG position markers
  - 5 new component tests (Enter activation + 4 arrow key navigation)

- **REQ-ERR-009: `withApiHandler` global error wrapper**
  - Created `api/_lib/with-api-handler.ts`: generates requestId, wraps handler in try/catch
  - Logs at ERROR level with requestId and operation context on unhandled errors
  - Returns structured 500 ApiErrorResponse via `handleApiError()`
  - 6 new unit tests + 2 structural tests (wrapper exists, all handlers import handleApiError)

**Test count**: 2,786 across 245 files (all passing). TypeScript clean.

## 2026-02-11 - Simulation Gaps + Performance Benchmark (Phase 60)

### Phase 60: REQ-SIM-011, REQ-NFR-002, REQ-COMP-008

Closes the last simulation gap (pitcher removal trigger #4), adds a full-season
performance benchmark, and verifies dashboard loading/progress composition.

- **REQ-SIM-011 trigger #4: Blowout deficit pitcher removal**
  - Added `runDeficit` field to `PitcherGameState` interface
  - Implemented trigger #4 in `shouldRemoveStarter()`: losing by 5+ after 6th
  - Game runner now updates `runDeficit` on pitcher state before pull checks
  - 4 new tests: deficit >= 5 after 6th triggers, < 5 or <= 6th inning does not

- **REQ-NFR-002: Full season benchmark test**
  - Created `tests/unit/lib/simulation/benchmark-season.test.ts`
  - Simulates 1,296 games (16 teams x 162 days x 8 games/day)
  - Asserts < 60s wall-clock time; reports throughput (games/sec)
  - Result: ~0.12s, ~10,800 games/sec on local machine

- **REQ-COMP-008: Dashboard loading/progress structural tests**
  - 3 new architecture tests verifying DashboardPage integrates LoadingLedger
    and SimulationControls with accessible progressbar (ARIA attributes)

**Test count**: 2,773 across 244 files (all passing). TypeScript clean.

## 2026-02-11 - Coverage Close-Out + Meta-Tests (Phase 59)

### Phase 59: REQ-COMP-011, REQ-TEST-010

Closes out all locally-implementable SRD requirements. CSS animation
structural tests, REQ-* traceability meta-tests, and coverage reclassification
for design decisions (REQ-API-011, REQ-NFR-008, REQ-NFR-020).

- **Created `tests/unit/config/css-animations.test.ts`** (5 tests)
  - REQ-COMP-011: stamp-slam + cursor-blink keyframes, prefers-reduced-motion
  - REQ-COMP-002: Postseason theme data-theme attribute

- **Created `tests/unit/config/req-coverage.test.ts`** (4 tests)
  - REQ-TEST-010: Validates TRACEABILITY.md covers all 21 SRD requirement categories
  - Verifies 100+ requirement-to-test mappings and 50+ test file references

- **Coverage reclassification**:
  - REQ-API: 11/11 Done (REQ-API-011 replaced by REQ-NFR-021 chunked sim)
  - REQ-NFR: 21/21 Done (REQ-NFR-008 worker exists, REQ-NFR-020 infra ready)
  - Remaining gaps are infrastructure-dependent only (MIG-009/010/011/012/013)

## 2026-02-11 - API Contracts + Env Completeness + Fixture Metadata (Phase 58)

### Phase 58: REQ-API-009, REQ-API-010, REQ-ENV-001, REQ-ERR-014, REQ-TEST-009

Completes API contract verification, environment variable inventory, and test
fixture metadata. Comprehensive traceability backfill for 20+ requirements
across API, ENV, ERR, TEST, RST, SCOPE, and MIG categories.

- **Fixed REQ-ENV-001**: Added `VITE_API_BASE_URL` to `.env.example` and `vite-env.d.ts`
  - Was used in `api-client.ts` but undocumented; optional with empty-string default

- **Fixed REQ-TEST-009**: Added `_meta` exports to all 6 fixture files
  - Each `_meta` includes: description, usedBy (test file paths), requirements (REQ-* IDs)

- **Created `tests/unit/config/api-contracts.test.ts`** (7 tests)
  - REQ-API-009: Response helpers (ok, created, paginated) exist and are used
  - REQ-API-010: ApiResponse and PaginatedResponse interfaces exist
  - REQ-ENV-001: All VITE_ vars in vite-env.d.ts appear in .env.example
  - REQ-ERR-014: Logger exports INFO, WARN, ERROR levels
  - REQ-TEST-009: All fixture files export _meta with required fields

- **TRACEABILITY.md**: 20+ entries backfilled (REQ-API-009/010, REQ-ENV-001/004, REQ-ERR-006/008/014/020, REQ-TEST-002/007/009/010, REQ-RST-006, REQ-SCOPE-001/006, REQ-MIG-001/004/005/006)

## 2026-02-11 - Secrets Management + Migration Standards (Phase 57)

### Phase 57: REQ-ENV-009, REQ-ENV-010, REQ-MIG-002, REQ-MIG-003, REQ-MIG-007, REQ-MIG-008

Completes all REQ-ENV requirements (10/10) with secrets management documentation
and API key rotation policy. Adds structural tests for migration file standards
including naming, headers, seed data, and idempotency.

- **Created `docs/secrets-management.md`**
  - REQ-ENV-009: Three-environment secret storage locations (local, staging, production)
  - REQ-ENV-010: Rotation procedures for SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, SUPABASE_DB_URL

- **Created `tests/unit/migrations/migration-standards.test.ts`** (8 tests)
  - REQ-MIG-002: 5-digit sequential prefix + snake_case naming verification
  - REQ-MIG-003: Header comment block (Migration, Purpose, Author, Date, Depends)
  - REQ-MIG-007: seed.sql contains all required data categories
  - REQ-MIG-008: All INSERT statements use ON CONFLICT for idempotency

- **Updated `tests/unit/config/environment.test.ts`** (+3 tests, now 12 total)
  - REQ-ENV-009: Verifies secrets-management.md documents all environments and secrets
  - REQ-ENV-010: Verifies rotation policy documentation exists

- **Fixed migration headers**: 00015, 00016, 00017 now conform to REQ-MIG-003 standard

- **Cleaned up PROJECT_STATUS.md**: Removed stale completed items, REQ-NFR updated to 19/21, REQ-ENV now 10/10 Done

## 2026-02-11 - Architecture + Scope + Environment Verification (Phase 56)

### Phase 56: Structural Tests + Traceability Backfill (REQ-ARCH, REQ-SCOPE, REQ-ENV, REQ-TEST-011)

Adds 28 structural tests verifying architectural rules, code scoping,
and environment configuration. Comprehensive traceability matrix update
covering 80+ previously-untracked implemented requirements.

- **Created `tests/unit/config/architecture.test.ts`** (14 tests)
  - REQ-ARCH-001: 7 layer directories verified
  - REQ-ARCH-002: No upward imports (stores->features, services->stores, lib->services)
  - REQ-ARCH-003: 7 path aliases in tsconfig.json
  - REQ-ARCH-004: Naming conventions (PascalCase components, use*.ts hooks, *Store.ts stores)
  - REQ-ARCH-005: File size limits by layer (stores<300, services<200, hooks<200, lib<1000)

- **Created `tests/unit/config/scope-rules.test.ts`** (5 tests)
  - REQ-SCOPE-003: No cross-feature imports
  - REQ-SCOPE-005: Fixed-home artifacts in correct locations
  - REQ-SCOPE-002: Feature-scoped hooks naming
  - REQ-SCOPE-007: Test directory mirrors source structure

- **Created `tests/unit/config/environment.test.ts`** (9 tests)
  - REQ-ENV-002: .env.example exists with all vars, no real credentials
  - REQ-ENV-003/005: Client and server config modules exist
  - REQ-ENV-006: vite-env.d.ts declares ImportMetaEnv
  - REQ-ENV-007: vercel.json with rewrites and headers
  - REQ-ENV-008: .gitignore excludes .env.local but not .env.example

- **Promoted `InviteKeyDisplay`** from `features/league/` to `components/data-display/`
  - REQ-SCOPE-004: Had 2 consumers (LeagueConfigPage + DashboardPage)
  - Updated imports in both consumers and test file

- **Updated `tests/TRACEABILITY.md`**: 80+ requirement entries backfilled
  - Covers REQ-AUTH, REQ-AI, REQ-DATA, REQ-DFT, REQ-ERR, REQ-LGE, REQ-RST,
    REQ-SCH, REQ-SIM, REQ-STATE, REQ-NFR, REQ-TEST, REQ-UI

**Tests:** 2,738 tests across 239 files (28 new)

## 2026-02-11 - Pagination Fix + DB Constraint + Traceability (Phase 55)

### Phase 55: pageSize Alignment (REQ-NFR-019), One-User-Per-Team (REQ-LGE-007), Playoff Enforcement (REQ-LGE-009)

Fixes client/server pagination mismatch, adds database-level constraint for
team ownership, and adds explicit REQ-LGE-009 enforcement test.

- **Modified `src/stores/statsStore.ts`**
  - Fixed `pageSize: 25` -> `pageSize: 50` to match API `PAGE_SIZE = 50` (REQ-NFR-019)
  - Bumped persist version from 1 to 2 (migration falls back to new default)

- **Created `supabase/migrations/00019_unique_owner_per_league.sql`**
  - Partial unique index on `(league_id, owner_id) WHERE owner_id IS NOT NULL`
  - Prevents user from owning multiple teams in same league (REQ-LGE-007)
  - NULL owner_id (CPU teams) correctly excluded from constraint

- **Created `tests/unit/migrations/unique-owner-per-league.test.ts`** (3 tests)
  - Verifies unique index exists on teams table
  - Verifies partial WHERE clause for non-null owner_id
  - Verifies migration file count is 19

- **Modified `tests/unit/api/leagues/[id]/simulate.test.ts`** (1 new test)
  - Explicit REQ-LGE-009 test: playoff simulation returns exactly one game per call

- **Modified `tests/unit/stores/statsStore.test.ts`** (2 new tests)
  - `pageSize matches API PAGE_SIZE constant (REQ-NFR-019)`: verifies 50
  - `persist config is at version 2`: verifies migration version bump

- **Updated `tests/TRACEABILITY.md`** through Phase 55
- **Updated `docs/PROJECT_STATUS.md`** traceability reference

**Tests:** 2,710 tests across 236 files (6 new)

## 2026-02-11 - Auth Lifecycle + npm Scripts Verification (Phase 54)

### Phase 54: Auth Lifecycle (REQ-STATE-015) + npm Scripts Verification (REQ-TEST-018)

Completes the auth lifecycle flow per REQ-STATE-015 and adds structural
validation of required npm scripts per REQ-TEST-018.

- **Modified `src/stores/authStore.ts`**
  - `initialize()` with session: triggers background refetch of leagueStore
    and rosterStore when persisted IDs exist
  - `initialize()` no session: resets all cached stores (league, roster, stats)
  - `onAuthStateChange` signout: resets all stores (league, roster, stats, simulation)

- **Modified `tests/unit/stores/authStore-async.test.ts`** (4 new tests)
  - Session + persisted leagueId triggers background fetchLeagueData + fetchRoster
  - Session + no teamId skips roster refetch
  - No session clears all cached stores
  - onAuthStateChange signout resets all stores

- **Created `tests/unit/config/npm-scripts.test.ts`** (7 tests)
  - Verifies all 7 SRD-required test scripts exist with correct commands

**Tests:** 2,704 tests across 235 files (11 new)

## 2026-02-11 - Cache Invalidation (Phase 53)

### Phase 53: Stale-While-Revalidate Cache Invalidation (REQ-STATE-011, REQ-STATE-012)

Implements the full cache invalidation trigger table from the SRD. Each of
the 3 persisted stores (leagueStore, rosterStore, statsStore) now has
`isStale`, `invalidateCache`, and `clear` actions. Cross-store triggers
ensure caches are invalidated at the correct moments.

- **Modified `src/stores/leagueStore.ts`**
  - Added `isStale: boolean` to state
  - Added `invalidateLeagueCache()`: sets isStale, triggers background refetch
  - Added `clearLeague()`: full state reset
  - `setActiveLeague()` now clears dependent roster and stats stores
  - `fetchLeagueData` clears isStale on success

- **Modified `src/stores/rosterStore.ts`**
  - Added `isStale: boolean` to state
  - Added `invalidateRosterCache(leagueId)`: sets isStale, triggers background refetch
  - Added `clearRoster()`: full state reset
  - `saveLineup()` success triggers `invalidateStatsCache()` on statsStore
  - `fetchRoster` clears isStale on success

- **Modified `src/stores/statsStore.ts`**
  - Added `isStale: boolean` to state
  - Added `invalidateStatsCache(leagueId)`: sets isStale, triggers parallel refetch of all 3 stat types
  - Added `clearStats()`: clears data but preserves UI preferences (activeTab, leagueFilter, statView, pageSize)
  - `fetchBattingLeaders` clears isStale on success

- **Modified `src/stores/simulationStore.ts`**
  - `runSimulation` completion now calls invalidateLeagueCache, invalidateRosterCache, invalidateStatsCache

- **Modified `src/stores/authStore.ts`**
  - `logout` now calls reset on all 4 dependent stores (league, roster, stats, simulation)

- **Created `tests/unit/stores/cache-invalidation.test.ts`** (5 tests)
  - Simulation completion triggers refetch on league, roster, stats
  - saveLineup success triggers stats refetch; failure does not
  - setActiveLeague clears roster and stats
  - logout resets all stores

- **Modified store sync tests** (7 new tests across 3 files)
  - leagueStore: isStale default, clearLeague, reset clears isStale
  - rosterStore: isStale default, clearRoster, reset clears isStale
  - statsStore: isStale default, clearStats preserves UI prefs, reset clears isStale

- **Modified store async tests** (11 new tests across 3 files)
  - invalidateLeagueCache triggers refetch, preserves stale data, no-op without ID
  - invalidateRosterCache triggers refetch, preserves stale data, no-op without ID
  - invalidateStatsCache triggers refetch, preserves stale data
  - fetchLeagueData/fetchRoster/fetchBattingLeaders clear isStale on success

**Tests:** 2,693 tests across 234 files (25 new)

## 2026-02-11 - DevTools Conditional + Responsive SimControls + WARN Logging (Phase 52)

### Phase 52: Store DevTools Conditional (REQ-STATE-016), SimulationControls Responsive (REQ-COMP-010), Fallback WARN Logging (REQ-ERR-018)

Three polish items closing out remaining gaps in state management, responsive
design, and error logging requirements.

- **Modified all 6 stores** (`authStore`, `leagueStore`, `rosterStore`, `simulationStore`, `statsStore`, `draftStore`)
  - Added `enabled: import.meta.env.DEV` to devtools middleware options
  - DevTools middleware is now stripped from production builds (REQ-STATE-016)

- **Modified `src/features/dashboard/SimulationControls.tsx`**
  - Added `max-md:grid max-md:grid-cols-2` to button container
  - Sim Day / Week / Month / Season render as 2x2 grid on narrow viewports (REQ-COMP-010)

- **Modified `src/stores/storage-factory.ts`**
  - Added `console.warn()` call when falling back to in-memory storage (REQ-ERR-018)

- **Created `tests/unit/stores/devtools-conditional.test.ts`** (6 tests)
  - Structural test reads each store source and verifies `enabled: import.meta.env.DEV`

- **Modified `tests/unit/stores/storage-factory.test.ts`** (1 new test)
  - Verifies WARN logged with "Browser storage unavailable" message on fallback

- **Modified `tests/unit/features/dashboard/SimulationControls.test.tsx`** (1 new test)
  - Verifies `max-md:grid max-md:grid-cols-2` classes on button container

**Tests:** 2,668 tests across 233 files (8 new)

## 2026-02-11 - localStorage Fallback Warning + Traceability (Phase 51)

### Phase 51: localStorage Fallback Warning (REQ-STATE-010) + Traceability Update (REQ-TEST-011)

Completed REQ-STATE-010 by adding `isMemoryFallback()` detection to the
storage factory and displaying a WARN-severity ErrorBanner in
AuthenticatedLayout when localStorage is unavailable.

- **Modified `src/stores/storage-factory.ts`**
  - Added `isMemoryFallback()` export: returns true when createSafeStorage
    fell back to in-memory Map storage
  - Added `resetStorageState()` for test cleanup

- **Modified `src/features/auth/AuthenticatedLayout.tsx`**
  - Imports `isMemoryFallback` from storage factory
  - Conditionally renders ErrorBanner with severity "warning" and message
    "Browser storage unavailable -- data will not persist between sessions."

- **Modified `tests/unit/stores/storage-factory.test.ts`** (3 new tests)
  - `isMemoryFallback` returns false when localStorage is available
  - `isMemoryFallback` returns true when localStorage throws SecurityError
  - Memory fallback storage still works correctly (get/set/remove)

- **Created `tests/unit/features/auth/AuthenticatedLayout.test.tsx`** (2 tests)
  - No storage warning when localStorage is available
  - WARN-severity ErrorBanner shown when localStorage is unavailable

- **Updated `tests/TRACEABILITY.md`**
  - Added entries for Phases 45-51
  - Added REQ-ERR-015/016 client retry cross-reference

**Tests:** 2,660 tests across 232 files (5 new)

## 2026-02-11 - Client Network Request Retry (Phase 50)

### Phase 50: Client Network Request Retry (REQ-ERR-015, REQ-ERR-016)

Added automatic retry with exponential backoff to the API client for
transient network failures.

- **Modified `src/services/api-client.ts`**
  - Added `fetchWithRetry` wrapper around `fetch` with 2 retries and
    exponential backoff (1s, 3s)
  - Retries on: network errors (TypeError), 5xx server errors, 429 rate limit
  - Does NOT retry on 4xx client errors (400, 401, 403, 404)
  - All 5 API methods (apiGet, apiGetPaginated, apiPost, apiPatch, apiDelete)
    now route through `fetchWithRetry`
  - REQ-ERR-016: logs WARN per retry attempt, ERROR on final exhaustion

- **Modified `tests/unit/services/api-client.test.ts`** (9 new tests)
  - Retry on 500, succeeds on second attempt
  - Persistent 500 exhausts retries (3 total calls)
  - No retry on 400 or 404 (client errors)
  - Network error (TypeError) retry and exhaustion
  - 429 rate limit retry
  - WARN/ERROR logging verification
  - First-try success (no unnecessary retries)

**Tests:** 2,655 tests across 231 files (9 new)

## 2026-02-11 - League Deletion CASCADE Verification (Phase 49)

### Phase 49: League Deletion CASCADE Verification (REQ-LGE-010)

Verified all migration files have proper ON DELETE CASCADE constraints
for league deletion. Added structural test that reads migration SQL and
validates the constraint chain.

- **Created `tests/unit/migrations/cascade-delete.test.ts`** (11 tests)
  - 8 tests verify league_id FK ON DELETE CASCADE (teams, schedule, season_stats,
    game_logs, archives, simulation_progress, player_pool, transactions)
  - 1 test verifies team_id FK ON DELETE CASCADE (rosters)
  - 1 test verifies leagues table exists as root entity
  - 1 test verifies expected migration file count (18)

- All 9 child tables correctly cascade on league deletion
- Storage cleanup not needed (stats_storage_path always null currently)

**Tests:** 2,646 tests across 231 files (11 new)

## 2026-02-11 - Immer Middleware for draftStore (Phase 48)

### Phase 48: Immer Middleware for draftStore (REQ-STATE-005)

Added immer middleware to draftStore for clean nested-state mutations.

- **Modified `src/stores/draftStore.ts`**
  - Added `immer` middleware wrapping the store creator
  - Converted `submitPick` from manual spread-copy to direct mutations (`state.draftState.picks.push(result)`, `state.draftState.currentPick += 1`, etc.)
  - Converted all `set({...})` calls to immer mutation syntax for consistency
  - Follows same pattern as leagueStore and rosterStore

**Tests:** 2,635 tests across 230 files (all existing tests pass unchanged)

## 2026-02-11 - Responsive Design (Phase 47)

### Phase 47: Responsive Design (REQ-UI-013, REQ-COMP-010)

Desktop-first responsive layout with single breakpoint at 768px using `max-md:` prefix.

- **Modified `src/components/layout/AppShell.tsx`**
  - Added `max-md:max-w-none` to remove max-width on narrow viewports
  - Added `max-md:border-l-0` to hide book-spine border on mobile
  - Added `max-md:px-gutter` for tighter padding on mobile
  - Added `max-md:shadow-none` to remove shadow on mobile

- **Modified `src/components/layout/Header.tsx`**
  - Added hamburger menu button (hidden on desktop, visible on mobile)
  - SVG hamburger/X toggle icon with aria-expanded attribute
  - Nav links collapse to vertical column on mobile
  - User name and Log Out move into mobile menu
  - `handleNavigate` auto-closes mobile menu on link click

- **Modified `src/components/data-display/StandingsTable.tsx`**
  - Added `max-md:hidden` to GB, RS, RA, DIFF header and data cells
  - Mobile shows only Team, W, L, PCT columns

- **Modified `src/components/data-display/StatTable.tsx`**
  - First column header and data cells get `max-md:sticky max-md:left-0` for horizontal scroll

- **Modified `src/components/baseball/DiamondField.tsx`**
  - Added `max-md:min-w-[280px]` minimum width constraint for mobile
  - Added `preserveAspectRatio="xMidYMid meet"` for proportional SVG scaling

- **Modified `src/features/draft/DraftBoardPage.tsx`**
  - Changed `lg:grid-cols-12` to `md:grid-cols-12` (correct 768px breakpoint)
  - Changed all `lg:col-span-*` to `md:col-span-*`

- **Modified `src/components/baseball/PlayerCardDisplay.tsx`**
  - Changed `max-w-sm` (384px) to `max-w-[480px]` per SRD
  - Added `max-md:mx-4 max-md:max-w-none` for full-width mobile

- **Created `tests/unit/styles/responsive.test.tsx`** (20 tests)
  - AppShell responsive classes (3 tests)
  - Header hamburger menu (6 tests)
  - StandingsTable column hiding (2 tests)
  - StatTable sticky first column (3 tests)
  - DiamondField mobile scaling (2 tests)
  - PlayerCardDisplay mobile layout (3 tests)
  - Font-display swap test (1 test)

- **Modified `tests/unit/styles/fonts.test.ts`** (2 new tests)
  - font-display: swap verification
  - Latin unicode-range subsetting verification

- **Modified `tests/unit/components/layout/Header.test.tsx`**
  - Updated 2 tests for dual user name/logout button (desktop + mobile)

**Tests:** 2,635 tests across 230 files (22 new, 2 updated)

## 2026-02-11 - Per-Directory Coverage Thresholds (Phase 46)

### Phase 46: Per-Directory Coverage Thresholds (REQ-TEST-003, REQ-TEST-004)

Configured vitest.config.ts with SRD-specified per-directory coverage thresholds.

- **Modified `vitest.config.ts`**
  - Added `coverage.include` for 6 source directory patterns (src/lib, services, stores, hooks, workers, api)
  - Added `coverage.exclude` for type definition files
  - Set global floor: 85% lines, 80% branches, 85% statements, 80% functions
  - Added 9 per-directory threshold overrides:
    - `src/lib/rng/**`: 100% all metrics (determinism is non-negotiable)
    - `src/lib/simulation/**`, `src/lib/card-generator/**`: 95%/90% (core engine)
    - `src/lib/draft/**`, `src/lib/stats/**`: 90%/85% (user-visible accuracy)
    - `src/lib/csv/**`, `src/lib/schedule/**`: 85%/80%
    - `api/**`: 80%/75%, `src/services/**`: 75%/70%
  - Added `all: true` to track files not directly imported by tests
  - Documented Node 24 + Windows V8 coverage known issue

- **Added `@vitest/coverage-istanbul` as fallback provider**

- CI already runs `npm run test:coverage` (ubuntu-latest, Node 20) with artifact upload

**Tests:** 2,613 tests across 229 files (no changes, configuration only)

## 2026-02-11 - Traceability Matrix Update (Phase 45)

### Phase 45: Traceability Matrix Update (REQ-TEST-011)

Updated requirement-to-test traceability matrix covering Phases 27-44 (18 phases).

- **Updated `tests/TRACEABILITY.md`**
  - Added 18 phase sections (Phase 27 through Phase 44)
  - Mapped ~50 requirement-to-test entries across all phases
  - Covers: API consolidation, schedule/lineup wiring, simulation store, dashboard panels,
    draft timer, free agent flow, transaction history, trade eval, archive enrichment,
    new season flow, persist migrations, focus trap, page titles, ARIA audit, error boundaries

- **Updated `docs/PROJECT_STATUS.md`**
  - REQ-NFR-017: Marked as VERIFIED (143KB gzipped, under 200KB target)
  - REQ-TEST-011: Marked as CURRENT (traceability through Phase 44)
  - REQ-TEST count: 14 -> 15 of 18

**Tests:** 2,613 tests across 229 files (no changes, documentation only)

## 2026-02-11 - Feature-Level Error Boundaries (Phase 44)

### Phase 44: Feature-Level Error Boundaries (REQ-ERR-010, REQ-ERR-011, REQ-COMP-007)

Per-route ErrorBoundary wrapping for all 11 lazy-loaded feature pages.

- **Modified `src/router.tsx`**
  - `LazyPage` now wraps children in `ErrorBoundary > Suspense` (was Suspense only)
  - Each feature route gets its own error boundary for isolated crash recovery
  - Chunk-load failures (dynamic import errors) are caught alongside render errors

- **Updated `tests/unit/components/feedback/ErrorBoundary.test.tsx`**
  - Added chunk-load failure test verifying fallback shows error message + recovery buttons

**Tests:** 1 new test
**Total:** 2,613 tests across 229 files

## 2026-02-11 - WCAG ARIA Compliance Audit (Phase 43)

### Phase 43: WCAG ARIA Compliance Audit (REQ-COMP-012)

Audited all shared components against SRD ARIA specification table and fixed 8 gaps.

- **ConfirmDialog**: Changed `role="dialog"` to `role="alertdialog"` per ARIA spec for destructive confirmations
- **DiamondField**: Changed `role="img"` to `role="group"` with `aria-label="Baseball diamond lineup"`
- **LineScore**: Added `<caption>` describing game matchup (sr-only)
- **Pagination**: Added `aria-current="page"` on current page indicator
- **StatTable**: Changed `role="table"` to `role="grid"`, added `aria-sort="none"` for unsorted columns
- **LoadingLedger**: Added `aria-label` matching the `message` prop
- **DraftTicker**: Added `aria-live="polite"`, changed label to "Draft pick feed"
- Updated all affected test files (StatTable, StatsPage, DiamondField, LineupDiamond)

**Tests:** 8 new ARIA compliance tests + existing test updates
**Total:** 2,612 tests across 229 files

## 2026-02-11 - Accessibility: Focus Trap + Page Titles (Phase 42)

### Phase 42: Accessibility Focus Trap + Page Titles (REQ-COMP-012, REQ-COMP-013)

WCAG 2.1 Level AA focus management for modals and page titles for all feature pages.

- **Created `src/hooks/useFocusTrap.ts` (L5 hook)**
  - Encapsulates Tab/Shift+Tab cycling within a container, Escape key handling, focus save/restore
  - Replaces duplicated focus logic in modal components
  - 5 tests in `useFocusTrap.test.ts`

- **Created `src/hooks/usePageTitle.ts` (L5 hook)**
  - Sets `document.title` with "Page | Baseball Ledger" format
  - Restores previous title on unmount
  - 3 tests in `usePageTitle.test.ts`

- **Modified `src/components/forms/ConfirmDialog.tsx`**
  - Replaced manual focus management with `useFocusTrap` hook
  - 2 new tests (Tab wrap, focus restore)

- **Modified `src/components/baseball/PlayerCardDisplay.tsx`**
  - Replaced manual focus management with `useFocusTrap` hook

- **Modified `src/components/baseball/PlayerProfileModal.tsx`**
  - Added focus management via `useFocusTrap` (previously had none)
  - 2 new tests (Escape key, focus on open)

- **Added `usePageTitle` to all 13 feature pages**
  - Home, Sign In, Join League, League Setup, Dashboard, Draft Board, Roster, Statistics, Standings, Game Viewer, Playoffs, Season Archive, Transactions

**Tests:** 12 new (5 focus trap + 3 page title + 2 ConfirmDialog + 2 PlayerProfileModal)
**Total:** 2,604 tests across 229 files

## 2026-02-11 - Persist Migration Infrastructure (Phase 41)

### Phase 41: Persist Migration Infrastructure (REQ-STATE-009)

All 3 persisted Zustand stores now have version/migrate configuration for safe schema evolution. When persisted state version < current version, migrations run sequentially with defaultState fallback.

- **Created `src/stores/persist-migration.ts` (L4 helper)**
  - `createMigrationConfig<T>()` factory returns `{ version, migrate }` for Zustand persist options
  - Sequential migration runner: version N-1 -> N for each step
  - Falls back to defaultState when any migration step is missing (safe reset)
  - 5 tests in `persist-migration.test.ts`

- **Modified `src/stores/leagueStore.ts`**
  - Added `...createMigrationConfig(1, initialState)` to persist config
  - 1 new test verifying persist config has version and migrate

- **Modified `src/stores/statsStore.ts`**
  - Added `...createMigrationConfig(1, initialState)` to persist config
  - 1 new test verifying persist config has version and migrate

- **Modified `src/stores/rosterStore.ts`**
  - Added `...createMigrationConfig(1, initialState)` to persist config
  - 1 new test verifying persist config has version and migrate

- **Updated `docs/PROJECT_STATUS.md`**
  - Added Phases 39-41 to completed phases
  - Updated metrics: 41 phases, 227 test files, 2,592 tests
  - REQ-SCH-009: Done, REQ-STATE-009: Done
  - schedule.ts endpoint now shows GET, POST
  - Renumbered "What Still Needs Work" section

**Tests:** 8 new (5 migration helper + 3 store persist config)
**Total:** 2,592 tests across 227 files

## 2026-02-11 - Start New Season Flow (Phase 40)

### Phase 40: Start New Season Flow (REQ-SCH-009 completion)

After archiving a season, the commissioner can now start a new season with existing rosters. Generates fresh lineups and a 162-game schedule without requiring a new draft.

- **Created `src/lib/validators/season-start.ts` (L1 validator)**
  - `canStartSeason()` pure function validates preconditions: setup status, seasonYear > 1 (post-archive), team count >= 2, full rosters (21 players)
  - 5 tests in `season-start.test.ts`

- **Modified `api/leagues/[id]/schedule.ts` -- added POST handler**
  - POST generates lineups + schedule for returning seasons (no new serverless function slot)
  - Commissioner-only, validates via `canStartSeason()`
  - Calls existing `generateAndInsertLineups()` and `generateAndInsertSchedule()` helpers
  - Transitions league: `status='regular_season'`, `current_day=1`
  - Returns 201 with `{ totalDays, totalGames }`
  - 6 new tests (10 total in `schedule.test.ts`)

- **Created `src/features/dashboard/NewSeasonPanel.tsx` (L7 component)**
  - Commissioner sees "Start Season" button with loading state
  - Non-commissioners see waiting message
  - Displays season year and roster carryover note
  - 4 tests in `NewSeasonPanel.test.tsx`

- **Modified `src/features/dashboard/DashboardPage.tsx`**
  - Setup status now branches: `seasonYear > 1` shows NewSeasonPanel, `seasonYear === 1` shows InviteKeyDisplay
  - Added `handleStartSeason` handler (POST to schedule endpoint + refresh)
  - 2 new tests in `DashboardPage.test.tsx`

- **Modified `src/lib/types/league.ts`**
  - Added `seasonYear` to `LeagueSummary` interface (already present in DB/API response via `snakeToCamel`)

- **Tests**: 2,584 passing across 226 files. TypeScript clean.

---

## 2026-02-10 - Season Archive Enrichment (Phase 39)

### Phase 39: Season Archive Enrichment (REQ-SCH-009)

Archives now store champion name, full playoff bracket results, and league leader boards. Season reset properly clears stats, schedule, game logs, and team records.

- **Created `src/lib/transforms/archive-builder.ts` (L1 helper)**
  - `buildArchiveData()` computes enriched archive fields from league state at season end
  - Resolves champion name from `worldSeriesChampionId` via teams array
  - Computes top 5 batting leaders (HR, RBI, BA, H, SB) and pitching leaders (W, SO, ERA, SV, WHIP) using existing `getBattingLeaders` / `getPitchingLeaders`
  - Maps player IDs to display names via `playerNameCache`
  - 5 tests in `archive-builder.test.ts`

- **Modified `api/leagues/[id]/archive.ts` -- enriched archive + season reset**
  - League query expanded to fetch `playoff_bracket` and `player_name_cache`
  - New `season_stats` query fetches all player stats for leader computation
  - Archive insert now includes `champion`, `playoff_results`, `league_leaders`
  - Season reset: deletes `season_stats`, `schedule`, `game_logs` via parallel Promise.all
  - Team records reset: `wins=0, losses=0, runs_scored=0, runs_allowed=0`
  - League update clears `playoff_bracket` along with status reset
  - GET with `seasonId` query param returns full single archive detail
  - 7 new tests in `archive.test.ts`

- **Modified `src/hooks/useArchive.ts` -- detail fetch support**
  - Added `ArchiveDetail` interface with `standings`, `playoffResults`, `leagueLeaders`
  - Added `fetchDetail(seasonId)` and `clearDetail()` functions
  - Hook now returns `detail`, `detailLoading`, `fetchDetail`, `clearDetail`

- **Modified `src/features/archive/SeasonDetail.tsx` -- enriched display**
  - Props changed from `standings` to `playoffResults` and `leagueLeaders`
  - Displays World Series completion status when playoff results available
  - Renders batting and pitching leader tables (top 5 per category)
  - Rate stats (BA, ERA, WHIP) formatted to 3 decimal places

- **Modified `src/features/archive/ArchivePage.tsx` -- detail flow**
  - Selecting a season fetches full detail via `fetchDetail()`
  - Passes enriched data to `SeasonDetail`

- **New tests: 12 total** (5 builder + 7 API)
- **Test suite: 2,567 tests across 224 files (all passing)**

## 2026-02-10 - CPU Trade Auto-Evaluation (Phase 38)

### Phase 38: CPU Trade Auto-Evaluation (REQ-RST-005, REQ-AI-006)

Trades with CPU-controlled teams (owner_id = null) are now gated behind the template trade evaluator. CPU managers evaluate proposals using their personality profile and respond instantly with accept, counter, or reject.

- **Created `src/lib/transforms/trade-eval-request-builder.ts` (L1 helper)**
  - `buildTradeEvalRequest()` builds a TradeEvaluationRequest from roster data and team metadata
  - Maps player IDs to name/position/value using roster entries
  - Computes card value as sum of APBA card bytes
  - Computes team needs from positional gaps in roster
  - 4 tests in `trade-eval-request-builder.test.ts`

- **Modified `api/leagues/[id]/teams.ts` -- CPU trade gate**
  - `handleTrade()` checks `targetTeam.owner_id === null` for CPU teams
  - CPU trades evaluated via `evaluateTradeTemplate()` with target team's manager_profile
  - Rejected trades logged to transactions table with evaluation details
  - Returns 409 TRADE_REJECTED with manager reasoning on rejection
  - Expanded target team query to include manager_profile, name, city
  - 4 new tests in `teams.test.ts`

- **Modified `src/features/transactions/TransactionsPage.tsx` -- eval preview fix**
  - `tradeEvalRequest` useMemo now uses `buildTradeEvalRequest` (shared L1 logic)
  - Looks up target team from `teams` array for actual manager profile
  - Uses `MANAGER_PROFILES[style].name` instead of hardcoded 'Manager'
  - Fixed trade error handling to display AppError messages from API

- **Modified error handling in trade UI**
  - `handleTrade` catch block now extracts messages from AppError objects (not just Error instances)
  - CPU trade rejection reasoning displayed via existing ErrorBanner

- **New tests: 10 total** (4 builder + 4 API + 2 UI)
- **Test suite: 2,554 tests across 223 files (all passing)**

## 2026-02-10 - Transaction History Persistence (Phase 37)

### Phase 37: Transaction History Persistence (REQ-RST-005)

Transaction history is now persisted to a `transactions` table and displayed in the History tab. Every add, drop, and trade operation logs an audit entry with JSONB details.

- **Created `supabase/migrations/00018_create_transactions.sql`**
  - `transactions` table with id, league_id, team_id, type, details (JSONB), created_at
  - Index on (league_id, created_at DESC) for efficient history queries
  - RLS policies: league members can read, team owners can insert

- **Modified `src/lib/types/database.ts` -- TransactionRow/Insert/Update types**
  - Added to Database['public']['Tables'] for Supabase type safety

- **Created `src/lib/transforms/transaction-transform.ts` (L1 helper)**
  - `transformTransactionRows()` converts TransactionRow[] to TransactionEntry[]
  - Formats add/drop/trade details into human-readable playerName + details strings
  - 5 tests in `transaction-transform.test.ts`

- **Modified `api/leagues/[id]/teams.ts` -- write + read transactions**
  - `handleTransaction()` inserts audit row after each add/drop
  - `handleTrade()` inserts audit row after each trade
  - GET `?include=history` returns last 100 transactions transformed to TransactionEntry[]
  - 5 new tests in `teams.test.ts`

- **Modified `src/services/transaction-service.ts` -- fixed URL**
  - `fetchTransactionHistory()` now calls `?include=history` query param
  - 1 updated test in `transaction-service.test.ts`

- **Fixed layer violation: TransactionEntry type moved to L1**
  - Defined in `transaction-transform.ts`, re-exported from `TransactionLog.tsx`
  - Service no longer imports from L7 feature component

- **New tests: 10 total** (5 transform + 5 API)
- **Test suite: 2,544 tests across 222 files (all passing)**

## 2026-02-10 - Free Agent Pickup Flow (Phase 36)

### Phase 36: Free Agent Pickup Flow (REQ-RST-005)

Players can now add free agents from the player pool and drop roster players. The API keeps the player_pool table in sync so dropped players return to the free agent pool and added players are removed from it.

- **Modified `api/leagues/[id]/teams.ts` -- player_pool sync on add/drop**
  - Drop: sets `is_drafted=false, drafted_by_team_id=null` for all seasons of dropped player
  - Add: sets `is_drafted=true, drafted_by_team_id=teamId` for all seasons of added player (REQ-DFT-001a)
  - 4 new tests in `teams.test.ts`

- **Created `src/lib/transforms/player-pool-transform.ts` (L1 shared helper)**
  - `transformPoolRows()` converts PlayerPoolRow[] to AvailablePlayer[]
  - Extracted from draftStore to avoid duplication with TransactionsPage
  - 3 tests in `player-pool-transform.test.ts`

- **Modified `src/features/transactions/AddDropForm.tsx` -- add player UI**
  - New "Add a Player" section with debounced search input (300ms)
  - Scrollable free agent list with per-player Add buttons
  - `canAdd` guard enforces 21-player roster limit
  - 6 new tests in `AddDropForm.test.tsx`

- **Modified `src/features/transactions/TransactionsPage.tsx` -- wiring**
  - `handleSearchPlayers` calls draft service to fetch undrafted players
  - `handleAdd` calls transaction service, refreshes roster, clears search
  - Passes all new props to AddDropForm
  - 5 new tests in `TransactionsPage.test.tsx`

- **Modified `src/stores/draftStore.ts` -- use shared transform**
  - Re-exports `AvailablePlayer` from `@lib/transforms/player-pool-transform`
  - `fetchAvailablePlayers` uses `transformPoolRows()` instead of inline logic

- **New tests: 18 total** (4 + 3 + 6 + 5)

## 2026-02-10 - Draft Pick Timer Enforcement (Phase 35)

### Phase 35: Draft Pick Timer Enforcement (REQ-DFT-004)

Player-controlled teams now have a 60-second pick timer during the draft. When the timer expires, the AI auto-picks the best available player using APBA card value scoring. The API responses were also fixed to include fields required by the frontend contracts.

- **Created `src/lib/draft/auto-pick-selector.ts` (L1 pure helper)**
  - `selectBestAvailable()` scores players using APBA card value correlations
  - Batter scoring: HR=15, double=8, single=5, walk=4, K=-3, plus power rating bonus
  - Pitcher scoring: grade * 10
  - 5 tests in `auto-pick-selector.test.ts`

- **Modified `api/leagues/[id]/draft.ts` -- fix GET and POST responses**
  - GET now returns `currentTeamId`, `picks`, `pickTimerSeconds` (DraftState contract)
  - POST now returns `round`, `pick`, `nextTeamId` (DraftPickResult contract)
  - 6 new tests in `draft.test.ts`

- **Created `src/features/draft/hooks/useDraftTimer.ts` (feature hook)**
  - Dependency-injected: receives timer functions as params (REQ-SCOPE-003)
  - Resets timer on team change, ticks every second when active
  - Fires `onExpire` exactly once when timer reaches 0
  - 6 tests in `useDraftTimer.test.ts`

- **Modified `src/hooks/useDraft.ts` -- expose timer actions**
  - Added `tickTimer` and `resetTimer` from draftStore to hook return

- **Modified `src/features/draft/DraftBoardPage.tsx` -- wire timer + auto-pick**
  - Calls `useDraftTimer` with isActive/currentTeamId/timer state
  - `handleAutoPickOnExpire` selects best available via `selectBestAvailable`
  - 3 new tests in `DraftBoardPage.test.tsx`

- **New tests: 20 total** (5 + 6 + 6 + 3)

## 2026-02-10 - Playoff Dashboard Integration (Phase 34)

### Phase 34: Playoff Dashboard Integration (REQ-LGE-009, REQ-SCH-007)

During playoffs, the dashboard now shows playoff context instead of "No games scheduled". After simulating a playoff game, the notification displays the specific result (e.g., "Championship Series Game 3: Wolves 3, Eagles 5") instead of the generic "1 game simulated".

- **Created `src/lib/schedule/playoff-display.ts` (L1 pure helpers)**
  - `formatPlayoffRoundName()` converts PascalCase round names to human-readable
  - `buildPlayoffGameMessage()` builds notification text from playoff game data
  - Deduplicated inline formatting from `SeriesCard.tsx` and `PlayoffBracketView.tsx`
  - 7 tests in `playoff-display.test.ts`

- **Modified `src/stores/simulationStore.ts` -- track playoff results**
  - Added `PlayoffGameResult` interface and `lastPlayoffResult` field to state
  - `runSimulation` loop captures `result.playoff` + `result.games[0]` data
  - Cleared on new simulation start
  - 4 new tests across store test files

- **Modified `src/features/dashboard/SimulationNotification.tsx`**
  - Added optional `playoffMessage` prop; when set, replaces the generic message
  - 1 new test

- **Created `src/features/dashboard/PlayoffStatusPanel.tsx` (REQ-LGE-009)**
  - Dashboard right-column panel during playoffs
  - Shows last game result, active series with win counts, next game preview
  - Uses `getNextFullBracketGame()` for "Up Next" display
  - 7 tests in `PlayoffStatusPanel.test.tsx`

- **Modified `src/features/dashboard/DashboardPage.tsx`**
  - Conditionally renders `PlayoffStatusPanel` instead of `ScheduleView` during playoffs
  - Builds `playoffMessage` from `lastPlayoffResult` + team names via `useMemo`
  - Passes `playoffMessage` to `SimulationNotification`
  - 5 new tests in `DashboardPage.test.tsx`

- **Modified `tests/fixtures/mock-league.ts`**
  - Added `createMockPlayoffBracket()` factory function

**Tests:** 2,496 across 218 files. TypeScript clean.

---

## 2026-02-10 - Season Completion Ceremony and Playoff Sim Fix (Phase 33)

### Phase 33: Season Completion Ceremony and Playoff Sim Fix (REQ-SCH-009, REQ-LGE-009)

After the World Series concludes, the dashboard now shows a champion announcement with stamp animation and an archive button. Also fixed a bug where playoff simulation returned a non-standard response format, causing "0 games simulated" notifications.

- **Bug fix: Playoff simulation response normalization**
  - `api/leagues/[id]/simulate.ts` was returning raw `PlayoffGameSimResult` without `dayNumber` or `games[]`
  - Client-side `simulation-service.ts` expected standard shape, so `games` defaulted to `[]`
  - Store broke the loop immediately, reporting `completedGames: 0`
  - Fixed: playoff responses now return `{ dayNumber, games: [oneGame], playoff: metadata }`
  - Extended `SimDayResult` type with optional `playoff` metadata field
  - 2 new tests in `simulate.test.ts`

- **Created `src/features/dashboard/SeasonCompletePanel.tsx` (REQ-SCH-009)**
  - Displays `StampAnimation` with "SEASON COMPLETED" stamp
  - Shows champion name resolved from `playoffBracket.worldSeriesChampionId`
  - "Archive Season & Start New" button (commissioner only)
  - Calls `POST /api/leagues/:id/archive` to create archive record and reset league to setup
  - 7 tests in `SeasonCompletePanel.test.tsx`

- **Modified `src/features/dashboard/DashboardPage.tsx`**
  - Destructured `playoffBracket` and `isCommissioner` from `useLeague()`
  - Added `championName` memo, `isArchiving` state, and `handleArchive` handler
  - When `leagueStatus === 'completed'`, renders `SeasonCompletePanel` instead of `SimulationControls`
  - 4 new tests in `DashboardPage.test.tsx`

- **Fixed `tests/fixtures/mock-league.ts`**
  - Added missing `playoffBracket: null` to `createMockLeague` defaults

**REQ-SCH-009**: Season completion ceremony with stamp animation, champion display, and archive action.
**REQ-LGE-009**: Playoff simulation now returns correct game count for frontend tracking.
**2,472 tests** across 216 files pass. TypeScript clean.

## 2026-02-10 - Post-Simulation Dashboard Refresh and Results Notification (Phase 32)

### Phase 32: Post-Simulation Dashboard Refresh and Results Notification (REQ-STATE-014, REQ-SCH-007)

After Phase 31 made simulation functional, two issues remained: the dashboard never refreshed after simulation (standings/schedule stale until manual reload), and there was no visual feedback when simulation completed. Both are now fixed.

- **Bug fix: Cache invalidation (REQ-STATE-014)**
  - `useRealtimeProgress` hook existed but was never imported in any component -- orphaned code
  - Wired `useRealtimeProgress(league?.id ?? null)` into `DashboardPage.tsx`
  - After simulation completes, `fetchLeagueData` is called automatically to refresh standings, schedule, and currentDay
  - 2 new tests in `useRealtimeProgress.test.ts`

- **Created `src/features/dashboard/SimulationNotification.tsx` (REQ-SCH-007)**
  - Typewriter-effect notification using existing `TypewriterText` component
  - Single-day message: "Simulation complete -- 4 games simulated"
  - Multi-day message: "7 days simulated -- 28 games complete"
  - Auto-dismisses 4 seconds after typewriter animation finishes
  - Styled with vintage theme (stitch-red border, old-lace background)
  - `role="status"` for accessibility
  - 5 tests in `SimulationNotification.test.tsx`

- **Modified `src/features/dashboard/DashboardPage.tsx`**
  - Added `useRealtimeProgress` call for cache invalidation
  - Added `showNotification` state driven by simulation status
  - Renders `SimulationNotification` between controls and data grid
  - 4 new tests in `DashboardPage.test.tsx`

- **Dead code cleanup: `src/services/simulation-service.ts`**
  - Removed `days` parameter from `startSimulation` (always sends `{ days: 1 }` internally)
  - Removed unreachable `simulationId` return branch (API only accepts `days: 1` since Phase 31)
  - Simplified return type from `Promise<{ simulationId?: string; result?: SimDayResult }>` to `Promise<SimDayResult>`
  - Updated `simulationStore.ts` call site and 2 test files

**REQ-STATE-014**: Cache invalidation on simulation completion -- wired and tested.
**REQ-SCH-007**: Typewriter effect simulation results notification -- implemented.
**2,459 tests** across 215 files pass. TypeScript clean.

## 2026-02-10 - Client-Driven Multi-Day Simulation (Phase 31)

### Phase 31: Client-Driven Multi-Day Simulation (REQ-NFR-021, REQ-SCH-005)

The "Simulate Week/Month/Season" buttons called the API with `days > 1`, which returned `202 Accepted` but never actually simulated any days -- the server-side loop was never implemented. Per REQ-NFR-021 (chunked simulation pattern) and Vercel Hobby's 60s function timeout, multi-day simulation is now driven by the client.

- **Modified `src/stores/simulationStore.ts`**
  - Added `totalDays` and `currentDay` to `SimulationState`
  - Rewrote `runSimulation` to loop calling `startSimulation(leagueId, 1)` for each day
  - Breaks early when endpoint returns `games: []` (schedule exhausted or playoff transition)
  - On completion, sets `totalDays = daysDone` for accurate progress display
  - 6 new tests in `simulationStore-async.test.ts`
- **Modified `src/hooks/useSimulation.ts`**
  - Exposed `currentDay` and `totalDays` from store
  - Updated `progressPct` to use day-based calculation (`currentDay / totalDays`) when available, falling back to game-based when `totalDays` is 0
  - 3 new tests in `useSimulation.test.ts`
- **Modified `api/leagues/[id]/simulate.ts`**
  - Removed dead 202 async path (never completed simulation)
  - Tightened schema to `days: z.literal(1)` -- endpoint only handles single-day
  - Removed unused `accepted` import
  - Replaced 2 broken 202 tests with 2 validation rejection tests

**REQ-NFR-021**: Chunked simulation pattern implemented (client loops day-by-day).
**REQ-SCH-005**: Simulate Day/Week/Month/Season buttons now functional.
**2,449 tests** across 214 files pass. TypeScript clean.

## 2026-02-10 - Post-Draft Lineup Auto-Generation (Phase 30)

### Phase 30: Post-Draft Lineup Auto-Generation (REQ-RST-001)

After the draft, all roster entries had `roster_slot: 'bench'` with NULL lineup data. The simulation engine's `loadTeamConfig()` filters by `roster_slot === 'starter'`, so an empty lineup caused simulation failures. This phase auto-generates lineups and pitcher assignments when the draft completes.

- **Fixed `api/_lib/load-team-config.ts`** -- Changed fallback pitcher `primaryPosition`/`eligiblePositions` from `'P'` to `'SP'` to match the `Position` type union (TS2322 fix)
- **Created `src/lib/roster/estimate-batting-stats.ts`** (Layer 1 pure function)
  - Approximates OPS/OBP/SLG from PlayerCard fields (`contactRate`, `power`, `discipline`)
  - Only relative ordering matters for lineup slot assignment
  - 4 tests in `estimate-batting-stats.test.ts`
- **Created `api/_lib/generate-lineup-rows.ts`** (Layer 2 helper)
  - `generateAndInsertLineups(supabase, leagueId)` fetches teams and rosters, splits position players from pitchers
  - Position players: sorted by estimated OPS, top 9 fed to `generateLineup()`, assigned `roster_slot='starter'` with `lineup_order` and `lineup_position`
  - Pitchers: assigned by `pitching.role` to `'rotation'`, `'bullpen'`, or `'closer'`
  - 9 tests in `generate-lineup-rows.test.ts`
- **Modified `api/leagues/[id]/draft.ts`** (draft completion path)
  - Added `generateAndInsertLineups(supabase, leagueId)` call BEFORE `generateAndInsertSchedule`
  - If lineup generation fails, schedule generation and status transition are skipped
  - 2 new tests in `draft.test.ts` (ordering verification + error propagation)

**REQ-RST-001**: Rosters are now playable immediately after draft completion.
**2,440 tests** across 214 files pass. TypeScript clean.

## 2026-02-10 - Lineup Update API Endpoint (Phase 29)

### Phase 29: Lineup Update API Endpoint (REQ-RST-002)

The frontend (RosterPage, rosterStore, roster-service) called `PATCH /api/leagues/:id/teams?tid=X&include=roster` to save lineup changes, but the API handler only processed team metadata updates. Lineup saves silently failed with validation errors.

- **Modified `api/leagues/[id]/teams.ts`**
  - Added `LineupUpdateSchema` with Zod validation (rosterId, lineupOrder 1-9, lineupPosition enum, rosterSlot enum)
  - Added branching on `include=roster` in the PATCH handler (matching existing GET pattern)
  - Added `handleLineupUpdate` function: verifies ownership, validates roster IDs belong to team, applies updates, returns full updated roster
  - No new files -- single function added to existing handler
- **Modified `tests/unit/api/leagues/[id]/teams.test.ts`**
  - 8 new tests covering: successful save, invalid rosterSlot/lineupOrder/lineupPosition rejection, auth/ownership checks, invalid roster ID detection, empty updates handling

**REQ-RST-002**: Lineup management save path now works end-to-end.
**2,425 tests** across 212 files pass. TypeScript clean.

## 2026-02-10 - Schedule Generation Wiring (Phase 28)

### Phase 28: Wire Schedule Generation into Draft Completion

The schedule generator (`src/lib/schedule/generator.ts`) existed as Layer 1 pure logic with 19 tests but was never called. When the draft completed, the league transitioned to `regular_season` with an empty schedule table, leaving simulation with no games to run.

- **Created `api/_lib/generate-schedule-rows.ts`** (Layer 2 helper)
  - Fetches teams from DB, maps to `TeamSummary[]`, calls `generateSchedule()`
  - Flattens `ScheduleDay[]` into schedule table rows and batch-inserts them
  - Uses `SeededRNG(Date.now())` for deterministic-per-invocation scheduling
  - 7 tests in `generate-schedule-rows.test.ts`
- **Modified `api/leagues/[id]/draft.ts`** (draft completion path)
  - Added `generateAndInsertSchedule(supabase, leagueId)` call before status transition
  - Schedule generation runs BEFORE `regular_season` update -- if it fails, league stays in `drafting`
  - 2 new tests in `draft.test.ts` (completion wiring + error propagation)

**REQ-SCH-001 through REQ-SCH-004**: Schedule is now populated when the draft completes.
**2,417 tests** across 212 files pass. TypeScript clean.

## 2026-02-10 - API Route Consolidation (Phase 27)

### Phase 27: API Route Consolidation -- Vercel Hobby Limit

Consolidated 13 serverless functions down to 10 to fit within the Vercel Hobby plan limit of 12 (with headroom for 2 future routes). Three merges follow existing dispatch patterns already used in the codebase.

- **Merge 1: standings.ts into stats.ts**
  - Added `?type=standings` to the existing `typeHandlers` dispatch map
  - `handleStandings` + `StandingsTeamRow` moved from standalone file
  - Updated `league-service.ts` URL: `/standings` -> `/stats?type=standings`
  - 3 standings tests merged into stats.test.ts
  - Deleted: `api/leagues/[id]/standings.ts`, `tests/.../standings.test.ts`
- **Merge 2: players.ts into draft.ts**
  - Added `?resource=players` sub-routing on the GET branch
  - `handleGetPlayers` + `SORT_COLUMN_MAP` moved from standalone file
  - Updated `draft-service.ts` URL: `/players?` -> `/draft?resource=players&`
  - 9 player tests merged into draft.test.ts
  - Deleted: `api/leagues/[id]/players.ts`, `tests/.../players.test.ts`
- **Merge 3: transactions.ts into teams.ts**
  - Added POST method for roster transactions (add/drop/trade)
  - `handleTransaction`, `handleTrade`, `toRosterEntry`, `TransactionSchema` moved from standalone file
  - Updated `transaction-service.ts` URLs: `/transactions` -> `/teams`
  - 11 transaction tests merged into teams.test.ts; 405 test updated (POST->DELETE)
  - Deleted: `api/leagues/[id]/transactions.ts`, `tests/.../transactions.test.ts`

**10 API endpoint files** (down from 13):
`ai/index`, `leagues/index`, `[id]/index`, `[id]/archive`, `[id]/draft`, `[id]/games/[gid]`, `[id]/schedule`, `[id]/simulate`, `[id]/stats`, `[id]/teams`

**Test total: 2,408 tests across 211 files** (3 test files merged, 1 duplicate 405 test dropped)

## 2026-02-10 - Game Simulation Integration (Phase 26)

### Phase 26: Game Simulation Integration -- MVP Blocker (REQ-NFR-010, REQ-NFR-014)

Wires the simulate endpoint to actually run games. Previously it was a stub returning `{ gamesScheduled: N }` -- now it loads rosters, builds game configs, runs the simulation engine, and returns full game results.

- **Shared team config loader** (Step 26.1)
  - Extracted `loadTeamConfig()` from `simulate-playoff-game.ts` to shared `api/_lib/load-team-config.ts`
  - New `TeamConfig` interface exposes full `rotation` array for pitcher cycling
  - `selectStartingPitcher(rotation, gameIndex)` cycles via modulo
  - `createFallbackPitcher()` for teams with empty rotations
  - 11 tests
- **Playoff module refactor** (Step 26.2)
  - `simulate-playoff-game.ts` now imports from shared module (no behavioral change)
  - 14 existing playoff tests pass unchanged
- **Simulate endpoint wiring** (Steps 26.3-26.4)
  - Replaced stub at `api/leagues/[id]/simulate.ts` lines 91-95 with full pipeline:
    - Collects unique team IDs from scheduled games
    - Loads team configs in parallel via `loadTeamConfig()`
    - Queries team wins+losses for pitcher rotation index
    - Builds `DayGameConfig[]` with `selectStartingPitcher()` for rotation cycling
    - Calls `simulateDayOnServer()` for atomic RPC commit
    - Marks schedule rows complete with scores
    - Returns `DayResult` with full game results
  - 13 tests (5 new + 1 rewritten + 7 existing)

**Test total: 2,409 tests across 214 files**

## 2026-02-10 - League Creation Pipeline (Phase 25)

### Phase 25: League Creation Pipeline -- MVP Blocker (REQ-DATA-002, REQ-DFT-001)

Wires together all existing pieces (CSV parsers, player pool builder, card generator) into an end-to-end pipeline that executes during league creation. Without this phase, the draft board had no players to display.

- **Database: player_pool table** (Step 25.1)
  - Migration `00016_create_player_pool.sql`: UUID PK, league_id FK, player_id, season_year, player_card JSONB, is_drafted, drafted_by_team_id
  - Migration `00017_player_pool_rls.sql`: RLS policies + player_name_cache column on leagues
  - TypeScript types: PlayerPoolRow, PlayerPoolInsert, PlayerPoolUpdate in database.ts
  - 3 tests
- **CSV pipeline orchestrator** (Step 25.2)
  - `src/lib/csv/load-pipeline.ts`: `runCsvPipeline()` -- pure L1 function orchestrating CSV loading -> pool building -> card generation
  - Reuses all existing loaders (people, batting, pitching, fielding), buildPlayerPool, computeLeagueAverages, generateAllCards
  - Returns pool, leagueAverages, playerNameCache, cards, errors
  - 10 tests
- **CSV file reader** (Step 25.3)
  - `api/_lib/load-csvs.ts`: `loadCsvFiles()` -- reads 4 Lahman CSVs from data_files/ via Node.js fs
  - Only file that touches filesystem for CSV loading
  - 4 tests
- **League creation wiring** (Step 25.4)
  - Modified `api/leagues/index.ts`: after league insert, calls loadCsvFiles -> runCsvPipeline -> batch inserts (1000/batch) to player_pool -> updates league with player_name_cache
  - Graceful degradation: CSV pipeline failure does not fail league creation
  - 6 new tests (13 total)
- **Available players endpoint** (Step 25.5)
  - `api/leagues/[id]/players.ts`: GET with pagination, position filter, name search, sorting
  - Query params: drafted, page, pageSize, position, search, sortBy, sortOrder
  - 10 tests
- **Draft store wiring** (Step 25.6)
  - Added `fetchAvailablePlayers` to draft-service.ts and draftStore.ts
  - Transforms PlayerPoolRow[] to AvailablePlayer[] from player_card JSONB
  - 5 tests
- **Draft board wiring** (Step 25.7)
  - `DraftBoardPage.tsx` now calls `fetchAvailablePlayers(league.id)` alongside `fetchDraftState` on mount
  - Updated DraftBoardPage test mocks to include fetchAvailablePlayers
- **Draft pick marks player as drafted** (Step 25.8)
  - `api/leagues/[id]/draft.ts`: after roster insert, updates player_pool `is_drafted=true` for all seasons of the player
  - Non-fatal: pool update failure does not fail the pick
  - 3 new tests (26 total)

### Metrics
- Vitest: 2,354 -> 2,394 (+40 tests, 213 test files)
- New source files: 3 (load-pipeline.ts, load-csvs.ts, players.ts)
- New test files: 5
- Modified source files: 5 (database.ts, leagues/index.ts, draft.ts, draft-service.ts, draftStore.ts, useDraft.ts, DraftBoardPage.tsx, csv/index.ts)
- Modified test files: 2 (leagues/index.test.ts, draft.test.ts, DraftBoardPage.test.tsx)
- New migrations: 2 (00016, 00017)
- TypeScript: clean build, no errors

## 2026-02-10 - SRD Gap Closure (Phase 24)

### Phase 24: AI Service Wiring (REQ-AI-006, REQ-AI-007, REQ-AI-008)

All 5 AI features wired from backend infrastructure to UI using template-first pattern with optional Claude enhancement. Each feature renders immediately with template output; Claude API is opt-in per item (REQ-AI-007) with graceful degradation to templates on failure (REQ-AI-008).

- **Commentary wiring** (Step 24.1)
  - `useCommentary` hook: template commentary per play, optional `enhancePlay(index)` for Claude
  - `CommentarySection` component: wraps CommentaryPanel + "Enhance with AI" button
  - Wired into `GameViewerPage` replacing hardcoded CommentaryPanel
  - Added `playerNames: Record<string, string>` to `GameResult` for player name resolution
  - 14 tests (9 hook + 5 component)
- **Game summary wiring** (Step 24.2)
  - `useGameSummary` hook: template summary immediate, optional `fetchAiSummary()`
  - `GameSummaryPanel` component: headline + summary + "Generate AI Recap" button
  - Wired into `GameViewerPage` after box score with `gameSummaryRequest` useMemo
  - 12 tests (7 hook + 5 component)
- **Trade evaluation wiring** (Step 24.3)
  - `useTradeEvaluation` hook: template eval immediate, optional `fetchAiEval()`
  - `TradeEvaluationPanel` component: recommendation badge + reasoning + value diff
  - Added `onSelectionChange` callback to `TradeForm` for live trade tracking
  - Wired into `TransactionsPage` next to TradeForm
  - 11 tests (6 hook + 5 component)
- **Draft reasoning wiring** (Step 24.4)
  - `useDraftReasoning` hook: template reasoning from last pick, optional `fetchAiReasoning()`
  - `DraftReasoningPanel` component: reasoning text + source badge + "Get AI Reasoning" button
  - Wired into `DraftBoardPage` below DraftTicker
  - 9 tests (5 hook + 4 component)
- **Manager decisions wiring** (Step 24.5)
  - `detectDecisions()`: Pure function detecting IBB, steal, bunt, pitcher changes from play-by-play
  - `useManagerExplanations` hook: template explanations with per-decision Claude opt-in
  - `ManagerDecisionsPanel` component: decision list with explanations + "Enhance" buttons
  - Wired into `GameViewerPage` with `detectedDecisions` useMemo
  - 18 tests (8 detector + 6 hook + 4 component)

### Metrics
- Vitest: 2,291 -> 2,354 (+63 tests, 208 test files)
- New source files: 5 hooks, 5 components, 1 detector (11 files)
- New test files: 11
- Modified: `GameViewerPage.tsx`, `TransactionsPage.tsx`, `TradeForm.tsx`, `DraftBoardPage.tsx`, `game-runner.ts`, `game.ts`
- TypeScript: clean build, no errors

## 2026-02-10 - SRD Gap Closure (Phase 23)

### Phase 23: Playoff Pipeline (REQ-LGE-008)
- **Bracket advancement logic** (Step 23.1)
  - `advanceWinners(bracket)`: Propagates WC winners to DS (re-seeded by record), DS winners to CS, CS winner to championId
  - `isBracketComplete(bracket)`: Checks if championId is set
  - 21 tests covering all advancement paths, idempotency, immutability
- **Full bracket structure** (Step 23.2)
  - `FullPlayoffBracket` type: AL bracket + NL bracket + World Series + worldSeriesChampionId
  - `generateFullPlayoffBracket()`: Creates both league brackets (without WS round) + standalone WS
  - `recordFullBracketGameResult()`: Routes game result to correct bracket (AL/NL/WS)
  - `getNextFullBracketGame()`: Finds next game across all brackets
  - `advanceFullBracketWinners()`: Advances within leagues + populates WS when both champions set
  - `isFullBracketComplete()`: Checks worldSeriesChampionId
  - Refactored `generatePlayoffBracket` to use shared `buildBracketRounds` helper
  - 16 tests
- **Bracket persistence** (Step 23.3)
  - Migration `00015_add_playoff_bracket.sql`: JSONB column on leagues table
  - Added `playoff_bracket` to `LeagueRow`, `LeagueInsert`, `LeagueSummary`
  - Added `playoffBracket` to `LeagueState`, `LeagueStore`, `useLeague` hook
  - 6 tests
- **Season-to-playoffs transition** (Step 23.4)
  - `checkAndTransitionToPlayoffs()`: When day >= 162 and no incomplete games, generates bracket, updates status to 'playoffs'
  - Builds `DivisionStandings` from team DB rows with snake_case conversion
  - Wired into simulate endpoint (empty-schedule path)
  - 10 tests
- **Playoff game simulation** (Steps 23.5 + 23.6)
  - `simulatePlayoffGame()`: Full pipeline -- load bracket, find next game, load rosters, build RunGameConfig, run game, record result, advance winners, persist, insert game_log
  - `loadTeamConfig()`: Builds lineup, batter cards, pitchers from roster DB entries
  - Playoffs-to-completed: Sets league status to 'completed' when `isFullBracketComplete()` returns true
  - Wired into simulate endpoint (playoffs status path)
  - 14 tests
- **Playoffs UI** (Step 23.7)
  - Updated `PlayoffsPage` to load persisted bracket from `useLeague().playoffBracket`
  - Renders AL bracket, NL bracket, and World Series in 3-column layout
  - Champion banner when `worldSeriesChampionId` is set
  - Visible in both 'playoffs' and 'completed' status
  - 8 tests (updated from 5)

### Metrics
- Vitest: 2,221 -> 2,291 (+70 tests, 197 test files)
- New source files: `playoff-transition.ts`, `simulate-playoff-game.ts`, migration `00015`
- Modified: `playoff-bracket.ts`, `schedule.ts`, `database.ts`, `league.ts`, `leagueStore.ts`, `useLeague.ts`, `simulate.ts`, `PlayoffsPage.tsx`
- TypeScript: clean build, no errors

## 2026-02-10 - SRD Gap Closure (Phase 22)

### Phase 22: Polish + NFR Compliance (REQ-NFR-018, REQ-ARCH-004a)
- **Self-hosted fonts** (REQ-NFR-018): No more Google Fonts CDN dependency
  - Downloaded woff2 variable font files for Roboto Slab and JetBrains Mono (Latin subset)
  - Created `src/styles/fonts.css` with `@font-face` declarations (`font-display: swap`)
  - Removed Google Fonts CDN links from `index.html`
  - Added `fonts.css` import to `main.tsx`
- **Default exports** (REQ-ARCH-004a): Added `export default ComponentName` to all 61 component/feature `.tsx` files
  - Named exports preserved for backward compatibility
  - Includes class component (ErrorBoundary)
- **Updated `tests/TRACEABILITY.md`** with Phase 17-22 requirement mappings
- **Cleaned up** temp script file (Rule 5)

### Metrics
- Vitest: 2,218 -> 2,221 (+3 tests, 192 test files)
- New test file: `fonts.test.ts` (3 tests: font files exist, no CDN refs)
- TypeScript: clean build, no errors
- Vite: production build succeeds

## 2026-02-10 - SRD Gap Closure (Phase 21)

### Phase 21: PlayerProfileModal + AI Commentary (REQ-UI-009, REQ-UI-010, REQ-DFT-005)
- **Created `src/components/baseball/PlayerProfileModal.tsx`** (REQ-UI-009)
  - "Digital Baseball Card" popup: batting attributes, pitcher attributes, fielding section
  - POWER_LABELS map (None to Excellent), pctLabel helper, StatRow sub-component
  - Props: `player: PlayerCard`, `isOpen: boolean`, `onClose: () => void`
- **Created `src/features/game-viewer/CommentaryPanel.tsx`** (REQ-UI-010)
  - Displays commentary entries with TypewriterText effect for latest entry
  - Shows inning labels before each entry
- **Updated `src/features/draft/AvailablePlayersTable.tsx`** (REQ-DFT-005)
  - Added Pwr, Spd, ERA stat columns with sortable headers
  - Added SortableHeader sub-component with SortKey/SortDir state
  - Added `onPlayerClick` optional prop for PlayerProfileModal integration
  - Default sort: name ascending, clicking toggles asc/desc
- **Updated `src/features/game-viewer/GameViewerPage.tsx`** -- integrated CommentaryPanel
  - Renders commentary from last 10 play-by-play entries
- **Updated `src/features/roster/RosterPage.tsx`** -- integrated PlayerProfileModal
  - Player names in LineupDiamond and BenchPanel now clickable
- **Updated `src/features/roster/BenchPanel.tsx`** -- added `onPlayerClick` prop
- **Updated `src/features/roster/LineupDiamond.tsx`** -- added `onPlayerClick` prop
- **Updated `src/features/draft/DraftBoardPage.tsx`** -- integrated PlayerProfileModal
  - Player names in AvailablePlayersTable now clickable for profile preview

### Metrics
- Vitest: 2,201 -> 2,218 (+17 tests, 191 test files)
- New test files: `PlayerProfileModal.test.tsx` (8), `CommentaryPanel.test.tsx` (5)
- Updated: `AvailablePlayersTable.test.tsx` (+4 tests)
- TypeScript: clean build, no errors
- Vite: production build succeeds

## 2026-02-10 - SRD Gap Closure (Phases 19-20)

### Phase 19: Transaction Service + UI Wiring (REQ-RST-005)
- **Created `src/services/transaction-service.ts`** -- thin wrappers for drop/add/trade/history
  - `dropPlayer()`, `addPlayer()`, `submitTrade()`, `fetchTransactionHistory()`
- **Updated `src/features/transactions/TransactionsPage.tsx`** -- wired real service calls
  - `handleDrop` calls dropPlayer, refreshes roster
  - `handleTargetChange` loads target team roster via fetchRoster
  - `handleTrade` calls submitTrade, refreshes roster and history
  - Transaction history loaded on mount via useEffect

### Phase 20: Dashboard + League UI + FIP (REQ-LGE-010/003, REQ-UI-007, REQ-STS-005)
- **Added FIP (Fielding Independent Pitching)** to stats system:
  - Added `FIP` field to `PitchingStats` interface
  - Added `computeFIP(hr, bb, hbp, so, ip)` to `src/lib/stats/derived.ts`
  - Updated `computeDerivedPitching()` to include FIP
  - Updated `computePitchingDerived()` in pitching-loader to compute FIP from CSV data
  - Added FIP column to `PITCHING_COLUMNS_ADVANCED` in StatColumnConfigs
- **Created `src/features/dashboard/ResultsTicker.tsx`** (REQ-UI-007)
  - Horizontal scrolling game results feed with clickable game cards
- **Created `src/features/league/InviteKeyDisplay.tsx`** (REQ-LGE-003)
  - Displays invite key with copy-to-clipboard functionality
- **Created `src/features/league/DeleteLeagueButton.tsx`** (REQ-LGE-010)
  - Destructive action with typed-name confirmation dialog
- **Updated `DashboardPage.tsx`** -- integrated ResultsTicker and InviteKeyDisplay (setup status)
- **Updated `LeagueConfigPage.tsx`** -- shows InviteKeyDisplay after league creation

### Metrics
- Vitest: 2,173 -> 2,201 (+28 tests, 189 test files)
- New test files: `ResultsTicker.test.tsx` (5), `InviteKeyDisplay.test.tsx` (4), `DeleteLeagueButton.test.tsx` (5)
- Updated: `derived.test.ts` (+5 FIP), `pitching-loader.test.ts` (+2 FIP), `transaction-service.test.ts` (7)
- TypeScript: clean build, no errors
- Vite: production build succeeds

## 2026-02-10 - SRD Gap Closure (Phases 17-18)

### Phase 17: Manager AI Completion (REQ-AI-002)
- Extended `GameSituation` with optional `bestBenchOps`, `batterOps`, `platoonAdvantage` fields
- Added `evaluateHitAndRunDecision()` -- runner on 1B only, < 2 outs, baseFactor = contactRate
- Added `evaluatePinchHitDecision()` -- bench OPS vs batter OPS, platoon advantage multiplier
- Added `evaluateAggressiveBaserunning()` -- extra-base advance on singles, baseFactor = runnerSpeed
- Integrated all 3 decisions into `game-runner.ts`:
  - Hit-and-run: DP converted to GROUND_OUT_ADVANCE, runner advances extra base on single
  - Pinch-hit: best bench player by OPS swaps into lineup permanently
  - Aggressive baserunning: runner on 2B scores on single, runner on 1B advances to 3B
- Added `homeBench`/`awayBench` to `RunGameConfig`, local mutable batter card copies for determinism

### Phase 18: Draft Engine + AI Drafter (REQ-DFT-001/002/006/007/008, REQ-AI-008)
- **Created `src/lib/draft/draft-engine.ts`** -- State machine composing draft-order + ai-strategy + roster-validator
  - `initializeDraft()`, `getCurrentPickingTeam()`, `getAvailablePool()`, `submitDraftPick()`, `isDraftComplete()`, `completeDraft()`
  - Turn validation, snake-draft order management, post-draft roster auto-fill
- **Created `src/lib/draft/ai-drafter.ts`** -- Composes ai-strategy + template-draft-reasoning
  - `makeAIPick()` selects player via AI strategy, generates template-based reasoning
  - `runFullAIDraft()` iterates all picks for AI-controlled teams, skips human teams
- **Updated `api/leagues/[id]/draft.ts`**:
  - `handleStart` generates and stores draft order via `generateDraftOrder()`
  - `handlePick` validates turn order via `getPickingTeam()`, checks for completion, transitions to `regular_season`
  - Added `handleAutoPick` action for timer-expired auto-picks (commissioner-only)
- **Updated `src/services/draft-service.ts`** -- added `autoPick()` function
- **Updated `src/services/index.ts`** -- exported `autoPick`

### Metrics
- Vitest: 2,099 -> 2,173 (+74 tests, 185 test files)
- New test files: `draft-engine.test.ts` (33), `ai-drafter.test.ts` (12)
- Updated: `manager-ai.test.ts` (+17), `game-runner.test.ts` (+4), `draft.test.ts` (+5), `draft-service.test.ts` (+2)
- TypeScript: clean build, no errors
- Vite: production build succeeds

## 2026-02-10 - SRD Gap Closure (Phases 12-16)

### Phase 12: Database Schema + Config
- **12A:** Migration `00014_alter_game_logs_columns.sql` adding `game_id`, `innings`, pitcher IDs, `batting_lines`, `pitching_lines` to `game_logs`
- **12B:** Client config module `src/lib/config.ts` (REQ-ENV-003/004) with fail-fast validation of `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- **12C:** Server config module `api/_lib/config.ts` (REQ-ENV-005) with `getServerConfig()` lazy initialization

### Phase 13: Error Handling Hardening
- **13A:** PostgreSQL error code mapping (REQ-ERR-019/020) in `api/_lib/errors.ts` -- maps PG codes 23505, 23503, 23502, 23514, 40001, 57014, 42P01 to structured error categories with constraint-to-message lookup
- **13B:** Structured JSON logging `api/_lib/logger.ts` (REQ-ERR-013/014) -- `{ timestamp, level, requestId, code, message, context }` format
- **13C:** DB retry wrapper `api/_lib/db-retry.ts` (REQ-ERR-015/016) -- 3 retries, exponential backoff (200/400/800ms), retries transient errors only

### Phase 14: Validation Schemas
- **14A:** Roster schemas `src/lib/validation/roster-schemas.ts` (REQ-ERR-005) -- `rosterActionSchema`, `tradeSchema`, `lineupSchema` with Zod
- **14B:** Simulation/team schemas `src/lib/validation/simulation-schemas.ts` (REQ-ERR-006) -- `simulateSchema`, `updateTeamSchema`

### Phase 15: Wire Up UI Features
- **15A:** Dashboard simulation controls (REQ-SCH-005) -- wired `onSimulate` to `runSimulation` with scope-to-days mapping
- **15B:** GameViewer tabs (REQ-UI-010) -- Play-by-Play / Box Score tab navigation with PlayByPlayFeed and BoxScoreDisplay
- **15C:** ArchivePage data + StampAnimation (REQ-UI-011, REQ-SCH-009) -- `useArchive` hook fetches from API, StampAnimation renders on season completion
- **15D:** PlayoffsPage live bracket (REQ-UI-012) -- `generatePlayoffBracket()` from standings data
- **15E:** RosterPage interactions (REQ-UI-008) -- position selection + bench-to-lineup swap via `updateRosterSlot`, with displaced starter sent to bench
- **15F:** StatsPage sorting (REQ-STS-003) -- client-side sorting with smart defaults (ERA ascending, batting stats descending), fixed nested stats property resolution bug

### Phase 16: Cleanup
- Deleted 3 stale mock service files (`mock-league-service.ts`, `mock-stats-service.ts`, `mock-roster-service.ts`)
- Removed 6 empty placeholder directories and ~35 redundant `.gitkeep` files from directories with real content
- Fixed TRACEABILITY.md: corrected `card-gen/` paths to `card-generator/`, added Phase 12-15 requirement entries
- Cleaned stale comments referencing deleted mock services

### Metrics
- Vitest: 1,978 -> 2,099 (+121 tests, 183 test files)
- TypeScript: clean build, no errors
- Vite: production build succeeds (3.05s)

## 2026-02-09 - API Route Consolidation (24 -> 12 Serverless Functions)

### Changed
- Consolidated 24 API route handlers into 12 to fit Vercel Hobby plan limit
- **Merge A:** 5 AI endpoints -> `api/ai/index.ts` with `?feature=` query param routing
- **Merge B:** 3 Stats endpoints -> `api/leagues/[id]/stats.ts` with `?type=batting|pitching|team`
- **Merge C:** 3 Draft endpoints -> `api/leagues/[id]/draft.ts` (GET=state, POST action=start|pick)
- **Merge D:** 2 Archive endpoints -> `api/leagues/[id]/archive.ts` (GET=list, POST=archive)
- **Merge E:** join.ts merged into `api/leagues/[id]/index.ts` as POST method
- **Merge F:** 3 Teams endpoints -> `api/leagues/[id]/teams.ts` with `?tid=` and `?include=roster`
- Updated 5 client services: ai-service, stats-service, draft-service, league-service, roster-service

### Removed
- 17 handler files (5 AI, 3 stats, 3 draft, 1 archives, 1 join, 4 teams)
- 17 corresponding test files (consolidated into 4 new unified test files)

### Metrics
- Vitest: 1,985 -> 1,978 (175 test files) -- all passing
- Serverless functions: 24 -> 12 (within Vercel Hobby plan limit)

## 2026-02-09 - Phase 11: Final Polish & Hardening

### Added
- **StatTable Virtualization** (Sub-phase 11A, REQ-NFR-004):
  - Integrated `@tanstack/react-virtual` into `StatTable.tsx` for datasets > 50 rows
  - Scroll container with `max-h-[600px]`, spacer rows, sticky thead
  - 600-row datasets render < 50 DOM rows; small datasets unchanged
- **Trade Execution Logic** (Sub-phase 11B, REQ-RST-005, REQ-RST-006):
  - `src/lib/draft/trade-validator.ts` -- Pure function validating roster composition post-swap
  - Extended `api/leagues/[id]/transactions.ts` with atomic trade handler (delete + insert pattern)
  - Rewrote `TradeForm.tsx` with player selection checkboxes for both sides
- **Anonymous Auth** (Sub-phase 11C, REQ-AUTH-001):
  - Added `loginAsGuest()` to `useAuth` hook via `supabase.auth.signInAnonymously()`
  - Added "Play as Guest" button to `LoginPage.tsx`
- **Web Worker Integration** (Sub-phase 11D, REQ-NFR-008):
  - `src/hooks/useWorkerSimulation.ts` -- React hook wrapping `simulateGameInWorker()`
  - Wired into `GameViewerPage.tsx` for client-side game replay with status display
- **pgTAP RLS Tests** (Sub-phase 11E, REQ-MIG-009):
  - Replaced `ok(true)` placeholders in all 6 pgTAP test files with 40 real assertions
  - Tests cover commissioner/member/outsider SELECT, INSERT, UPDATE, DELETE per table
  - Tables: leagues (8), teams (8), rosters (8), schedule (6), season_stats (6), game_logs (4)
- **GitHub Actions CI** (Sub-phase 11F, REQ-TEST-015):
  - `.github/workflows/ci.yml` -- Lint + type-check (app + API) + vitest coverage + benchmarks
  - `.github/workflows/e2e.yml` -- Playwright chromium-only for CI
- **E2E Test Expansion** (Sub-phase 11G, REQ-TEST-017):
  - 3 page objects: `login.page.ts`, `dashboard.page.ts`, `league-config.page.ts`
  - Auth fixture: `fixtures/auth.ts` with Supabase route interception
  - 5 new spec files: `guest-login.spec.ts` (3), `league-creation.spec.ts` (5), `draft-board.spec.ts` (4), `simulation.spec.ts` (4), `roster.spec.ts` (4)

### Modified
- `playwright.config.ts` -- CI-only single browser (chromium) via `process.env.CI` check
- `src/features/transactions/TransactionsPage.tsx` -- Passes `targetRoster` prop to TradeForm

### Metrics
- Vitest: 1,946 -> 1,985 (+39 new, 187 test files)
- E2E: 15 -> 35 (+20 new, 9 spec files)
- pgTAP: 0 -> 40 assertions (6 SQL test files)
- Sub-phases: 11A-11G (virtualization, trade, anon auth, worker, pgTAP, CI, E2E)
- All SRD gaps from audit closed

## 2026-02-09 - Phase 10: Feature UI Implementation

### Added
- **Shared Form Components** (Sub-phase 10A):
  - `src/components/forms/Input.tsx` -- Text input with label, error state, aria-describedby
  - `src/components/forms/Select.tsx` -- Dropdown with label and SelectOption type
  - `src/components/forms/Toggle.tsx` -- Accessible switch with role="switch", aria-checked
  - `src/components/forms/ConfirmDialog.tsx` -- Modal with focus trap, Escape key, overlay click
- **Baseball + Feedback Components** (Sub-phase 10B):
  - `src/components/baseball/DiamondField.tsx` -- SVG diamond (viewBox 400x360) with 9 positions, click-to-assign
  - `src/components/baseball/PlayerCardDisplay.tsx` -- Modal digital baseball card with vintage styling
  - `src/components/baseball/Scoreboard.tsx` -- Compact game state composing BaseIndicator
  - `src/components/feedback/ProgressBar.tsx` -- Linear progress bar with role="progressbar"
- **Draft Store + Hooks** (Sub-phase 10C):
  - `src/stores/draftStore.ts` -- Zustand store for draft state, available players, pick timer
  - `src/hooks/useDraft.ts` -- Composes authStore + leagueStore + draftStore, derives isMyPick
  - `src/hooks/useRealtimeProgress.ts` -- Simulation progress subscription with cache invalidation (REQ-STATE-014)
  - `src/hooks/usePostseasonTheme.ts` -- Sets data-theme="postseason" on html during playoffs (REQ-COMP-002)
- **League Config + Join Pages** (Sub-phase 10D):
  - `src/features/league/LeagueConfigForm.tsx` -- Form sub-component with validation
  - Replaced LeagueConfigPage and JoinLeaguePage stubs with full implementations
- **Draft Board Page** (Sub-phase 10E):
  - `src/features/draft/DraftTicker.tsx` -- Vertical scrolling pick list with role="log"
  - `src/features/draft/AvailablePlayersTable.tsx` -- Sortable/filterable table with search and position filter
  - `src/features/draft/PickTimer.tsx` -- 60s countdown with urgency styling at <10s
  - `src/features/draft/RosterPreviewPanel.tsx` -- Team roster preview filtered by teamId
  - Replaced DraftBoardPage stub with 3-panel layout (ticker, players, roster)
- **Roster Management Page** (Sub-phase 10F):
  - `src/features/roster/LineupDiamond.tsx` -- Wraps DiamondField with lineup editing
  - `src/features/roster/BenchPanel.tsx` -- Bench player list with "Add to Lineup" action
  - `src/features/roster/PitchingRotation.tsx` -- SP1-SP4 with NEXT indicator, bullpen, closer
  - Replaced RosterPage stub with full lineup, bench, and pitching rotation views
- **Game Viewer Page** (Sub-phase 10G):
  - `src/features/game-viewer/PlayByPlayFeed.tsx` -- Scrolling play-by-play with auto-scroll
  - `src/features/game-viewer/BoxScoreDisplay.tsx` -- Full box score composing LineScore
  - `src/features/game-viewer/GameStatePanel.tsx` -- Live game state composing Scoreboard
  - `tests/fixtures/mock-game.ts` -- Factory functions for game results, plays, box scores
  - Replaced GameViewerPage stub with route-param-based game result display
- **Transactions Page** (Sub-phase 10H):
  - `src/features/transactions/AddDropForm.tsx` -- Drop player from roster form
  - `src/features/transactions/TradeForm.tsx` -- Trade proposal with team selection
  - `src/features/transactions/TransactionLog.tsx` -- Transaction history with type badges
  - Replaced TransactionsPage stub with tab layout (Add/Drop, Trade, History)
- **Playoffs + Archive Pages** (Sub-phase 10I):
  - `src/features/playoffs/PlayoffBracketView.tsx` -- Visual bracket with rounds and champion
  - `src/features/playoffs/SeriesCard.tsx` -- Individual series matchup card
  - `src/features/archive/SeasonList.tsx` -- Archived seasons list
  - `src/features/archive/SeasonDetail.tsx` -- Season drill-down with standings
  - Replaced PlayoffsPage and ArchivePage stubs with full implementations

### Modified
- `src/features/dashboard/SimulationControls.tsx` -- Added `leagueStatus` prop; locks to single-game mode during playoffs (REQ-COMP-002)
- `src/styles/globals.css` -- Postseason CSS custom property overrides already present from Phase 1

### Metrics
- Tests: 1,813 -> 1,946 (+133 new, 184 test files)
- Source files: ~260 -> ~295 (+35)
- Sub-phases: 10A-10J (forms, baseball components, draft store/hooks, league pages, draft board, roster, game viewer, transactions, playoffs/archive, polish)
- All 8 stub pages replaced with functional implementations

## 2026-02-09 - Phase 9: Performance & Polish (Final SRD Phase)

### Added
- **Game Orchestrator** (`src/lib/simulation/game-runner.ts`):
  - `runGame(config): GameResult` -- Full game loop tying together all 15+ simulation modules
  - Plate appearance -> outcome resolution -> baserunning -> defense -> stolen bases -> pitching fatigue -> manager AI
  - Pure, deterministic execution via SeededRNG; walk-off detection, extra innings, pitching changes
  - Builds GameResult via `buildBoxScore()`, `buildLineScore()`, `assignPitcherDecisions()`
- **Season Runner** (`src/lib/simulation/season-runner.ts`):
  - `runDay(dayNumber, games, seed): DayResult` -- Batch-processes all games for one day
  - `runSeason(schedule, startDay, endDay, seed): SeasonResult` -- Iterates days with cumulative stats
  - Memory-safe: strips play-by-play after each day per REQ-NFR-010
- **Web Worker** (`src/workers/simulation-worker.ts`, `src/lib/simulation/worker-api.ts`):
  - Client-side simulation in Web Worker keeps UI thread at 60fps (REQ-NFR-008)
  - Map serialization/deserialization for structured clone compatibility
  - Main-thread fallback when Worker unavailable (Node/SSR environments)
- **Server-side Simulation** (`api/_lib/simulate-day.ts`):
  - `simulateDayOnServer()` -- Fetches team data, runs `runDay()`, commits results via PostgreSQL RPC
  - Atomic transaction: inserts game_logs, updates season_stats, updates standings (REQ-NFR-014)
- **Simulate Day RPC** (`supabase/migrations/00013_simulate_day_rpc.sql`):
  - PostgreSQL function `simulate_day_commit(league_id, day_results)` for atomic multi-table writes (REQ-NFR-016)
- **StampAnimation** (`src/components/feedback/StampAnimation.tsx`):
  - CSS-only stamp-slam animation for "SEASON COMPLETED" overlay (REQ-SCH-009, REQ-COMP-011)
  - Respects `prefers-reduced-motion` media query
- **Traditional/Advanced Stats Toggle** (REQ-STS-005):
  - `StatColumnConfigs.ts` -- 4 column sets: BATTING_COLUMNS_TRADITIONAL/ADVANCED, PITCHING_COLUMNS_TRADITIONAL/ADVANCED
  - Traditional: AVG, HR, RBI, ERA, W, SV; Advanced: OPS, OBP, SLG, WHIP, K/9
  - Toggle button in StatsPage with persisted preference via statsStore
- **Performance Benchmarks** (`tests/bench/`):
  - `simulation.bench.ts` -- Single game < 500ms (REQ-NFR-001), 10-game day < 5s, 20-game batch < 10s (REQ-NFR-002)
  - `csv-parse.bench.ts` -- CSV parse timing (REQ-NFR-003)
  - Implemented as timed tests with `performance.now()` assertions
- **Determinism Tests** (`tests/unit/lib/simulation/determinism.test.ts`):
  - REQ-NFR-007 + REQ-TEST-014: Same seed produces identical scores, play-by-play, box scores, batting lines
  - Different seeds produce different results; deterministic across 5 consecutive runs
- **Traceability Matrix** (`tests/TRACEABILITY.md`):
  - REQ-TEST-011: Full requirement-to-test mapping for all REQ-* identifiers
- **E2E Tests** (`tests/e2e/`):
  - `splash.spec.ts` -- Landing page title, Create/Join links (3 tests)
  - `auth.spec.ts` -- Login form fields, submit button, validation, splash link (4 tests)
  - `navigation.spec.ts` -- Auth redirect, 404 page, return home link (4 tests)
  - `stats.spec.ts` -- Auth guard verification for stats/roster/standings/draft routes (4 tests)

### Modified
- `api/leagues/[id]/simulate.ts` -- Replaced stub with real simulation logic (single-day sync, multi-day async)
- `vite.config.ts` -- Added manual chunk splitting (vendor/simulation/ui) and Web Worker support (REQ-NFR-017)
- `vitest.config.ts` -- Added coverage thresholds: 60% statements, 50% branches, 55% functions, 60% lines (REQ-TEST-003/004)
- `playwright.config.ts` -- Added Firefox and WebKit projects for multi-browser E2E (REQ-TEST-017)
- `src/features/stats/StatsPage.tsx` -- Added traditional/advanced toggle button
- `src/stores/statsStore.ts` -- Added `statView` state with localStorage persistence
- `src/styles/globals.css` -- Added stamp-slam/cursor-blink keyframes, reduced-motion overrides
- `index.html` -- Added font preload with Latin subset for ~60% size reduction (REQ-NFR-018)

### Metrics
- Tests: 1,749 -> 1,813 (+64 new, 148 test files)
- Source files: ~244 -> ~260 (+16)
- Sub-phases: 9A (game orchestrator), 9B (web worker + API), 9C (stats toggle + animations), 9D (benchmarks + determinism), 9E (E2E tests)
- All SRD requirements addressed

## 2026-02-09 - Phase 8: AI Enhancement (REQ-AI-006, REQ-AI-007, REQ-AI-008)

### Added
- **AI Type Definitions** (`src/lib/types/ai.ts`):
  - CommentaryStyle, AiSource, ManagerDecisionType type aliases
  - Request/Response interfaces for all 5 AI features: Commentary, GameSummary, TradeEvaluation, DraftReasoning, ManagerExplanation
  - Barrel re-exports via `src/lib/types/index.ts`
- **Template Fallback Engine** (REQ-AI-008 -- graceful degradation):
  - `src/lib/ai/commentary-templates.ts` -- 250+ template strings covering 26 OutcomeCategory x 3 styles (newspaper/radio/modern) x 3 situations (routine/clutch/dramatic)
  - `src/lib/ai/template-commentary.ts` -- Deterministic commentary selection via hash(batterId + inning + outs), situation detection (routine/clutch/dramatic)
  - `src/lib/ai/template-game-summary.ts` -- Headline variants (Rout/Cruise/Nip/Top/Edge), lead paragraph, highlights, line score
  - `src/lib/ai/template-trade-eval.ts` -- Manager personality thresholds (conservative +15%, aggressive -5%, balanced +5%, analytical +10% with positional premiums)
  - `src/lib/ai/template-draft-reasoning.ts` -- Round-aware reasoning (early/mid/late tiers matching ai-strategy.ts)
  - `src/lib/ai/template-manager-explanation.ts` -- Decision type x personality templates for steal/bunt/IBB/pull decisions
- **Claude API Client** (`api/_lib/claude-client.ts`):
  - Anthropic SDK wrapper with 10s timeout, 3 retries with exponential backoff (1s/2s/4s)
  - `isClaudeAvailable()` checks for ANTHROPIC_API_KEY
  - `callClaude()` returns null on failure (callers use templates)
- **Prompt Builders** (`api/_lib/prompts/`):
  - 5 prompt builder modules: commentary, game-summary, trade-eval, draft-reasoning, manager-explanation
  - Style-specific system prompts with structured user prompts
- **AI Error Codes** (`src/lib/errors/error-codes.ts`):
  - Added CLAUDE_TIMEOUT, CLAUDE_MALFORMED, CLAUDE_UNAVAILABLE codes
  - Added `createExternalError()` factory for 502 responses
- **AI API Endpoints** (`api/ai/`):
  - POST /api/ai/commentary -- Play-by-play commentary
  - POST /api/ai/game-summary -- Post-game newspaper recap
  - POST /api/ai/trade-eval -- Trade evaluation with manager personality
  - POST /api/ai/draft-reasoning -- Draft pick explanation
  - POST /api/ai/manager-explanation -- In-game decision explanation
  - All endpoints: checkMethod(POST) -> requireAuth -> validateBody(Zod) -> callClaude -> template fallback -> ok(200)
- **Client AI Service** (`src/services/ai-service.ts`):
  - 5 functions: generateCommentary, generateGameSummary, evaluateTrade, generateDraftReasoning, explainManagerDecision
  - Barrel re-export via `src/services/index.ts`

### Metrics
- Tests: 1,688 -> 1,749 (+61 new, 17 test files)
- Source files: ~224 -> ~244 (+20)
- AI endpoints: 0 -> 5
- Template fallbacks: 0 -> 5
- Lint errors: 19 pre-existing (unchanged)

## 2026-02-09 - Phase 7: Integration Layer (REQ-MIG, REQ-API, REQ-DATA-007, REQ-NFR-005/015/019)

### Added
- **SQL Migrations** (REQ-MIG-001 through REQ-MIG-013):
  - 12 migration files in `supabase/migrations/` -- leagues, teams, rosters, schedule, season_stats, game_logs, archives, simulation_progress tables; indexes; RLS enable + policies; season_year column
  - `supabase/seed.sql` -- Idempotent seed data (3 users, 1 league, 8 teams, 168 players, 20 schedule days, stats)
  - 6 pgTAP RLS test stubs in `supabase/tests/` (require Docker to execute)
- **Database TypeScript Types** (REQ-API-008):
  - `src/lib/types/database.ts` -- Row/Insert/Update types per table; Database interface matching Supabase gen types format; Relationships metadata
- **Supabase Client Wrappers**:
  - `src/lib/supabase/client.ts` -- Browser client singleton with VITE_SUPABASE_URL/ANON_KEY
  - `src/lib/supabase/server.ts` -- Server client for API functions with SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)
- **API Infrastructure** (`api/_lib/`):
  - `response.ts` -- ok/created/accepted/noContent/paginated helpers with X-Request-Id and ApiResponse envelope
  - `errors.ts` -- handleApiError mapping AppError categories to HTTP status codes (400/401/403/404/409/429/500)
  - `validate.ts` -- Zod-based validateBody/validateQuery with AppError transformation
  - `auth.ts` -- requireAuth extracting Bearer token, verifying via Supabase auth.getUser()
  - `transform.ts` -- Deep recursive snakeToCamel/camelToSnake field conversion (REQ-API-008)
  - `method-guard.ts` -- HTTP method validation returning 405
- **API Endpoints** (~20 files in `api/leagues/`):
  - League CRUD: POST create, GET by ID, DELETE (commissioner only), POST join via invite_key
  - Team/Roster: GET list teams, PATCH update team, GET roster
  - Standings/Schedule: GET computed standings, GET schedule with optional day filter
  - Statistics: GET paginated batting/pitching leaders (REQ-NFR-019), GET team aggregate stats
  - Simulation: POST sync (1 day, 200) or async (multi-day, 202) with simulation_progress
  - Game detail: GET box score + play-by-play
  - Draft: POST start, POST pick with turn validation, GET state
  - Transactions: POST add/drop/trade with roster limit validation
  - Archive: POST archive season (commissioner only), GET list past seasons
- **Client Service Layer** (`src/services/`):
  - `api-client.ts` -- fetch wrapper with auth headers from Supabase session, envelope unwrapping, error mapping
  - `league-service.ts` -- 7 functions (fetchLeague, createLeague, deleteLeague, joinLeague, fetchTeams, fetchStandings, fetchSchedule)
  - `roster-service.ts` -- 3 functions (fetchRoster, updateTeam, updateLineup)
  - `stats-service.ts` -- 3 functions (fetchBattingLeaders, fetchPitchingLeaders, fetchTeamStats)
  - `simulation-service.ts` -- 3 functions + Supabase Realtime subscription for async sim progress
  - `draft-service.ts` -- 3 functions (startDraft, submitPick, fetchDraftState)
  - `index.ts` -- Barrel re-export of all service functions
- **Store Async Integration** (REQ-STATE-003, REQ-STATE-004):
  - `leagueStore.ts` -- Added fetchLeagueData, fetchStandings, fetchSchedule async actions
  - `rosterStore.ts` -- Added fetchRoster, saveLineup async actions
  - `statsStore.ts` -- Added fetchBattingLeaders, fetchPitchingLeaders, fetchTeamStats async actions
  - `simulationStore.ts` -- Added runSimulation, subscribeToSimProgress, unsubscribeFromSimProgress async actions
  - `authStore.ts` -- Added initialize() with getSession + onAuthStateChange listener
- **Auth Integration**:
  - `useAuth.ts` -- Added login/signup functions calling Supabase Auth
  - `LoginPage.tsx` -- Wired with controlled form, error handling, navigation
  - `AuthGuard.tsx` -- Real auth check with initialization + redirect to /login
- **Test Infrastructure**:
  - `tests/fixtures/mock-supabase.ts` -- Factory for mocked Supabase query builder, request, response

### Changed
- `.eslintrc.cjs` -- Added `argsIgnorePattern: '^_'` for unused vars, `no-explicit-any: off` for test files

### Verification
- `npm test` -- 1,574 tests pass across 122 test files (1,320 existing + 254 new)
- New tests: 65 API infrastructure + 105 API endpoints + 41 services + 43 store/auth = 254
- `npx tsc --noEmit -p api/tsconfig.json` -- API directory compiles clean
- `npx tsc --noEmit` -- Main app: only pre-existing platoon.ts warnings
- `npm run lint` -- 19 pre-existing errors from prior phases; zero new Phase 7 errors
- Plan document: `docs/plans/phase-7-integration.md`

### Phase 7 Complete
5 sub-phases finished (7A-7E). ~64 new source files + ~41 new test files. Full integration layer from SQL schema through API endpoints, client services, to store async actions. Frontend remains functional with mock data; real services ready for Supabase deployment.

## 2026-02-09 - Phase 6: Frontend Foundation (REQ-COMP, REQ-STATE, REQ-ARCH-002)

### Added
- **Feedback Components** (REQ-COMP-003, REQ-ERR-010, REQ-ERR-011):
  - `src/components/feedback/ErrorBanner.tsx` -- Severity-based alert banner (error/warning/info) with auto-dismiss, role="alert"/role="status"
  - `src/components/feedback/LoadingLedger.tsx` -- Animated loading indicator with 3 bouncing dots, role="status"
  - `src/components/feedback/TypewriterText.tsx` -- Character-by-character text reveal with blinking cursor, aria-live="polite"
  - `src/components/feedback/ErrorBoundary.tsx` -- React class error boundary with "Try Again" and "Return to Dashboard" fallback
- **Data Display Components** (REQ-COMP-003, REQ-COMP-004):
  - `src/components/data-display/Pagination.tsx` -- Previous/Next navigation with boundary disabling
  - `src/components/data-display/StatTable.tsx` -- Generic sortable statistics table with StatColumn<T> interface, loading shimmer, row highlighting
  - `src/components/data-display/StandingsTable.tsx` -- Division standings using computeWinPct/computeGamesBehind from Layer 1
- **Baseball Display Components** (REQ-COMP-003):
  - `src/components/baseball/LineScore.tsx` -- Classic baseball line score table (innings, R/H/E)
  - `src/components/baseball/BaseIndicator.tsx` -- SVG diamond with occupied/empty base indicators
- **Layout Components** (REQ-COMP-005, REQ-COMP-012):
  - `src/components/layout/AppShell.tsx` -- Skip-to-content link, main#main-content, ErrorBoundary wrapper
  - `src/components/layout/Header.tsx` -- League nav with postseason variant styling, commissioner-only links
  - `src/components/layout/Footer.tsx` -- Simple footer with role="contentinfo"
- **Router** (REQ-COMP-005, REQ-COMP-006):
  - `src/router.tsx` -- createBrowserRouter with 13+ routes, lazy-loading, AuthGuard, 404 catch-all
  - Updated `src/App.tsx` to use RouterProvider
- **Feature Page Shells** (REQ-COMP-008):
  - 15 feature page files across splash, auth, dashboard, league, draft, roster, stats, game-viewer, playoffs, archive, transactions, standings
- **Zustand Stores** (REQ-STATE-001 through REQ-STATE-016):
  - `src/stores/storage-factory.ts` -- createSafeStorage() with localStorage test + memory fallback
  - `src/stores/authStore.ts` -- User/session/initialization state (devtools)
  - `src/stores/leagueStore.ts` -- League/teams/standings/schedule state (devtools+persist+immer)
  - `src/stores/rosterStore.ts` -- Active team roster state (devtools+persist+immer)
  - `src/stores/simulationStore.ts` -- Simulation progress/results (devtools)
  - `src/stores/statsStore.ts` -- Batting/pitching leaders, pagination (devtools+persist)
- **Mock Services** (Layer 3 stubs):
  - `src/services/mock-league-service.ts` -- Hardcoded league/team/standings/schedule data
  - `src/services/mock-roster-service.ts` -- Hardcoded roster with PlayerCard objects
  - `src/services/mock-stats-service.ts` -- Hardcoded batting/pitching leaders
- **Hooks Layer** (REQ-STATE-006, REQ-STATE-007):
  - `src/hooks/useAuth.ts` -- Composes authStore, derived isAuthenticated
  - `src/hooks/useLeague.ts` -- Composes authStore+leagueStore, derived isCommissioner
  - `src/hooks/useTeam.ts` -- Composes authStore+leagueStore+rosterStore, derived myTeam/starters/bench
  - `src/hooks/useSimulation.ts` -- Composes simulationStore, derived progressPct/isRunning
- **Key Feature Pages** (REQ-COMP-008, REQ-COMP-009):
  - `src/features/dashboard/DashboardPage.tsx` -- League dashboard with standings, schedule, simulation controls
  - `src/features/dashboard/SimulationControls.tsx` -- Day/Week/Month/Season buttons with progress bar
  - `src/features/dashboard/ScheduleView.tsx` -- Game list for current day with scores
  - `src/features/stats/StatsPage.tsx` -- Batting/pitching tabs, AL/NL/combined filter, pagination
  - `src/features/stats/StatColumnConfigs.ts` -- 17 batting + 15 pitching column configs
  - `src/features/standings/StandingsPage.tsx` -- Full standings with division grouping
- **Test Fixtures**:
  - `tests/fixtures/mock-league.ts` -- Factory functions for league/team/standings/schedule data
  - `tests/fixtures/mock-roster.ts` -- Factory functions for roster entries
  - `tests/fixtures/mock-stats.ts` -- Factory functions for batting/pitching leaders

### Verification
- `npm test` -- 1,320 tests pass across 84 test files (1,093 existing + 227 new)
- New tests: 82 components + 30 layout + 48 stores + 30 hooks + 37 features = 227
- `npx tsc --noEmit` -- Only pre-existing platoon.ts warnings
- `npm run lint` -- Zero new errors (20 pre-existing in test files + platoon.ts)
- Plan document: `docs/plans/phase-6-frontend.md`

### Phase 6 Complete
5 sub-phases finished. ~49 new source files + ~28 new test files. Full frontend foundation with components, stores, hooks, routing, and feature pages ready for service integration.

## 2026-02-09 - Phase 5: Schedule & Statistics Pure Logic (REQ-SCH, REQ-STS, REQ-LGE-008)

### Added
- **Derived Stats Calculator** (REQ-STS-002):
  - `src/lib/stats/derived.ts` -- IP baseball notation conversion (ipToDecimal, addIP), batting derived (BA, OBP, SLG, OPS), pitching derived (ERA, WHIP, K/9, BB/9), computeDerivedBatting/computeDerivedPitching
- **Stats Accumulator** (REQ-STS-001):
  - `src/lib/stats/accumulator.ts` -- createEmptyBattingStats, createEmptyPitchingStats, accumulateBatting (immutable, recomputes derived), accumulatePitching (maps decision to W/L/SV/HLD/BS, uses addIP), accumulateGameStats (processes full game)
- **Standings Calculator** (REQ-SCH-006, REQ-STS-004):
  - `src/lib/stats/standings.ts` -- computeWinPct, computeGamesBehind, computePythagorean (RS^2/(RS^2+RA^2)), sortStandings (tiebreak: win%, run diff, runs scored), computeStandings (group by league/division), getDivisionWinners, getWildCardTeams
- **League Leaders** (REQ-STS-003, REQ-STS-004):
  - `src/lib/stats/leaders.ts` -- isBattingQualified (3.1 PA/team game), isPitchingQualified (1 IP/team game), getBattingLeaders/getPitchingLeaders (rate vs counting stat qualification, ERA/WHIP ascending sort), filterByLeague (AL/NL/combined), computeTeamAggregateStats (team BA/OBP/SLG/ERA, Pythagorean W%)
- **Schedule Generator** (REQ-SCH-001 through REQ-SCH-004):
  - `src/lib/schedule/generator.ts` -- Circle method round-robin pairing, division-weighted matchups (intraDivisionWeight), SeededRNG determinism, bye handling for odd team counts, league separation (AL/NL independent)
- **Playoff Bracket** (REQ-LGE-008):
  - `src/lib/schedule/playoff-bracket.ts` -- 2025 MLB format: WC(BO3), DS(BO5), CS(BO7), WS(BO7); seedPlayoffTeams (3 div winners + 3 wild cards), home-field patterns (H-A-H, H-A-A-H-H, H-A-A-H-H-A-H), recordPlayoffGameResult (immutable), getNextPlayoffGame; adapts for smaller leagues

### Modified
- `src/lib/types/schedule.ts` -- Added playoff types: PlayoffRoundName, PlayoffTeamSeed, PlayoffGame, PlayoffSeries, PlayoffRound, PlayoffBracket
- `src/lib/types/index.ts` -- Added playoff type exports
- `src/lib/errors/error-codes.ts` -- Added SCHEDULE_INVALID_TEAM_COUNT, SCHEDULE_NO_TEAMS, PLAYOFF_INSUFFICIENT_TEAMS, PLAYOFF_SERIES_COMPLETE

### Verification
- `npm test` -- 1,093 tests pass across 58 test files (953 existing + 140 new)
- New tests: 34 derived + 21 accumulator + 20 standings + 20 leaders + 24 schedule + 21 playoff = 140
- All new source files lint clean with `npx eslint`
- Plan document: `docs/plans/phase-5-schedule-stats.md`

### Phase 5 Complete
All 7 tasks (0-6) finished. 6 new source files + 6 new test files. All Layer 1 pure logic modules for schedule generation, playoff brackets, and statistics pipeline are complete.

## 2026-02-09 - Phase 4A: League & Draft Pure Logic (REQ-LGE, REQ-DFT, REQ-RST, REQ-ERR)

### Added
- **Error Handling Foundation** (REQ-ERR-001, REQ-ERR-002):
  - `src/lib/errors/error-codes.ts` -- ErrorCode constants for all domains (AUTH, DRAFT, LEAGUE, ROSTER, VALIDATION, SIMULATION, DATA, EXTERNAL)
  - `src/lib/errors/app-error.ts` -- AppError class extending Error with category, code, statusCode, details
  - `src/lib/errors/error-factory.ts` -- Factory functions: createValidationError, createAuthError, createNotFoundError, createConflictError, createDraftError, createLeagueError, createSimulationError
- **Team Name Generation** (REQ-LGE-004):
  - `src/lib/league/team-generator.ts` -- 57 US cities, 60 mascots, Fisher-Yates shuffle with SeededRNG, no duplicates within a league
- **Division Assignment** (REQ-LGE-005):
  - `src/lib/league/division-assignment.ts` -- AL/NL split, 4 divisions (East/South/West/North), even distribution with remainder handling
- **Invite Key Generation** (REQ-LGE-003):
  - `src/lib/league/invite-key.ts` -- 12-char alphanumeric keys from SeededRNG (62-char charset)
- **Draft Order & Snake Logic** (REQ-DFT-001, REQ-DFT-002):
  - `src/lib/draft/draft-order.ts` -- 21-round snake draft, Fisher-Yates shuffle, getPickingTeam, getNextPick
- **AI Draft Valuation** (REQ-DFT-007):
  - `src/lib/draft/ai-valuation.ts` -- Batter: (OPS*100)+(SB*0.5)+(fieldingPct*20)+positionBonus; SP: ((4.50-ERA)*30)+(K9*5)-(BB9*8)+(stamina*3); RP/CL: ((3.50-ERA)*25)+(K9*6)-(BB9*10); selectBestSeason for multi-season players
- **AI Draft Strategy** (REQ-DFT-006):
  - `src/lib/draft/ai-strategy.ts` -- Need-first approach: early rounds (1-3) best available excluding RP/CL; mid rounds (4-8) SP rotation then premium positions (C/SS/CF); late rounds (9+) CL, RP, remaining starters, bench
- **Roster Validation** (REQ-DFT-008, REQ-RST-001):
  - `src/lib/draft/roster-validator.ts` -- validateRoster, getRosterGaps, autoFillRoster; enforces 21-player composition (9 starters + 4 bench + 4 SP + 3 RP + 1 CL); OF positions interchangeable
- **Lineup Generation** (REQ-RST-003, REQ-RST-004):
  - `src/lib/roster/lineup-generator.ts` -- AI lineup: #1=highest OBP+speed, #2=highest contact, #3=highest OPS, #4=highest SLG, #5-7=next OPS, #8=weakest, #9=second weakest; validateLineup checks 9 slots + position coverage
- **Zod Validation Schemas** (REQ-ERR-005, REQ-ERR-006, REQ-ERR-007):
  - `src/lib/validation/league-schemas.ts` -- createLeagueSchema (name 3-50, teamCount even 4-32, yearRange 1901-2025, injuriesEnabled), joinLeagueSchema (12-char alphanumeric inviteKey)
  - `src/lib/validation/draft-schemas.ts` -- draftPickSchema (leagueId UUID, teamId UUID, playerId, seasonYear 1901-2025)
  - `src/lib/validation/zod-error-mapper.ts` -- mapZodError transforms ZodError to AppError with field-level ValidationDetail[]

### Verification
- `npm test` -- 953 tests pass across 52 test files (744 existing + 209 new)
- New tests: 26 error + 19 team-gen + 17 division + 6 invite-key + 20 draft-order + 24 ai-valuation + 13 ai-strategy + 23 roster-validator + 19 lineup-gen + 42 validation = 209
- All new source files compile cleanly with `tsc --noEmit`
- Plan document: `docs/plans/phase-4-league-draft.md`

### Phase 4A Complete
All 10 pure logic tasks finished. Sub-phases 4B-4D (infrastructure, services/API, state/UI) deferred until Docker is available for local Supabase.

## 2026-02-09 - Phase 3, Task 15: Manager AI Decisions (REQ-AI-001 through REQ-AI-004)

### Added
- **Manager Profiles**: `src/lib/simulation/manager-profiles.ts` -- Four APBA BBW manager personalities per REQ-AI-001
  - Cap Spalding (conservative): high bunt, low steal, lets starters go deep
  - Duke Robinson (aggressive): high steal, low bunt, quick hook
  - Johnny McCoy (balanced): moderate thresholds across all decisions
  - Larry Pepper (analytical): data-driven, almost never bunts, platoon-heavy
  - `getManagerProfile()` helper function
- **Manager AI Decision Engine**: `src/lib/simulation/manager-ai.ts` -- Pre-pitch decision evaluation per REQ-AI-002/003/004
  - `getInningMultiplier()` -- 1.0 early, lateInningMultiplier (7-9), extraInningMultiplier (10+)
  - `computeDecisionScore()` -- baseFactors * threshold * inningMultiplier
  - `evaluateStealDecision()` -- speed * close-game factor, blocked by 2 outs or blowout
  - `evaluateBuntDecision()` -- (1 - contactRate) * threshold, requires 0 outs, game within 2
  - `evaluateIntentionalWalkDecision()` -- OPS rank * scoring pos factor, requires 1B open
  - `evaluatePitcherPullDecision()` -- fatigue factor * (1 - tolerance), higher tolerance = more patient
- **Manager AI Tests**: 33 tests across 2 files covering all 4 profiles, decision formulas, prerequisites, comparative rates, determinism

### Verification
- `npm test` -- 744 tests pass across 40 test files (711 existing + 33 new)
- `npm run lint` -- New files pass ESLint with 0 errors

### Phase 3 Complete
All 15 simulation engine tasks are now complete:
- Tasks 1-2: SeededRNG + OutcomeTable (foundation)
- Tasks 3-7: Outcome Resolver, Plate Appearance, Card Value Fallback, Archetype Modifiers, Platoon (core PA pipeline)
- Tasks 8-11: Bunt Resolver, Baserunner Engine, Defense Engine, Stolen Base (specialized mechanics)
- Tasks 12-14: Pitching Management, Game State Machine, Game Result/Box Score (game orchestration)
- Task 15: Manager AI (strategic decision layer)

## 2026-02-09 - Phase 3, Task 14: Game Result & Box Score (REQ-SIM-016)

### Added
- **Game Result Builder**: `src/lib/simulation/game-result.ts` -- Post-game output generation per REQ-SIM-016
  - `buildLineScore()` -- Accumulates per-half-inning runs into line score arrays (handles extra innings, skipped bottom half)
  - `buildBoxScore()` -- Assembles BoxScore with line score, hits, and errors
  - `assignPitcherDecisions()` -- W/L/SV assignment: starter W with 5+ IP, reliever W otherwise, save with lead <= 3
  - `buildEmptyBattingLine()` / `buildEmptyPitchingLine()` -- Zero-initialized stat lines
- **Game Result Tests**: `tests/unit/lib/simulation/game-result.test.ts` -- 12 tests covering line score building, box score assembly, pitcher decision assignment, stat line initialization

### Verification
- `npm test` -- 711 tests pass across 38 test files (699 existing + 12 new)
- `npm run lint` -- New files pass ESLint with 0 errors

## 2026-02-09 - Phase 3, Task 13: Game State Machine (REQ-SIM-001, REQ-SIM-002, REQ-SIM-015)

### Added
- **Game Engine**: `src/lib/simulation/engine.ts` -- Game state machine and flow control per REQ-SIM-001/002/015
  - `createInitialGameState()` -- Initializes game state from config (inning 1, top, 0-0, empty bases)
  - `advanceHalfInning()` -- Top -> Bottom or Bottom -> next inning Top; resets outs/bases/counters
  - `isGameOver()` -- Checks 9+ innings with leader, walk-off detection, extra innings support
  - `shouldSkipBottomHalf()` -- Home team skip when already winning after 9th+ top half
  - `getBattingTeam()` / `getFieldingTeam()` -- Identifies active teams by half-inning
  - `advanceBatterIndex()` -- 9-slot batting order cycling
- **Game Engine Tests**: `tests/unit/lib/simulation/engine.test.ts` -- 31 tests covering state initialization, half-inning advancement, game completion logic, walk-offs, extra innings, team identification, batting order cycling

### Verification
- `npm test` -- 699 tests pass across 37 test files (668 existing + 31 new)
- `npm run lint` -- New files pass ESLint with 0 errors

## 2026-02-09 - Phase 3, Task 12: Pitching Management (REQ-SIM-010 through 014)

### Added
- **Pitching Manager**: `src/lib/simulation/pitching.ts` -- Pitcher fatigue, bullpen decisions, rotation per REQ-SIM-010-014
  - `computeEffectiveGrade()` -- Grade degradation: starters -2/inning beyond stamina, relievers -3/inning (min 1)
  - `shouldRemoveStarter()` -- 4 removal triggers: grade <= 50%, 4+ ER/4+ IP, 3 consecutive H/W after 5th, with shutout/no-hitter protection
  - `selectReliever()` -- Selects highest-grade available reliever (excludes closers)
  - `shouldBringInCloser()` -- Closer enters when winning by <= 3 in 9th+, <= 2 runners on base
  - `getNextStarter()` -- 4-man rotation cycling via game number modulo
- **Pitching Tests**: `tests/unit/lib/simulation/pitching.test.ts` -- 31 tests covering fatigue degradation, all removal triggers, reliever selection, closer logic, rotation cycling

### Verification
- `npm test` -- 668 tests pass across 36 test files (637 existing + 31 new)
- `npm run lint` -- New files pass ESLint with 0 errors

## 2026-02-09 - Phase 3, Task 11: Stolen Base Resolution (REQ-SIM-009)

### Added
- **Stolen Base Resolver**: `src/lib/simulation/stolen-base.ts` -- Stolen base attempt resolution per REQ-SIM-009
  - `canAttemptStolenBase()` -- Eligibility check: runner on 1B/2B with < 2 outs
  - `computeStolenBaseProbability()` -- speed * 0.75 + 0.15 (speed archetype) - catcher.arm * 0.20
  - `attemptStolenBase()` -- Resolves SB attempt: success advances runner, failure = caught stealing
- **Stolen Base Tests**: `tests/unit/lib/simulation/stolen-base.test.ts` -- 17 tests covering eligibility, probability computation, success/failure outcomes, statistical rates, determinism

### Verification
- `npm test` -- 637 tests pass across 35 test files (620 existing + 17 new)
- `npm run lint` -- New files pass ESLint with 0 errors

## 2026-02-09 - Phase 3, Task 10: Defense Engine (REQ-SIM-008, REQ-SIM-008a)

### Added
- **Defense Engine**: `src/lib/simulation/defense.ts` -- Error resolution and DP defense checks per REQ-SIM-008/008a
  - `getResponsiblePosition()` -- Maps outcome type to responsible fielding position (ground balls to IF, fly balls to OF, etc.)
  - `checkForError()` -- Error probability = 1 - fieldingPct, checked via seeded RNG
  - `checkDPDefense()` -- DP succeeds if SS/2B avg fieldingPct >= 0.95; 10% failure rate below threshold
- **Defense Engine Tests**: `tests/unit/lib/simulation/defense.test.ts` -- 15 tests covering position assignment, error rates, DP defense, determinism

### Verification
- `npm test` -- 620 tests pass across 34 test files (605 existing + 15 new)
- `npm run lint` -- New files pass ESLint with 0 errors

## 2026-02-09 - Phase 3, Task 9: Baserunner Engine (REQ-SIM-006, REQ-SIM-007)

### Added
- **Baserunner Engine**: `src/lib/simulation/baserunner.ts` -- Speed checks and runner advancement per REQ-SIM-006/007
  - `computeEffectiveSpeed()` -- Base speed + modifiers: +0.15 speed archetype (6,0), -0.10 strong arm (>0.8), +0.10 two outs
  - `performSpeedCheck()` -- Random vs effective speed determines extra-base taking
  - `advanceRunnerOnSingle()` -- 1B: speed check for 3B; 2B/3B: always score
  - `advanceRunnerOnDouble()` -- 1B: speed check to score; 2B/3B: always score
  - `canTagUp()` -- Runner on 3B can tag on fly out with <2 outs
- **Baserunner Tests**: `tests/unit/lib/simulation/baserunner.test.ts` -- 23 tests covering effective speed computation, speed checks, single/double advancement, tag-up rules

### Verification
- `npm test` -- 605 tests pass across 33 test files (582 existing + 23 new)
- `npm run lint` -- New files pass ESLint with 0 errors

## 2026-02-09 - Phase 3, Task 8: Bunt Resolution (REQ-SIM-004c)

### Added
- **Bunt Resolver**: `src/lib/simulation/bunt-resolver.ts` -- Probability-based bunt resolution per REQ-SIM-004c
  - 65% sacrifice success, 15% bunt foul, 10% bunt-for-hit attempt, 10% pop out
  - Bunt foul with 2 strikes = strikeout; <2 strikes = resume PA
  - Bunt-for-hit: speed > 0.6 AND 35% chance = single; else ground out
- **Bunt Resolver Tests**: `tests/unit/lib/simulation/bunt-resolver.test.ts` -- 15 tests covering probability distributions, all bunt outcomes, edge cases, determinism

### Verification
- `npm test` -- 582 tests pass across 32 test files (567 existing + 15 new)
- `npm run lint` -- New files pass ESLint with 0 errors

## 2026-02-09 - Phase 3, Task 6: Archetype Modifiers (REQ-SIM-004 step 6)

### Added
- **Archetype Modifier**: `src/lib/simulation/archetype-modifier.ts` -- Applies archetype-based bonuses after outcome determination per REQ-SIM-004 step 6
  - Power (1,0)/(1,1): 15% chance to upgrade FLY_OUT to HOME_RUN
  - Speed (6,0): Flags stolen base opportunity on singles/walks/HBP
  - Contact+Speed (0,2): 20% chance to downgrade strikeouts to GROUND_OUT
  - Elite defense (8,0), standard, pitcher, utility: No batting modifier
  - Detection helpers: `isPowerArchetype()`, `isSpeedArchetype()`, `isContactSpeedArchetype()`
- **Archetype Modifier Tests**: `tests/unit/lib/simulation/archetype-modifier.test.ts` -- 29 tests covering all archetype types, probability rates, non-modifying archetypes, determinism

### Verification
- `npm test` -- 567 tests pass across 31 test files (538 existing + 29 new)
- `npm run lint` -- New files pass ESLint with 0 errors

## 2026-02-09 - Phase 3, Task 3: Outcome Resolver (REQ-SIM-005)

### Added
- **Outcome Resolver**: `src/lib/simulation/outcome-resolver.ts` -- Maps OutcomeCategory to concrete game state changes per REQ-SIM-005 and REQ-SIM-007
  - `resolveOutcome()` -- Main function: takes OutcomeCategory + BaseState + outs + batterId, returns OutcomeResolution with new bases, outs added, runs scored, batter destination, sac fly flag, RBI credits
  - `advanceAllRunners()` -- Moves all runners forward by N bases (3B first per REQ-SIM-007), scoring runners that pass home
  - `forceAdvance()` -- Walk/HBP force logic: runners advance only when pushed by chain of occupied bases
  - `removeLeadRunner()` -- Removes runner closest to home plate (for fielder's choice and DP)
  - Handles all 26 OutcomeCategory values: hits (singles clean/advance, doubles, triples, HRs), outs (ground/fly/pop/line/strikeout), walks/HBP, double plays (ground + line with degradation), special plays (sacrifice, error, FC), no-PA events (wild pitch, balk, passed ball, SB opportunity)
  - Conservative defaults for speed-dependent outcomes (Task 9 Baserunner Engine will add speed check overlay)
- **Outcome Resolver Tests**: `tests/unit/lib/simulation/outcome-resolver.test.ts` -- 74 tests covering helpers, all outcome types, edge cases (3rd out prevents runs, bases loaded DP, grand slams)

### Verification
- `npm test` -- 538 tests pass across 30 test files (464 existing + 74 new)
- `npm run lint` -- New files pass ESLint with 0 errors

## 2026-02-08 - Phase 2: Card Generator (APBA Port)

### Added
- **Card Generator**: 8 source files in `src/lib/card-generator/` implementing APBA-style card generation from Lahman stats per REQ-DATA-005, REQ-DATA-005a, REQ-DATA-006
  - `structural.ts` -- 9 structural constants at card positions 1,3,6,11,13,18,23,25,32 with values 30,28,27,26,31,29,25,32,35 (Step 2)
  - `rate-calculator.ts` -- Per-PA rate computation from BattingStats (walkRate, strikeoutRate, homeRunRate, singleRate, doubleRate, tripleRate, sbRate, ISO) per Step 1
  - `power-rating.ts` -- ISO-to-8-tier power scale mapping at card position 24 (values 13,15,16,17,18,19,20,21) per Step 4
  - `archetype.ts` -- Hierarchical decision tree for bytes 33-34: pitcher(0,6), power(1,0/1,1), speed(6,0), contact+speed(0,2), elite defense(8,0), utility(5,0), standard(7,0/0,1) per Step 5
  - `pitcher-grade.ts` -- ERA percentile ranking to 15-tier grade (15=ace top 3%, 1=worst bottom 1%) per REQ-DATA-005a
  - `value-mapper.ts` -- Rate-to-card-value mapping using APBA correlation table (13=walk r=.978, 14=K r=.959, 1=HR r=.715, 7/8/9=singles, 0=double), slot allocation with scale factors, singles quality split by BABIP per Step 3
  - `pitcher-card.ts` -- Pitcher batting card generation (flooded with value 13), PitcherAttributes (role from GS%, grade, stamina, k9/bb9/hr9, usage flags) per Step 6
  - `generator.ts` -- Orchestrator: generateCard() and generateAllCards() entry points, computes fielding pct/range/arm/speed/discipline/contactRate, determines primary/eligible positions
- **Card Generator Tests**: 8 test files in `tests/unit/lib/card-generator/` (164 new tests) covering structural constants, rate calculation, power rating tiers, archetype decision tree, pitcher grade percentile mapping, value mapping with slot allocation, pitcher card generation, and full integration tests with mini-lahman fixtures

### Verification
- `npm run build` -- TypeScript compiles with strict mode
- `npm test` -- 321 tests pass across 24 test files (157 existing + 164 new)
- `npm run lint` -- ESLint passes with 0 errors

## 2026-02-08 - Phase 1, Task 5: Lahman CSV Loader

### Added
- **CSV Parsing Layer**: 8 source files in `src/lib/csv/` implementing PapaParse-based Lahman data loading per REQ-DATA-001, REQ-DATA-002, REQ-DATA-002a, REQ-DATA-006
  - `csv-types.ts` -- Raw CSV row types (RawPeopleRow, RawBattingRow, RawPitchingRow, RawFieldingRow), parsed domain records (PersonRecord, BattingSeasonRecord, PitchingSeasonRecord, FieldingSeasonRecord), player pool types (PlayerPoolEntry, LeagueAverages, CsvParseResult)
  - `parser.ts` -- PapaParse streaming wrapper (parseCsvStream with step callback per REQ-NFR-011, parseCsvFull for small files), safeParseInt/safeParseFloat utilities
  - `people-loader.ts` -- People.csv parser with handedness mapping (Lahman B->S for switch hitters, B/S->R for ambidextrous throwers)
  - `batting-loader.ts` -- Batting.csv parser with multi-stint aggregation (sums counting stats, computes BA/OBP/SLG/OPS from aggregated totals), year range filtering, 2B->doubles/3B->triples column mapping
  - `pitching-loader.ts` -- Pitching.csv parser with IPouts-to-IP conversion (baseball notation: 478->159.1), multi-stint aggregation (sums IPouts before converting), BFP->BF mapping, HLD/BS default to 0, ERA/WHIP derived from true decimal IP
  - `fielding-loader.ts` -- Fielding.csv parser with position mapping (OF->RF, P->SP), PH/PR row filtering, same-position stint aggregation
  - `player-pool.ts` -- Player pool assembly joining all 4 data sources, qualification filtering (batter>=200 AB, pitcher>=50 IP, two-way=EITHER per REQ-DATA-002a), league average computation (BA, HR/PA, BB/PA, SO/PA, ERA, K/9, BB/9, ISO, BABIP per REQ-DATA-006)
  - `index.ts` -- Barrel re-exports for clean `@lib/csv` imports
- **Mini-Lahman Test Fixtures**: 4 CSV files in `tests/fixtures/mini-lahman/` extracted from real 1971 Lahman data (53 players, 56 batting rows, 17 pitching rows, 75 fielding rows) including multi-stint players, switch hitters, LH throwers, and below-threshold players
- **CSV Loader Tests**: 6 test files in `tests/unit/lib/csv/` (101 new tests) covering parser utilities, all 4 loaders with mini-lahman fixtures, player pool assembly, qualification thresholds, and league average computation

### Verification
- `npm run build` -- TypeScript compiles with strict mode
- `npm test` -- 157 tests pass across 16 test files (56 type + 101 CSV)
- `npm run lint` -- ESLint passes with 0 errors

## 2026-02-08 - Phase 1, Task 4: Core TypeScript Interfaces

### Added
- **Layer 0 Type Definitions**: 9 type files in `src/lib/types/` with 50+ interfaces, types, and enums per SRD Sections 4, 5, 6, 7, 8, 9, 10, 14, 15.8
  - `errors.ts` -- ErrorCategory (9 categories), AppError, ValidationDetail, ApiErrorResponse, ErrorLogEntry
  - `stats.ts` -- BattingStats (21 fields), PitchingStats (22 fields) with counting + derived stats
  - `player.ts` -- CardValue, Position (12 positions), PlayerArchetype (bytes 33-34), PitcherAttributes (grade 1-15, role, usage flags), PlayerCard (35-element card array, power rating, batting/defensive modifiers)
  - `game.ts` -- OutcomeCategory enum (26 values, 15-40), BaseState, OutcomeTableEntry (IDT port), LineupSlot, GamePitcherStats, BattingLine, PitchingLine, TeamState, GameState (full mid-game snapshot), PlayByPlayEntry, BoxScore, GameResult
  - `league.ts` -- LeagueStatus, ManagerProfile (4 styles with 9 decision thresholds), LeagueSummary, TeamSummary, DivisionStandings
  - `draft.ts` -- DraftPickResult, DraftState (21 rounds, 60s timer)
  - `schedule.ts` -- ScheduleGameSummary, ScheduleDay
  - `roster.ts` -- RosterEntry (5 slot types), LineupUpdate
  - `api.ts` -- ApiResponse<T>, PaginatedResponse<T>, JoinLeagueResult, GameDetail, TransactionResult, ArchiveSummary, SimulationProgress
  - `index.ts` -- Barrel re-export for clean `@lib/types` imports
- **Type Tests**: 9 test files in `tests/unit/lib/types/` (56 tests total) verifying all interfaces compile and validate correctly
- **Fix**: Added explicit `resolve.alias` to `vitest.config.ts` for path alias resolution with value imports (enums)

### Verification
- `npm run build` -- TypeScript compiles with strict mode
- `npm test` -- 56 tests pass across 10 test files
- `npm run lint` -- ESLint passes with 0 errors

## 2026-02-08 - Phase 1, Task 1: Project Scaffolding

### Added
- **Project Foundation**: Vite 7.3 + React 19 + TypeScript scaffolding with full SRD-compliant configuration
  - `package.json` with 12 npm scripts (dev, build, lint, format, test, test:watch, test:coverage, test:bench, test:e2e, test:e2e:ui, test:ci, preview)
  - `tsconfig.json` with 7 path aliases (@lib, @components, @features, @hooks, @stores, @services, @workers) per REQ-ARCH-003
  - `tsconfig.node.json` for build tooling (Vite, Vitest, Tailwind, Playwright configs)
  - `vite.config.ts` with vite-tsconfig-paths and React plugins
  - `tailwind.config.ts` with full SRD theme (8 custom colors, 3 font families, custom spacing, shadows, border widths, postseason variant plugin) per REQ-COMP-001, REQ-COMP-002
  - `postcss.config.cjs` with TailwindCSS v3 + Autoprefixer
  - `vitest.config.ts` per REQ-TEST-016 (v8 coverage, forks pool, 10s timeout, globals, jsdom environment)
  - `playwright.config.ts` per REQ-TEST-017 (Chromium only, 30s timeout, failure screenshots, webServer auto-start)
  - `.eslintrc.cjs` with TypeScript, React hooks, React refresh, Prettier integration, layer architecture import restrictions
  - `.prettierrc` (2-space indent, single quotes, trailing commas, 100 char width)
  - `vercel.json` per REQ-NFR-021 (1024 MB functions, 300s maxDuration, SPA rewrites, security headers, cache headers)
  - `.env.example` per REQ-ENV-002 (Supabase client/server, Anthropic API key, app env)
- **Entry Files**: `index.html` (Google Fonts: Roboto Slab, JetBrains Mono), `src/main.tsx`, `src/App.tsx` (placeholder with theme classes), `src/vite-env.d.ts` (ImportMetaEnv interface per REQ-ENV-006), `src/styles/globals.css` (CSS custom properties + postseason theme overrides per REQ-COMP-001)
- **Directory Structure**: 50+ directories per Section 3.3 (api/, src/lib/, src/services/, src/stores/, src/hooks/, src/components/, src/features/, src/workers/, src/styles/, supabase/, tests/)
- **Test Infrastructure**: `tests/setup.ts` with @testing-library/jest-dom matchers, `tests/unit/scaffold.test.ts` placeholder
- **Dependencies**: react, react-dom, react-router-dom, zustand, @supabase/supabase-js, papaparse (production); typescript, vite, vitest, playwright, tailwindcss, eslint, prettier + 15 supporting dev packages

### Verification
- `npm run build` -- TypeScript compiles, Vite bundles successfully
- `npm test` -- Vitest runs, 1 test passes
- `npm run lint` -- ESLint passes with 0 errors

## 2026-02-08 - Software Requirements Document v4.0 (Player Pool Expansion & Qualification Thresholds)

### Changed
- `docs/SRD.md` v4.0 - Major data model change: every qualifying player-season is now a separate draftable entity:
  - **REQ-DATA-002 (Player Pool Construction)**: Rewritten from "best single season per player" to "every qualifying season is a separate draftable entity." Players like Babe Ruth may have 15+ qualifying seasons, each independently draftable. The drafter chooses which season version they want (e.g., "Ruth 1921" vs "Ruth 1927"). Adds strategic depth -- peak season vs career longevity tradeoffs.
  - **REQ-DATA-002a (Qualification Thresholds)**: New requirement defining pool inclusion criteria:
    - Batters: minimum 200 AB per season (filters out NL pitchers who batted with incidental plate appearances)
    - Pitchers: minimum 50 IP per season (includes starters and relievers, filters out position players who occasionally pitched)
    - Two-way players: qualify via EITHER threshold; if both met, card includes batting and pitching attributes (handles Ohtani-type seasons)
    - Pool size estimate: ~40,000-60,000 qualifying batter-seasons + ~15,000-20,000 qualifying pitcher-seasons across 1901-2025
  - **REQ-DFT-001a (One Player Per League)**: New requirement enforcing physical player uniqueness. When any season of a player is drafted, ALL other seasons of that player are removed from the available pool. Existing `UNIQUE(league_id, player_id)` constraint enforces this at the database level. Dropping a player restores all qualifying seasons to the pool.
  - **Database Schema**: Added `season_year INT NOT NULL` column to both `rosters` and `season_stats` tables. Records which specific season was selected. UNIQUE constraints remain on `player_id` alone (not composite with season_year), preserving one-physical-player-per-league enforcement.
  - **REQ-DFT-005 (Draft Display)**: Added pool filtering rules -- exclude all seasons of any player already on a roster. Player list may show multiple rows for the same physical player (different seasons, different stats). Added search/filter support for name, position, year range, stat thresholds.
  - **REQ-DFT-007 (AI Valuation)**: AI selects the season with the highest valuation score when multiple seasons of the same player are available.
  - **REQ-RST-005 (Free Agent Add/Drop)**: Updated drop semantics (all qualifying seasons return to pool) and add semantics (selecting a player-season removes all other seasons per REQ-DFT-001a).
  - **REQ-DATA-005a (Pitcher Grade)**: Changed "minimum qualifying IP" to explicit "minimum 50 IP per season per REQ-DATA-002a."
  - **REQ-NFR-011 (CSV Streaming)**: Updated pool size reference to reflect qualification threshold filtering (~40,000-60,000 qualifying batter-seasons from ~110,000 total rows).
  - **ERR_DRAFT_PLAYER_TAKEN**: Updated description to reference REQ-DFT-001a one-physical-player-per-league rule.
  - **Section 3.3 (Directory Tree)**: Added `00012_add_season_year.sql` migration file.
  - **Section 20.2 (Migration Table)**: Added migration `00012_add_season_year.sql`, updated continuation note to `00013`.
  - Updated version to 4.0

## 2026-02-08 - Software Requirements Document v3.9 (Code Ownership & Scoping)

### Added
- `docs/SRD.md` v3.9 - Added comprehensive code ownership and scoping framework (Section 22 with 5 subsections):
  - **Section 22.1 (Universal Scoping Rule)**: Master decision table covering 9 artifact types (components, hooks, types, constants, utilities, test helpers, services, stores, pure logic) with feature-scoped location, shared location, and promotion trigger for each. Generalizes the component colocation rule from Section 3.7 to all code types. Feature-scoped artifacts use relative imports; promoted artifacts use `@`-prefixed path aliases (REQ-SCOPE-001)
  - **Section 22.2 (Feature-Scoped File Conventions)**: Allowed file types within `src/features/<module>/` with naming conventions and import rules (sub-components, hooks subdirectory, single `types.ts`, single `constants.ts`, single `utils.ts`, optional barrel `index.ts`). Four constraints: no cross-feature imports, no direct store access, max 2 files per non-component type, no nested feature directories. Baseball Ledger domain examples (REQ-SCOPE-002, REQ-SCOPE-003)
  - **Section 22.3 (Promotion Checklist)**: 6-step ordered checklist for graduating feature-scoped artifacts to shared locations (move, remove dependencies, update imports, move tests, verify isolation, update directory tree). Concrete before/after example showing DraftTicker promotion from feature-scoped to shared component with hook-to-props conversion (REQ-SCOPE-004)
  - **Section 22.4 (Fixed-Home Artifacts)**: 7 artifact types that are architecturally mandated to always be shared (Zustand stores, services, pure logic, Layer 0 types, Web Workers, global styles, server utilities) with rationale for each. Rule of thumb: if consumed by Layers 0-4, cannot live in feature directory (REQ-SCOPE-005)
  - **Section 22.5 (Gray Area Resolution)**: Decision rules for 6 ambiguous placement scenarios (cross-layer types, domain-heavy hooks, pure-but-single-consumer utilities, test-only secondary consumers, variant components, feature hooks wrapping shared hooks). Test exemption rule: tests importing feature-scoped artifacts do not trigger promotion (REQ-SCOPE-006, REQ-SCOPE-007)
  - Added 7 new requirements: REQ-SCOPE-001 through REQ-SCOPE-007
  - Updated Table of Contents with Section 22 entry and 5 subsection links
  - Updated version to 3.9

### Changed
- **Section 3.3 (Directory Tree)**: Added `tests/helpers/` directory with `render-with-providers.tsx` for shared test utilities (REQ-SCOPE-001)
- **Section 3.7 (Colocation Rule)**: Added forward-reference to Section 22 for non-component artifact scoping
- **Section 19.4 (Feature Composition)**: Added forward-reference to Section 22 for non-component artifact scoping

## 2026-02-08 - Software Requirements Document v3.8 (Environment Configuration)

### Added
- `docs/SRD.md` v3.8 - Added comprehensive environment configuration (Section 21 with 6 subsections):
  - **Section 21.1 (Environment Variable Inventory)**: Complete 6-variable canonical inventory with categories (Supabase client, Supabase server, External Services, Build/Runtime). `VITE_` prefix rule for client-exposed variables (Vite build system security boundary). Variable naming rules. Cross-reference to Section 20.7 per-environment values (REQ-ENV-001)
  - **Section 21.2 (`.env.example` Template)**: Full `.env.example` file content with grouped sections, placeholder values, and inline comments. Committed to repository as documentation template. Developers copy to `.env.local` for local development (REQ-ENV-002)
  - **Section 21.3 (Configuration Module)**: Client config at `src/lib/config.ts` with `ClientConfig` typed interface and `getRequiredEnv()` fail-fast validation per CLAUDE.md Rule 3. Server config at `api/_lib/config.ts` with `ServerConfig` typed interface using `process.env`. Usage example showing `supabase-admin.ts` consuming `serverConfig`. `ANTHROPIC_API_KEY` optional with graceful degradation per REQ-AI-008 (REQ-ENV-003, REQ-ENV-004, REQ-ENV-005)
  - **Section 21.4 (Vite Environment Type Declarations)**: Full `src/vite-env.d.ts` content with `ImportMetaEnv` interface declaring all `VITE_*` variables for TypeScript autocomplete. Server-only variables explicitly excluded from declarations (REQ-ENV-006)
  - **Section 21.5 (Vercel Project Configuration)**: Complete `vercel.json` content with framework (vite), build command, output directory (dist), functions config (1024MB memory, 300s maxDuration per REQ-NFR-021), SPA rewrites for React Router, security headers (X-Content-Type-Options, X-Frame-Options), immutable cache headers for hashed assets. CORS not needed (same-origin per REQ-API-007) (REQ-ENV-007)
  - **Section 21.6 (Secrets Management)**: `.gitignore` entries for all env files (except `.env.example`). Three-location secret storage policy table (local file, Vercel dashboard, GitHub Actions secrets). Five secret handling rules including service role key server-only restriction and anon key client-safe rationale. API key rotation policy for all 3 credential types with zero-downtime degradation (REQ-ENV-008, REQ-ENV-009, REQ-ENV-010)
  - Added 10 new requirements: REQ-ENV-001 through REQ-ENV-010
  - Updated Table of Contents with Section 21 entry and 6 subsection links
  - Updated version to 3.8

### Fixed
- **Section 20.7**: Corrected `NEXT_PUBLIC_SUPABASE_URL` to `VITE_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `VITE_SUPABASE_ANON_KEY` -- this is a Vite project (vite.config.ts), not Next.js. Vite uses `VITE_*` prefix for client-exposed environment variables.

### Changed
- **Section 3.3 (Directory Tree)**: Added `api/_lib/config.ts` (server environment config, REQ-ENV-005) and `src/lib/config.ts` (client environment config, REQ-ENV-003)

## 2026-02-08 - Software Requirements Document v3.7 (Database Migration Workflow)

### Added
- `docs/SRD.md` v3.7 - Added comprehensive database migration workflow (Section 20 with 8 subsections):
  - **Section 20.1 (Supabase CLI & Local Development)**: Local Supabase stack via Docker (PostgreSQL, Auth, Storage, Realtime). Required `config.toml` settings for local development. Commands for init, start, reset, stop (REQ-MIG-001)
  - **Section 20.2 (Migration File Standards)**: 5-digit sequential prefix + snake_case naming per REQ-ARCH-004. One concern per migration file. Existing 11 migrations table. Required header comment format (purpose, author, date, dependencies). SQL style rules table (uppercase keywords, lowercase identifiers, explicit schemas, idempotent patterns with IF NOT EXISTS/CREATE OR REPLACE, no DROP in forward migrations) (REQ-MIG-002, REQ-MIG-003, REQ-MIG-004)
  - **Section 20.3 (Schema Change Workflow)**: 6-step workflow (create, write, test, diff, review, squash). `supabase db reset` for local validation, `supabase db diff` for drift detection. 10-item review checklist before committing. Migration squashing strategy at 30-file threshold (REQ-MIG-005)
  - **Section 20.4 (Rollback & Recovery Strategy)**: Forward-only rollback pattern (no automatic down migrations). Rollback migration naming convention. Destructive change rules table for DROP TABLE, DROP COLUMN, ALTER TYPE, DROP INDEX, DROP POLICY. Supabase PITR for production recovery (REQ-MIG-006)
  - **Section 20.5 (Seed Data)**: `supabase/seed.sql` with 6 data categories (test users, sample league, teams, rosters, schedule, stats). Idempotent INSERT with ON CONFLICT. Recognizable seed UUID prefix pattern. Separation from test fixtures in tests/fixtures/ (REQ-MIG-007, REQ-MIG-008)
  - **Section 20.6 (RLS Policy Testing)**: pgTAP tests in `supabase/tests/` with one test file per table. Full example test for leagues table (6 assertions: commissioner CRUD, member read, non-member denial). Required test coverage table for 6 RLS-enabled tables. `supabase test db` command (REQ-MIG-009)
  - **Section 20.7 (Multi-Environment Strategy)**: Three isolated environments (local Docker, staging cloud, production cloud). Environment variable table for Supabase URL, anon key, service role key, DB URL. Migration deployment order (local -> staging -> production). Data isolation policy (REQ-MIG-010, REQ-MIG-011)
  - **Section 20.8 (CI/CD Database Pipeline)**: Extended CI pipeline with 7 database stages (start, reset, lint, pgTAP tests, type generation, type staleness check, dry-run push, stop). Auto-generated `src/lib/types/database.ts` via `supabase gen types typescript`. Stale type detection workflow in CI (REQ-MIG-012, REQ-MIG-013)
  - Added 13 new requirements: REQ-MIG-001 through REQ-MIG-013
  - Updated Section 3.3 directory tree: added `supabase/seed.sql` and `supabase/tests/` with 6 pgTAP test files
  - Updated Table of Contents with Section 20 entry and 8 subsection links
  - Updated version to 3.7

## 2026-02-08 - Software Requirements Document v3.6 (Component Architecture)

### Added
- `docs/SRD.md` v3.6 - Added comprehensive component architecture (Section 19 with 7 subsections):
  - **Section 19.1 (Theme System & Design Tokens)**: Full `tailwind.config.ts` theme extension with 8 custom colors, 3 font families, spacing scale, max-width, border-radius, box-shadow, and border-width tokens. CSS custom properties in `globals.css` mirroring Tailwind config for animations and third-party contexts. Postseason theme variant via `data-theme="postseason"` attribute with CSS variable overrides and custom `postseason:` Tailwind variant prefix (REQ-COMP-001, REQ-COMP-002)
  - **Section 19.2 (Shared Component Prop Contracts)**: Prop interface conventions (`on<Event>` callbacks, `readonly` data props, explicit children typing, no `any`). TypeScript prop interfaces for 12 architecturally significant components across 4 categories: layout (AppShell, Header), data display (StatTable with generic `StatColumn<T>`, StandingsTable, Pagination), feedback (ErrorBanner, LoadingLedger, TypewriterText), baseball (DiamondField with `FieldPosition`, PlayerCardDisplay, LineScore, BaseIndicator). Implementation requirements per component (REQ-COMP-003, REQ-COMP-004)
  - **Section 19.3 (Page Layout & Routing)**: React Router v6 `createBrowserRouter` in `src/router.tsx` with 13-route table (2 public, 10 authenticated + lazy-loaded, 1 fallback). `AuthGuard` component in `src/features/auth/` with three-state logic (initializing/unauthenticated/authenticated). Per-route ErrorBoundary > Suspense > LazyPage wrapping pattern. Full router code example (REQ-COMP-005, REQ-COMP-006, REQ-COMP-007)
  - **Section 19.4 (Feature Page Composition Pattern)**: Standard 4-phase page skeleton (hook consumption, loading guard, error overlay, composition) with DashboardPage code example. Data flow chain enforcing Layer 5 hooks between features and stores. Shared vs feature-scoped component decision criteria table (REQ-COMP-008, REQ-COMP-009)
  - **Section 19.5 (Responsive Layout)**: Desktop-first with single 768px breakpoint (`max-md:` prefix). 10-row component behavior table (AppShell, Header, StatTable, StandingsTable, DiamondField, Dashboard, DraftBoard, PlayerCardDisplay, buttons, Footer). SVG scaling strategy for DiamondField using `viewBox` and `preserveAspectRatio` (REQ-COMP-010)
  - **Section 19.6 (Animation & Transition Patterns)**: CSS-only animations in 3 categories: state transition micro-animations (6-row property/duration/easing table), signature keyframe animations (LoadingLedger pulsing ellipsis, TypewriterText character reveal, SEASON COMPLETED stamp slam), `prefers-reduced-motion` compliance with instant fallbacks (REQ-COMP-011)
  - **Section 19.7 (Accessibility)**: WCAG 2.1 Level AA target. Keyboard navigation rules for custom controls. 12-row ARIA roles/attributes table for all interactive shared components. Focus trap for modals via `useFocusTrap` hook. Skip-to-content link, per-page `document.title`, 6-row color contrast verification table (all pairs pass AA+), form label and validation error association requirements (REQ-COMP-012, REQ-COMP-013)
  - Added 13 new requirements: REQ-COMP-001 through REQ-COMP-013
  - Updated Table of Contents with Section 19 entry and 7 subsection links
  - Updated version to 3.6

## 2026-02-08 - Software Requirements Document v3.5 (API Response Contracts)

### Added
- `docs/SRD.md` v3.5 - Added comprehensive API response contracts (Section 14.2-14.5 with 4 subsections):
  - **Section 14.2 (Success Response Envelopes)**: `ApiResponse<T>` generic envelope with `data`, `meta.requestId`, `meta.timestamp`. `PaginatedResponse<T>` extending `ApiResponse` with `pagination` block (page, pageSize, totalRows, totalPages). Query parameter spec for paginated endpoints (page, sortBy, sortOrder). Client-side discrimination pattern (`data` key vs `error` key) (REQ-API-004, REQ-API-005)
  - **Section 14.3 (HTTP Status Code Semantics)**: Success status code table -- 200 OK (retrieval/update), 201 Created (new resource + Location header), 202 Accepted (bulk simulation with simulationId), 204 No Content (deletion/archive). Complements error status codes from REQ-ERR-001 (REQ-API-006)
  - **Section 14.4 (Response Helpers and Conventions)**: `api/_lib/response.ts` helper function signatures (`ok`, `created`, `accepted`, `noContent`, `paginated`) using Vercel types. camelCase JSON / snake_case database field naming convention with mapping rules. Content-Type and CORS specifications (REQ-API-007, REQ-API-008)
  - **Section 14.5 (Endpoint Response Type Mapping)**: 21-row authoritative table mapping every endpoint to method, status code, helper function, response type, and pagination flag. 6 new TypeScript interfaces (`JoinLeagueResult`, `DraftPickResult`, `DraftState`, `GameDetail`, `TransactionResult`, `ArchiveSummary`). Simulation endpoint dual-behavior: single-day synchronous (200) vs multi-day async with Realtime (202) (REQ-API-009, REQ-API-010, REQ-API-011)
  - Added 8 new requirements: REQ-API-004 through REQ-API-011
  - Updated Table of Contents with Section 14 subsection links (14.1-14.5)
  - Updated version to 3.5

## 2026-02-08 - Software Requirements Document v3.4 (State Management Architecture)

### Added
- `docs/SRD.md` v3.4 - Added comprehensive state management architecture (Section 18 with 8 subsections):
  - **Section 18.1 (Store Slice Design)**: Full TypeScript interfaces for all 5 Zustand stores (authStore, leagueStore, rosterStore, simulationStore, statsStore) with state fields, action signatures, and supporting types. Store summary table mapping persistence, realtime, and hook consumers (REQ-STATE-001, REQ-STATE-002)
  - **Section 18.2 (Action Patterns)**: Naming conventions (fetch/set/invalidate/clear/update/verb patterns). Async action flow: loading -> service call -> success/failure -> cleanup. immer middleware table per store (REQ-STATE-003, REQ-STATE-004, REQ-STATE-005)
  - **Section 18.3 (Selector Patterns)**: Atomic selector rule (never subscribe to entire store). Derived state in Layer 5 hooks via useMemo. Derived value table with source stores and hook locations (REQ-STATE-006, REQ-STATE-007)
  - **Section 18.4 (Persistence Strategy)**: Per-store persist config table (localStorage keys, partialize fields). Schema versioning with migrate function. Safe storage factory with memory fallback per REQ-ERR-018 (REQ-STATE-008, REQ-STATE-009, REQ-STATE-010)
  - **Section 18.5 (Cache Invalidation)**: 7-event invalidation trigger table (sim complete, roster change, draft complete, status change, archive, switch league, logout). Stale-while-revalidate pattern (REQ-STATE-011, REQ-STATE-012)
  - **Section 18.6 (Realtime Subscriptions)**: Supabase Realtime in Layer 5 hooks, not stores. useRealtimeProgress hook architecture. Polling fallback on disconnect. Sim completion triggers cross-store invalidation (REQ-STATE-013, REQ-STATE-014)
  - **Section 18.7 (Store Initialization & Auth Lifecycle)**: Full initialization sequence from app mount through auth state detection. Persist rehydration, session handling, background refetch, logout cascade (REQ-STATE-015)
  - **Section 18.8 (Development Tooling)**: Zustand devtools middleware in dev builds only. Middleware stacking order. Redux DevTools integration (REQ-STATE-016)
  - Added 16 new requirements: REQ-STATE-001 through REQ-STATE-016
  - Added `storage-factory.ts` to `src/stores/` in Section 3.3 directory tree
  - Updated Table of Contents with Section 18 entry and 8 subsection links
  - Updated version to 3.4

## 2026-02-08 - Software Requirements Document v3.3 (Testing Strategy)

### Added
- `docs/SRD.md` v3.3 - Added comprehensive testing strategy (Section 17 with 7 subsections):
  - **Section 17.1 (Test Pyramid & TDD Workflow)**: Three-layer pyramid (70% unit / 20% integration / 10% E2E). RED-GREEN-REFACTOR TDD cycle per CLAUDE.md Rule 11. Unit tests via Vitest, E2E via Playwright (REQ-TEST-001, REQ-TEST-002)
  - **Section 17.2 (Coverage Targets)**: Per-directory coverage thresholds -- 95% line/90% branch for simulation and card-generator, 100%/100% for RNG, 85%/80% overall project floor. CI fails on threshold violation (REQ-TEST-003, REQ-TEST-004)
  - **Section 17.3 (Mock Boundaries & Test Isolation)**: Mock rules per test layer -- pure logic (Layer 1) requires zero mocks, Supabase mocked in unit/real in integration, Claude API always mocked, SeededRNG always real with fixed seed. Layer 1 testability enforced by architecture (REQ-TEST-005, REQ-TEST-006, REQ-TEST-007)
  - **Section 17.4 (Test Fixtures & Data Strategy)**: 5 fixture files (sample-players, sample-cards, sample-game-state, sample-outcomes, mini-lahman/) with `_meta` documentation fields. Static JSON committed to repo, regenerated on interface changes (REQ-TEST-008, REQ-TEST-009)
  - **Section 17.5 (Requirement Traceability)**: REQ-* identifiers in Vitest `describe` block names for grep-based discovery. `tests/TRACEABILITY.md` mapping table linking every REQ-* to its validating test(s) (REQ-TEST-010, REQ-TEST-011)
  - **Section 17.6 (Performance & Benchmark Tests)**: Vitest bench for 5 NFR targets (single game <500ms, full season <60s, CSV parse <10s, determinism, OutcomeTable O(log n)). Benchmarks non-blocking in CI except determinism which is blocking (REQ-TEST-012, REQ-TEST-013, REQ-TEST-014)
  - **Section 17.7 (CI/CD Test Configuration)**: GitHub Actions pipeline (install -> lint+typecheck || tests -> benchmarks -> E2E -> coverage). Vitest config (v8 coverage, forks pool, 10s timeout, path aliases). Playwright config (Chromium-only, 30s timeout, failure screenshots). 7 npm test scripts (REQ-TEST-015, REQ-TEST-016, REQ-TEST-017, REQ-TEST-018)
  - Added 18 new requirements: REQ-TEST-001 through REQ-TEST-018
  - Updated Table of Contents with Section 17 entry
  - Updated version to 3.3

## 2026-02-08 - Software Requirements Document v3.2 (Error Handling & Recovery)

### Added
- `docs/SRD.md` v3.2 - Added comprehensive error handling strategy (Section 15.8 with 9 subsections):
  - **Section 15.8.1 (Error Classification)**: 9 typed error categories (`VALIDATION`, `AUTHENTICATION`, `AUTHORIZATION`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMIT`, `SIMULATION`, `DATA`, `EXTERNAL`) with `AppError` interface, `ErrorCategory` union type, `ValidationDetail` for field-level errors, and `ErrorCode` string union with 20+ machine-readable codes (REQ-ERR-001, REQ-ERR-002)
  - **Section 15.8.2 (API Error Response Contract)**: Standard `ApiErrorResponse` JSON envelope for all error responses with `code`, `message`, `details[]`, and `requestId`. `X-Request-Id` UUID v4 header on every request/response for log correlation (REQ-ERR-003, REQ-ERR-004)
  - **Section 15.8.3 (Validation Strategy)**: Zod schema validation co-located with TypeScript interfaces in `src/lib/types/`. Three validation boundaries: API boundary (request body), service layer (business rules), pure logic (invariant assertions). Zod-to-AppError transformation (REQ-ERR-005, REQ-ERR-006, REQ-ERR-007)
  - **Section 15.8.4 (Layer-Specific Error Handling Rules)**: Error throw/catch/pass-through rules for all 8 architectural layers plus Workers. Two terminal error boundaries: API Functions (server) and Features/Error Boundaries (client) (REQ-ERR-008, REQ-ERR-009)
  - **Section 15.8.5 (React Error Boundaries)**: Per-feature-route error boundaries with fallback UI (error message, "Return to Dashboard", "Try Again"). Inline `ErrorBanner.tsx` with ERROR/WARN/INFO severity levels for action errors (REQ-ERR-010, REQ-ERR-011, REQ-ERR-012)
  - **Section 15.8.6 (Logging & Observability)**: Structured JSON `ErrorLogEntry` format with `requestId`, `leagueId`, `userId`, `operation`, `errorCode`, `duration_ms`. Three log levels: ERROR (unrecoverable), WARN (degraded), INFO (state transitions) (REQ-ERR-013, REQ-ERR-014)
  - **Section 15.8.7 (Retry & Recovery Policies)**: Per-operation retry table -- Claude API (3 retries, exponential backoff), Supabase reads (2 retries, linear), writes (1 retry), simulation/CSV/draft (0 retries). All retries logged at WARN, final failures at ERROR (REQ-ERR-015, REQ-ERR-016)
  - **Section 15.8.8 (Graceful Degradation)**: Visible fallbacks per CLAUDE.md Rule 3 -- Claude AI to template commentary, Realtime to polling, localStorage to memory-only. Every fallback activation logged and user-notified (REQ-ERR-017, REQ-ERR-018)
  - **Section 15.8.9 (Database Error Mapping)**: PostgreSQL error code to AppError mapping (23505 UNIQUE -> CONFLICT, 23503 FK -> NOT_FOUND, 23514 CHECK -> VALIDATION, 42501 RLS -> AUTHORIZATION, 40001 serialization -> retry then CONFLICT, 57014 timeout -> EXTERNAL). Constraint-to-message lookup table. Raw DB errors never reach client (REQ-ERR-019, REQ-ERR-020)
  - Added 20 new requirements: REQ-ERR-001 through REQ-ERR-020
  - Updated Table of Contents with Section 15.8 entry
  - Updated version to 3.2

## 2026-02-08 - Software Requirements Document v3.1 (Project Structure & Module Architecture)

### Added
- `docs/SRD.md` v3.1 - Added project directory structure and module architecture (Sections 3.3-3.7):
  - **Section 3.3 (Project Directory Structure)**: Full directory tree (~120 files) covering `api/` (Vercel serverless functions with file-based routing), `src/` (React frontend with components, features, hooks, stores, services, workers), `src/lib/` (shared pure logic: simulation engine, card generator, CSV parsing, draft, schedule, stats, managers, RNG, types), `supabase/` (11 sequential SQL migration files), `tests/` (unit/integration/E2E mirroring source structure), and root configs
  - **Section 3.4 (Module Architecture & Dependency Rules)**: 8-layer dependency hierarchy (Types -> Pure Logic -> API -> Services -> Stores -> Hooks -> Components -> Features + Workers). Strict import rules prevent circular dependencies and God files. Layer 1 (Pure Logic) runs identically in browser, Node.js, and Web Worker
  - **Section 3.5 (Import Path Aliases)**: 7 `@`-prefixed path aliases (`@lib/*`, `@components/*`, `@features/*`, `@hooks/*`, `@stores/*`, `@services/*`, `@workers/*`) configured in tsconfig.json and vite.config.ts
  - **Section 3.6 (File Naming Conventions)**: PascalCase for React components, kebab-case for non-component TypeScript, `.test` suffix for unit tests, `.spec` suffix for E2E, 5-digit prefix for SQL migrations
  - **Section 3.7 (Module Size & Quality Guidelines)**: ~300 line soft limit per file, one responsibility per file, no barrel re-exports in `src/lib/`, no circular imports, colocation of feature sub-components
  - Added 5 new requirements: REQ-ARCH-001 through REQ-ARCH-005
  - Updated Table of Contents with new subsections
  - Updated version to 3.1

## 2026-02-08 - Software Requirements Document v3.0 (Supabase/Vercel + Performance)

### Changed
- `docs/SRD.md` v3.0 - Migrated from GCP/Firebase to Supabase + Vercel and added comprehensive performance requirements:
  - **Tech Stack Migration**: Replaced Firebase/GCP with Supabase (PostgreSQL, Auth, Storage, Realtime) + Vercel (hosting, serverless functions). Updated Sections 2.1, 2.2, 3.1, 3.2, 4.3, 13, 14, 15, 16
  - **Section 4.3 (Database Schema)**: Replaced Firestore document collections with relational PostgreSQL schema (CREATE TABLE with foreign keys, constraints, JSONB columns for card data, Row Level Security policies, composite indexes)
  - **Section 14 (API)**: Updated from Cloud Functions to Vercel Serverless Functions, Firestore real-time to Supabase Realtime subscriptions
  - **Section 15 (Non-Functional Requirements)**: Expanded from 7 to 21 requirements across 7 subsections:
    - 15.3 Simulation Engine: Web Worker for client-side sim (NFR-008), OutcomeTable cumulative distribution pre-computation (NFR-009), memory-bounded bulk simulation (NFR-010)
    - 15.4 Data Loading: PapaParse streaming mode (NFR-011), pre-computed player pool persistence (NFR-012), Zustand persist caching (NFR-013)
    - 15.5 Database: PostgreSQL transactions (NFR-014), database indexes (NFR-015), denormalized standings (NFR-016)
    - 15.6 UI Rendering: Route-based code splitting < 200KB (NFR-017), font loading with swap/subset (NFR-018), cursor-based stat pagination (NFR-019)
    - 15.7 Infrastructure: Simulation progress streaming via Supabase Realtime (NFR-020), Vercel function resource config with chunked simulation fallback (NFR-021)
  - **Section 16 Phase 9**: Renamed to "Performance & Polish", added 12 performance checklist items referencing new NFRs
  - Updated version to 3.0

## 2026-02-08 - Software Requirements Document v2.0 (Faithful APBA Port)

### Changed
- `docs/SRD.md` v2.0 - Rewrote Sections 4, 5, and 11 for faithful APBA BBW 3.0 port:
  - **Section 4 (Data Layer)**: Replaced simple probability distributions with APBA-style 35-element card arrays generated from Lahman stats via verified correlation mapping (value 13=walk r=+0.978, value 14=strikeout r=+0.959, etc.). Added CardGenerator algorithm with 6-step process, 7-tier power rating at position 24, archetype flags from bytes 33-34 pair analysis, pitcher grade 1-15 scale from ERA percentile
  - **Section 5 (Simulation Engine)**: Replaced weighted-random resolution with multi-step card+IDT lookup system. Ported full 36-row OutcomeTable from APBA's IDT.OBJ (144 bytes). Added pitcher grade gating (grade vs random check shifts outcomes), archetype modifiers (power/speed/contact bonuses), platoon card modification, bunt resolution, stolen base engine, pitcher fatigue grade degradation
  - **Section 11 (AI Integration)**: Added 4 manager personality profiles ported from APBA (Cap Spalding/conservative, Duke Robinson/aggressive, Johnny McCoy/balanced, Larry Pepper/analytical) with configurable decision thresholds for steals, bunts, hit-and-run, pinch-hitting, IBB, pitcher pull, baserunning aggressiveness
  - **Section 2.2**: Updated module mapping table with IDT port, archetype flags, pitcher grade, manager profiles
  - **Section 16**: Expanded from 8 to 9 build phases, added dedicated Phase 2 (Card Generator) and Phase 3 (Simulation Engine) with detailed APBA port checklist items
  - Updated version to 2.0, executive summary, Firestore schema (card array in roster, managerProfile on team)

## 2026-02-08 - Software Requirements Document v1.0

### Added
- `docs/SRD.md` - Initial Software Requirements Document synthesized from:
  - APBA reverse engineering findings (simulation engine, card system, manager AI)
  - Baseball Ledger project spec (league workflow, roster rules, scheduling)
  - UI/UX design spec (Digital Almanac theme, component architecture)
  - 100+ numbered requirements (REQ-*) across 16 sections
  - Full TypeScript interface definitions (PlayerCard, PitcherAttributes, GameState, BattingStats, PitchingStats)
  - Game simulation engine specification (plate appearance resolution, pitching management, baserunner logic)
  - AI integration spec (Claude API for manager decisions, commentary, draft, trades)
  - 8-phase build plan with checklist items
  - Firestore schema design
  - REST API endpoint specification

## 2026-02-07 - APBA Baseball for Windows 3.0 Reverse Engineering

### Added
- `docs/APBA_REVERSE_ENGINEERING.md` - Comprehensive reverse engineering analysis of APBA BBW 3.0
  - Complete binary file format specifications (PLAYERS.DAT, NSTAT.DAT, PSTAT.DAT, ORG.DAT)
  - Player card system analysis: 35-byte card encoding with outcome probability distributions
  - Statistical correlation analysis of card values vs real 1971 batting stats (460 qualified batters)
  - Game simulation engine architecture (plate appearance state machine, IDT.OBJ decision table)
  - Manager AI system documentation (4 personality profiles with decision dictionaries)
  - Commentary system architecture (3-tier template system with 100+ game events)
  - Stadium and audio system configuration
  - League organization data formats
  - Concrete porting strategy mapping APBA systems to React/TypeScript equivalents
  - TypeScript interface definitions for PlayerCard and PitcherCard
