Simulation Engine Reference Document (SRD)
Overview
This document provides a structured reference for the core simulation engine of a web-based baseball simulation application built in TypeScript/React. The engine aims to emulate mechanics of APBA Baseball for Windows (BBW) with 100% fidelity, resolving plate appearances (PAs), game flow, and stats accumulation through a single core algorithm that mirrors BBW's card-and-random-outcome system. The current implementation is spread across approximately 20 files in src/lib/simulation/, totaling around 4,500 lines of code.
To achieve exact BBW mimicry, the engine must prioritize a unified, table-driven algorithm for all outcome generation: a pseudo-random number generator (PRNG) simulates 2d6 dice rolls (uniform 11–66), selects the batter's card column based on the pitcher's effective grade, performs a direct lookup on the virtual player card for the base result, applies strategy modifiers via chained charts, and resolves runners/fielding with additional lookups. This single algorithm supersedes the current multi-path suppression/IDT/fallback logic to ensure statistical parity with BBW over replays and seasons.
Key Issue
In full-season simulations, player outcomes (e.g., batting averages, home runs, RBIs) are super inflated compared to expected realistic or historical benchmarks. This likely stems from the fragmented PA pipeline (e.g., over-reliance on IDT/fallbacks, improper weighting, or modifier stacking), which deviates from BBW's singular lookup-based fidelity. Refactoring to the single algorithm below will normalize outcomes by enforcing direct card emulation without extraneous paths.
Assumptions and Design Goals

The engine uses a PRNG to simulate uniform 11–66 rolls, exactly replicating BBW's 2d6 dice (36 equally likely outcomes).
Player cards/ratings must be digitally replicated from official APBA Master Game sets (batters: 5 columns A–E; pitchers: control grades 1–5).
All outcomes trace to one initial PRNG roll + deterministic lookups; no probabilistic models or ML.
To mimic BBW 100%, eliminate current suppression paths/IDT matrix in favor of pure card lookups. Strategies/errors/advances use BBW's exact sub-charts.
No external dependencies; all logic self-contained. Import player cards as data structures (e.g., JSON maps of roll-to-result per column).

File Structure
Files are grouped by primary function. Line counts are approximate and indicate complexity. To integrate the single algorithm, centralize outcome logic in plate-appearance.ts and deprecate multi-path files (e.g., outcome-table.ts, card-value-fallback.ts) for direct card emulation.
Orchestration

game-runner.ts (~1,008 lines): Top-level game orchestrator. Handles inning flow, half-inning transitions, calls to manager AI, play-by-play narration, and real-time stat accumulation. Entry point for single-game simulations.

Outcome Generation (Core PA Pipeline)

plate-appearance.ts (~294 lines): Resolves individual plate appearances using the single core algorithm (see below). Replace grade-gated suppression paths (pitcher checks 7/8/11, IDT 15-23) with direct PRNG → column select → card lookup. Deprecate direct mapping/fallbacks.
outcome-table.ts (~333 lines): Deprecated for BBW fidelity; replace 36x4 IDT matrix with batter/pitcher card data structures (e.g., Map<Number, String> per column).
outcome-resolver.ts (~652 lines): Translates lookup results (e.g., "1"=single, "HR") into game state changes, including runner movements, outs, runs scored, and RBI credits. Retain but feed only from core algorithm.
card-value-fallback.ts (~69 lines): Deprecated; all resolutions via card lookups.

Pitcher Grade & Fatigue

pitching.ts (~378 lines): Computes effective pitcher grade (1–5) across 6 layers (base, fatigue, relief, fresh, platoon, variance). Models per-PA fatigue, bullpen/closer logic. Output gates column selection in core algorithm.
platoon.ts (~163 lines): Adjusts grades for left/right-handed matchups.

Baserunning & Stolen Bases

baserunner.ts (~168 lines): Manages runner advancement on hits using BBW speed thresholds, modified by archetype, catcher arm, and outs. Trigger from core algorithm results.
stolen-base.ts (~110 lines): Resolves stolen bases; integrate as strategy modifier in core algorithm.

Defense & Special Outcomes

defense.ts (~161 lines): Handles errors, double-plays (DPs), and fielder assignments via BBW charts; apply post-lookup in core algorithm.
bunt-resolver.ts (~118 lines): Bunt outcomes; handle as strategy branch in core algorithm.
umpire-decision.ts (~100 lines): 3% probabilistic close-call overrides; optional post-resolution tweak.
archetype-modifier.ts (~204 lines): Post-outcome adjustments for player archetypes (speed/power/contact/defense); apply after base lookup but ensure no inflation.

Strategy

manager-ai.ts (~265 lines): AI for steals, bunts, hit-and-run (H&R), pinch-hitting, intentional walks (IBB), pitcher pulls. Inject strategies into core algorithm.
manager-profiles.ts (~102 lines): Four BBW-inspired profiles for manager behavior.

Infrastructure

engine.ts (~162 lines): Game state utilities (half-inning advances, walk-offs, batting order).
season-runner.ts (~196 lines): Bulk day/season simulations; ensure PRNG seeding for reproducible replays.

Core Algorithm for Outcome Generation
To mimic BBW 100%, implement this single algorithm in plate-appearance.ts as the sole path for all PAs. It ensures every outcome derives from one PRNG roll, card lookup, and chained resolutions—eliminating inflation from fragmented logic.
Algorithm Description

Inputs: Batter card (Map<Column: 'A'|'B'|'C'|'D'|'E', Map<Roll: 11-66, Result: string>>), pitcher effective grade (1-5 from pitching.ts), strategy (none/steal/bunt/H&R/IBB), runners, fielders.
Steps:
Generate PRNG roll: Uniform random integer 11–66 (simulate 2d6).
Select column: Map grade to column (5='A' precise, 4='B', 3='C', 2='D', 1='E' wild).
Base lookup: Get result from batterCard[column][roll] (e.g., "1"=single, "HR", "K", "W"=walk, "E6"=error).
Apply strategy: If strategy active, remap result via BBW chart (e.g., H&R: certain rolls → double/out).
Resolve specials: Use sub-charts/PRNG for errors (fielder rating), DPs, advances (runner speed vs. outfield arm).
Update state: Via outcome-resolver.ts (bases, outs, stats: AB/H/BB/SO etc. per MLB rules).

Stat Fidelity: Accumulate raw (e.g., BA = H/AB); full seasons converge to card expectations (e.g., .300 card → ~.300 over 550 AB).
Pseudocode:textfunction resolvePlateAppearance(batterCard, pitcherGrade, strategy, runners, fielders): Outcome {
    const roll = prng.uniform(11, 66);  // 36 equiprobable
    const column = gradeToColumn(pitcherGrade);  // 'A' to 'E'
    let baseResult = batterCard.get(column).get(roll);  // e.g., 'HR'
    
    if (strategy !== 'none') {
        baseResult = applyStrategyChart(baseResult, roll, strategy);  // BBW sub-charts
    }
    
    const finalResult = resolveFieldingAndRunners(baseResult, roll, runners, fielders);  // Errors/DPs/advances
    updateGameStateAndStats(finalResult);
    return finalResult;
}

function gradeToColumn(grade: number): string {
    return ['E', 'D', 'C', 'B', 'A'][grade - 1];  // 1='E' wild, 5='A' control
}

// Implement applyStrategyChart, resolveFieldingAndRunners per BBW rules/charts
Implementation Notes: Load cards as data (e.g., JSON). Ensure PRNG is seeded for replays. Deprecate IDT/suppression to avoid deviations.

Plate Appearance (PA) Flow
Updated to enforce the single algorithm:

Initiation: game-runner.ts invokes plate-appearance.ts.
Pitcher Grade: From pitching.ts (with platoon.ts, fatigue).
Core Algorithm: Execute the single algorithm above for outcome.
Modifiers: Apply archetype-modifier.ts sparingly (ensure no over-boosting).
Resolution: outcome-resolver.ts updates state, integrating baserunner.ts, stolen-base.ts, defense.ts, etc.
Strategy: manager-ai.ts injects via profiles.
Stats: Inline updates; aggregate in season-runner.ts.

Potential Inflation Sources (Debugging Hypotheses)

Deprecated Paths: Remove IDT/fallbacks; use only card lookups.
PRNG Bias: Verify uniformity (no weighting bugs).
Grade/Column: Ensure wild pitchers shift to E (more walks/HRs).
Modifier Overuse: Cap archetype-modifier.ts; match BBW charts exactly.
Season Scale: Reseed PRNG per game in season-runner.ts.