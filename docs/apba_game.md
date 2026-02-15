# System Requirements Document (SRD)  
**Project:** Web-Based APBA Baseball Simulator (Mimic APBA Baseball for Windows v3.0)  
**Version:** 1.0  
**Date:** February 2025  
**Author:** Grok (based on user-provided info and public reverse-engineering knowledge)  
**Goal:** Create a faithful web-based clone of the APBA Baseball for Windows v3.0 simulation engine, focusing on Master Game-style batter vs. pitcher resolution using 36-sided dice rolls, player cards, play result boards, pitcher grades/symbols, platoon adjustments, and runner advances.

## 1. Project Overview

### 1.1 Purpose
Replicate the core plate appearance (PA) resolution logic of APBA Baseball for Windows v3.0 (likely based on late-1990s/early-2000s Master Game rules).  
The simulation must be deterministic given the same inputs (dice roll, cards, situation) but use RNG for dice in replays.  
Target: Accurate aggregated stats over large samples (season replays) matching real/historical player performance.

### 1.2 Scope
- In-scope:  
  - Dice roll (36 equally likely outcomes)  
  - Batter card lookup (36 play-result numbers, optional second column)  
  - Play result board lookup (by base/out situation, N, effective pitcher grade, fielding column)  
  - Pitcher modifiers (grade adjustment via platoon/pull, symbols like K/X/Y/W/Z/G/H/L/M)  
  - Basic outcome resolution (hit/out/walk/K/error/HBP) + runner advances  
  - In-game stats tracking (AB, H, 2B/3B/HR, BB, K, etc.)  

- Out-of-scope (for v1):  
  - Full UI / team management / league play  
  - Detailed fielding ratings per player  
  - Sacrifice bunts, hit-and-run, stealing logic  
  - Park factors, weather, injuries  

### 1.3 Key Constraints
- Must match v3.0 behavior exactly where possible (extract data from user's install files).  
- Web-based → JavaScript/TypeScript (Node or browser).  
- No access to proprietary APBA source code → rely on file extraction + public reverse-engineering.

## 2. Core Simulation Algorithm

### 2.1 Plate Appearance Flow
1. Generate dice roll: integer 0–35 (or 11–66 format: red die 1–6 × white die 1–6).  
2. Lookup batter card:  
   - n = batterCard.primary[roll]  
   - If n === 0 (or marker) and has second column: re-roll and use batterCard.secondary[roll]  
3. Determine effective pitcher grade:  
   - Base = pitcher.grade (A=best → D=worst or numeric)  
   - Adjust via batter BC (SA/PL/PR/PB) + platoon numbers + handedness  
4. Get current situation key: one of ~8–10 base/out states (e.g., "000-0", "100-1", "111-2")  
5. Lookup play result board:  
   - Input: situation, n (1–41), effective_grade, fielding_column (1/2/3 based on defense)  
   - Output: event (e.g., "1B LF", "K", "FO CF", "GO 4-3 DP", "W", "E-5"), advance rules, hit valuation  
6. Apply pitcher symbols overrides (Master Game):  
   - K/X/Y → force strikeout on eligible results  
   - W → force walk  
   - Z → nullify walk  
   - G/H/L/M → convert HR ↔ 2B  
7. Resolve runner advances (fixed + possible extra roll for OF arms)  
8. Update game state (bases, outs, runs, player stats)

### 2.2 Data Structures (Suggested)
```ts
interface BatterCard {
  primary: number[];          // 36 entries, values 0–41
  secondary?: number[];       // optional re-roll column
  bc: 'SA' | 'PL' | 'PR' | 'PB';
  platoon: { vsL: number; vsR: number };
  speed: 'F' | 'S' | 'A' | etc.;
  hand: 'L' | 'R' | 'S';
}

interface Pitcher {
  grade: number | string;     // e.g. 1–30 numeric or A–D
  symbols: Set<string>;       // 'K','X','Y','W','Z','G','H','L','M', etc.
  hand: 'L' | 'R';
  fatigue?: number;
}

type Situation = string;       // e.g. "000-0outs", "123-2outs"
type PlayResult = {
  event: string;
  location?: string;
  advances: string;           // e.g. "runners advance 2 bases", "forced at home"
  isOut: boolean;
  isK: boolean;
  isBB: boolean;
  // etc.
};
2.3 Lookup Boards

8+ situations × ~41 rows × 4–5 columns (grades A/B/C/D + fielding cols)
Extract from user's v3.0 install (likely hard-coded in BASEBALL.EXE or .DAT resource)
Public hints: search .EXE for strings "SINGLE", "DOUBLE", "HOME RUN", "STRIKEOUT", "GROUND OUT 6-3"

3. Data Extraction Plan (From User's v3.0 Install)
3.1 Files to Locate

Main executable: BASEBALL.EXE / BBALL.EXE / APBA.EXE → contains play result boards (search hex/strings)
Roster/season files: .DAT, .ROS, .FRN, .C, .MDB, .BKP → player cards (36 nums per batter)
Any resource .DLL or data folder under DATA/SEASONS/TEAMS

3.2 Extraction Steps

Hex editor / strings tool on .EXE → find outcome text blocks → map N → result per grade/situation
Open roster .DAT/.MDB with hex viewer or Access → parse player records (likely fixed-length or delimited)
Batter: name, 36 bytes/ints, BC byte, platoon bytes, speed byte
Pitcher: name, grade byte, symbol bitflags

If .MDB found → use MDB viewer to export tables

4. Non-Functional Requirements

Performance: Handle 10,000+ simulated PAs/second (JS should be fine)
Accuracy: Aggregated stats within ~1–2% of real after full season
Reproducibility: Seedable RNG for dice rolls
Extensibility: Easy to add Basic Game boards, newer symbols, custom seasons

5. Next Steps / Open Questions

User to provide: directory listing + key file names from v3.0 install
Identify exact file format for player cards (offset, length per player)
Transcribe/sample 1–2 play result board sections from .EXE strings
Decide: browser-only sim vs. Node backend

6. References

APBA Master Game Instructions (public PDF from apbagames.com/downloads)
Fan forums: Delphi APBA Between the Lines, APBA Blog, Reddit r/APBABaseball
Card generators: compuducksports.com/cardcomp (for validation)
YouTube tutorials: APBA Baseball for Windows gameplay / card viewing