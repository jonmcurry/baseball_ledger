# Phase 3: Simulation Engine (APBA Port)

> Started: 2026-02-08
> Status: In Progress

This is the heart of the application - a faithful port of APBA Baseball for Windows 3.0's card-based simulation system.

## Implementation Order

Following TDD approach (Claude.md Rule 11): Write failing test first, then implement.

### Task 1: Seeded RNG (REQ-NFR-007) - PREREQUISITE - COMPLETE
- [x] Write failing tests for SeededRNG class (33 tests)
- [x] Implement SeededRNG with deterministic output (Mulberry32 algorithm)
- [x] Verify same seed produces identical sequences
- [x] File: `src/lib/rng/seeded-rng.ts`

### Task 2: OutcomeTable (REQ-SIM-003) - COMPLETE
- [x] Write failing tests for 35-row weighted lookup matrix (24 tests)
- [x] Implement OutcomeTable from IDT.OBJ port
- [x] Verify frequency-weighted row selection
- [x] File: `src/lib/simulation/outcome-table.ts`

### Task 3: Outcome Resolver (REQ-SIM-003a)
- [ ] Write failing tests for OutcomeCategory to game state changes
- [ ] Implement outcome resolution logic
- [ ] File: `src/lib/simulation/outcome-resolver.ts`

### Task 4: Card Lookup & Pitcher Grade Gate (REQ-SIM-004) - COMPLETE
- [x] Write failing tests for card position selection (18 tests)
- [x] Implement structural constant skipping
- [x] Implement pitcher grade gate (step 4d)
- [x] File: `src/lib/simulation/plate-appearance.ts`

### Task 5: Direct Card Value Fallback (REQ-SIM-004a) - COMPLETE
- [x] Write failing tests for fallback mapping (47 tests)
- [x] Implement direct card value to outcome mapping
- [x] File: `src/lib/simulation/card-value-fallback.ts`

### Task 6: Archetype Modifiers (REQ-SIM-004 step 6)
- [ ] Write failing tests for power/speed/contact bonuses
- [ ] Implement archetype modifier application
- [ ] Integrate into plate-appearance.ts

### Task 7: Platoon Adjustment (REQ-SIM-004b) - COMPLETE
- [x] Write failing tests for L/R matchup card modification (21 tests)
- [x] Implement platoon adjustment
- [x] File: `src/lib/simulation/platoon.ts`

### Task 8: Bunt Resolution (REQ-SIM-004c)
- [ ] Write failing tests for bunt outcomes
- [ ] Implement bunt resolution logic
- [ ] Integrate into plate-appearance.ts

### Task 9: Baserunner Engine (REQ-SIM-006, REQ-SIM-007)
- [ ] Write failing tests for speed checks
- [ ] Write failing tests for runner advancement priorities
- [ ] Implement BaserunnerEngine
- [ ] File: `src/lib/simulation/baserunner.ts`

### Task 10: Defense Engine (REQ-SIM-008)
- [ ] Write failing tests for error resolution
- [ ] Write failing tests for DP checks
- [ ] Implement DefenseEngine
- [ ] File: `src/lib/simulation/defense.ts`

### Task 11: Stolen Base Resolution (REQ-SIM-009)
- [ ] Write failing tests for SB attempts
- [ ] Implement StolenBaseResolver
- [ ] File: `src/lib/simulation/stolen-base.ts`

### Task 12: Pitching Management (REQ-SIM-010 through 014)
- [ ] Write failing tests for pitcher fatigue/grade degradation
- [ ] Write failing tests for starter removal triggers
- [ ] Write failing tests for reliever selection
- [ ] Write failing tests for closer usage rules
- [ ] Implement PitchingManager
- [ ] File: `src/lib/simulation/pitching.ts`

### Task 13: Game State Machine (REQ-SIM-001, REQ-SIM-002)
- [ ] Write failing tests for inning flow
- [ ] Write failing tests for plate appearance loop
- [ ] Write failing tests for extra innings
- [ ] Implement GameEngine.simulate()
- [ ] File: `src/lib/simulation/engine.ts`

### Task 14: Game Result & Box Score (REQ-SIM-016)
- [ ] Write failing tests for GameResult output
- [ ] Write failing tests for BoxScore generation
- [ ] Implement post-game stat accumulation

### Task 15: Manager AI Decisions (REQ-AI-002, REQ-AI-003)
- [ ] Write failing tests for pre-pitch decisions
- [ ] Implement ManagerAI decision engine
- [ ] File: `src/lib/simulation/manager-ai.ts`

## Dependencies

- `src/lib/types/game.ts` (GameState, TeamState, BaseState) - EXISTS
- `src/lib/types/player.ts` (PlayerCard, PitcherAttributes) - EXISTS
- `src/lib/types/outcome.ts` (OutcomeCategory) - EXISTS
- `src/lib/card-generator/*` - EXISTS (Phase 2 complete)

## Testing Strategy

- Each task has unit tests in `tests/unit/lib/simulation/`
- Use fixtures from `tests/fixtures/`
- Seeded RNG ensures deterministic test outcomes
- 95% line coverage, 90% branch coverage target (REQ-TEST-003)

## Notes

- Layer 1 code: NO React, NO Node.js APIs, NO browser APIs
- Must run identically in browser, Node.js, and Web Worker
- Follow Section 3.4 architecture rules strictly
