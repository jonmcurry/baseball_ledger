# WINBB.EXE Binary Analysis Findings

## Executive Summary

Programmatic binary analysis of WINBB.EXE (1.12 MB, 16-bit NE format, Borland C++,
June 1995) confirms that **IDT.OBJ is the sole outcome resolution mechanism** in BBW.
There are NO play result boards. The board game's multi-dimensional lookup tables
(situation x N x grade x fielding -> outcome) were simplified to the IDT decision
table for the computer version.

## Definitive Findings

### 1. IDT.OBJ IS the Sole Outcome Resolver

**Confidence: 95%**

- IDT.OBJ is loaded from disk at runtime (not compiled into EXE)
- String "IDT" at 0x0F4D4F, ".OBJ" at 0x0F4D53, "IDT Read" at 0x0F4D58
- Loading sequence: `LoadTable` -> opens `TABLES/IDT.OBJ` -> "IDT Read"
- NO strings matching "PLAY RESULT", "RESULT BOARD", "PlayResult", or
  "ResultBoard" found anywhere in the 1.12 MB executable
- "BOARD" matches were all "KEYBOARD" (OS module references)
- This means our current IDT.OBJ-based PA resolution is architecturally correct

### 2. B3EHMSG.TBL is Pure Commentary Data

**Confidence: 99%**

- 47,776 bytes of commentary event -> message block offset mappings
- First record: `54 2F 00 00 42 4F 54 00` = count (12116) + "BOT\0" header
- "BOT" = "Beginning Of Turn" commentary prefix (matches BOTHitComments,
  BOTDoubleNumber, BOTStrikeoutCom categories from RE doc)
- Repeated triplets of uint32 offsets (3 style variants per event)
- Category prefixes confirmed via table loading code:
  - BOT (batting outcomes), PCT (pitch count), RRT (runner results)
  - FCOT (first-contact outcomes), TOOT, SCOT (score outcomes)
  - EOGOT (end-of-game), TenseLevelOT (dramatic tension)
- B3EHMSG.TBL contains ZERO simulation logic

### 3. Grade Adjustment Functions Exist

**Confidence: 85% (names found, formulas unknown)**

- `BJStartGradeAdj` at 0x0F79EA -- starting pitcher grade adjustment
- `BJReliefGradeAdj` at 0x0F79FE -- relief pitcher grade adjustment
- Nearby: `PankinBatting`, `PankinSlugging`, `PankinHand` (Pankin = ratings module)
- Stats display confirms: "Starting Grade Change", "Adjusted Starting Grade",
  "Relief Grade Change", "Adjusted Relief Grade"
- **Unknown: the exact formula.** Needs Ghidra disassembly.

### 4. Pitcher Symbols Are Position String Text, Not a Binary Table

**Confidence: 90%**

- The "SYMBOL" string at 0x0F3928 and ".SYM" at 0x0F3936 refer to the
  audio commentary symbol system (MSSGS.SYM / NUMS.SYM), NOT pitcher symbols
- MSSGS.SYM maps commentary variables (_0, _P, _BASESITUATION, etc.) to audio
  segment IDs for Ernie Harwell's voice playback
- Pitcher symbols (Y, Z, W, X, *) are encoded as ASCII characters in the
  11-byte position string at offset 0x87 in PLAYERS.DAT
- Examples: "L 14     Z", "R 15    YZ", "L  9* WXY"
- How these symbols modify PA outcomes is NOT in the string data -- it's in code
- **Unknown: the exact symbol effect rules.** Needs Ghidra disassembly.

### 5. Platoon and Batting Characteristics Confirmed as Separate Ratings

**Confidence: 90%**

- Offense ratings section at 0x0F0B42 lists: Bats, Throws, **Type**, **Platoon**,
  Hit and Run, Speed, Steal Allowance, Steal Success, Injury
- "Type" = batting characteristic (SA/PL/PR/PB)
- "Platoon" = separate platoon adjustment rating
- These modify the effective grade or card outcomes during PA resolution
- **Unknown: the exact modification formula.** Needs Ghidra disassembly.

### 6. Complete PA Flow Function Names

The game loop function names confirm our understanding of the PA flow:

```
Pregame -> BeginGame ->
  NextInning -> NextHalfInning ->
    InitPlateAppearance ->
      DefPlayDecision (defensive decisions)
      OffPlayDecision (offensive decisions)
      DefDynDecision (dynamic defensive: pitching change, etc.)
      OffDynDecision (dynamic offensive: steal, bunt, etc.)
      BeginPlay
      EndOfPlay
    EndOfPlateAppearance ->
  EndOfHalfInning -> EndOfInning ->
EndOfGame -> InterGame -> PostGame
```

### 7. No Additional Data Files Found on Disk

Referenced but NOT present on the installation CD:
- PlyrOff.DAT, PlyrDef.DAT, PlyrPit.DAT (player offense/defense/pitching ratings)
- PLYRAPM.* (Advanced Player Management ratings)
- YEAR.DAT (year data)

These are likely runtime-generated files from PLAYERS.DAT parsing, or used
only by the stats/draft modules (WINSTATS.EXE, WINDRAFT.EXE).

### 8. Manager AI Uses Rule-Based System

- `RuleTable` at 0x0F68B4, followed by `DataSeg`, `CodeSeg`, `MGR`, `.MOB`
- Rule types: "Lineup Selection", "Offensive Substitution", "Batting and Stealing",
  "Running", "Defensive Substitution", "Pitching and Defensive Set", "Throwing"
- Infield positioning: "In", "Deep", "Hold"
- 4 manager profiles via MGR*.DCT/LIB/MOB/MSY files (~375KB each)

## What This Means for Baseball Ledger

### Already Correct
- IDT.OBJ-based PA resolution (the core mechanic)
- Grade check: R2 in [1,15], pitcher wins if R2 <= grade
- IDT-active range [5,25] vs direct mapping for values 0-4 and 26+
- Card value -> outcome correlation mapping
- Pitcher fatigue/grade degradation
- Runner advancement with speed checks

### Needs Ghidra Disassembly (4 unknowns)
1. **BJStartGradeAdj formula** -- How is starting pitcher grade adjusted based on
   handedness matchup, platoon rating, and batting characteristic?
2. **BJReliefGradeAdj formula** -- Same for relief pitchers
3. **Pitcher symbol effects** -- How do Y/Z/W/X flags modify PA outcomes?
   (Likely: post-IDT overrides -- force K, force W, convert HR<->2B)
4. **Platoon + Type interaction** -- How do the "Platoon" and "Type" ratings
   modify the effective grade or card interpretation?

### Not Needed (confirmed absent from BBW)
- Play result boards (board game only, not in BBW)
- Fielding column lookup tables (not found)
- Situation-dependent outcome modifiers (not found)

## Byte Patterns Near IDT Loading (For Future Analysis)

Immediately after "IDT Read" at 0x0F4D62, interesting byte patterns:
```
0F4D8F: 01 02 03 01 02 01 02 01  -- small sequence (1,2,3,1,2,1,2,1)
0F4D97: 00 00 00 01 00 00 00 01  -- boolean-like pattern
0F4DA7: 00 00 00 01 01 01 00 01  -- boolean-like pattern
0F4DB7: 01 00 00 01 02 57 00 A9  -- transitions to different data
```
This could be a configuration table for IDT column interpretation or a
separate small lookup table. Worth investigating with Ghidra.
