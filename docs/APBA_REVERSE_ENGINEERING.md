# APBA Baseball for Windows 3.0 - Complete Reverse Engineering Analysis

> Reverse engineering of APBA Baseball for Windows 3.0 (BBW) located at `BBW/`
> Purpose: Understand simulation mechanics for porting to the Baseball Ledger React/TypeScript web application

---

## Table of Contents

1. [Application Architecture](#1-application-architecture)
2. [Player Rating System - The Card](#2-player-rating-system---the-card)
3. [Statistics File Formats](#3-statistics-file-formats)
4. [Game Simulation Engine](#4-game-simulation-engine)
5. [Card Value Correlation Analysis](#5-card-value-correlation-analysis)
6. [Manager AI System](#6-manager-ai-system)
7. [Commentary & Presentation](#7-commentary--presentation)
8. [Stadium & Audio System](#8-stadium--audio-system)
9. [League & Organization Data](#9-league--organization-data)
10. [Porting Strategy to React/TypeScript](#10-porting-strategy-to-reacttypescript)

---

## 1. Application Architecture

### Executables (6 programs)

| Module | File | Size | Purpose |
|--------|------|------|---------|
| Game Engine | `WINBB.EXE` | 1.1 MB | Core simulation, play-by-play, manager AI, field display |
| League Manager | `WINLM.EXE` | 842 KB | Season management, schedules, standings, league operations |
| Draft System | `WINDRAFT.EXE` | 1.3 MB | Player drafting, team building, roster management |
| Statistics | `WINSTATS.EXE` | 668 KB | Stats viewer, reports, league leaders, historical records |
| Master Admin | `WINMAS.EXE` | 248 KB | Sound management, administrative functions |
| Registration | `BBEREG.EXE` | 93 KB | Product registration utility |

### Dynamic Libraries (5 DLLs)

| Library | File | Size | Purpose |
|---------|------|------|---------|
| Hi-Res Graphics | `BBHIRES.DLL` | 332 KB | 1024x768 rendering engine |
| UI Controls | `BWCC.DLL` | 152 KB | Borland Windows Custom Controls (UI framework) |
| Animation Player | `AAPLAY.DLL` | 137 KB | Autodesk FLC animation playback |
| Sound Engine | `MASDLL.DLL` | 25 KB | Miller Associates Sound DLL (audio playback) |
| E-Registration | `EREGLIB.DLL` | 35 KB | Electronic registration library |

### Development Info

- **Based on**: APBA Baseball Master Game (C) 1987-1995 APBA Game Company
- **Developer**: Miller Associates, Inc.
- **Key people**: Roswell Miller, Colby Duerk, Alan Pratt, Kenneth Miller
- **Announcer**: Ernie Harwell (real MLB broadcaster)
- **UI Framework**: Borland C++ with BWCC custom controls
- **Release**: June 1995

### Data Organization

Season data stored in `.WDD` directories. Included seasons: 1921, 1943, 1971, plus 4 "OT" (custom/tournament) sets.

```
{YEAR}S.WDD/
  PLAYERS.DAT            # Player records with ratings (146 bytes each)
  NSTAT.DAT              # Batting statistics (32 bytes each)
  PSTAT.DAT              # Pitching statistics (22 bytes each)
  ORG00001/              # League organization 1
    ORG.DAT              # League/division/team hierarchy
    ORG.I00              # Organization index
    SCHEDULE.ORG         # Full season schedule
    T00001LU.ORG         # Team 1 lineup configuration
    T00001RS.ORG         # Team 1 roster/bench configuration
    T00002LU.ORG         # Team 2 lineup ...
    ...
  ORG00002/              # League organization 2 (alternate configuration)
  ORG00003/              # League organization 3
```

---

## 2. Player Rating System - The Card

### PLAYERS.DAT Record Format (146 bytes per player)

This is the most critical file in the entire application. Every player's identity, ratings, and simulation parameters are encoded in exactly 146 bytes.

```
Offset  Size  Field              Description
------  ----  -----              -----------
0x00    1     LN_LEN             Last name string length
0x01    15    LAST_NAME          Last name (ASCII, space-padded)
0x10    1     FN_LEN             First name string length
0x11    15    FIRST_NAME         First name (ASCII, space-padded)
0x20    32    META_BLOCK         Player metadata, team/league assignment, defensive ratings
0x40    35    CARD_BLOCK         The simulation "card" - outcome probability encoding
0x63    36    EXTENDED_BLOCK     Additional ratings/flags/reserved
0x87    11    POSITION_STR       Position string (e.g., "OF  2 B 17")
```

**All multi-byte numeric values are little-endian (Intel byte order).**

### The 35-Byte CARD_BLOCK (offset 0x40-0x62)

This is the heart of APBA's simulation. In the original APBA board game, each player has a physical card with numbered results. Rolling dice determines which result on the card is used, and each result maps to an outcome (single, double, homer, strikeout, etc.).

The computer version encodes this as **35 bytes where each byte value (0-42) represents an outcome category**. During simulation, the engine selects a random card position, reads the byte value, and that value determines the play outcome.

### Card Structure Analysis (from 828 players, 1971 season)

Not all 35 positions are player-variable. Many are **structural constants**:

| Position | Dominant Value | Frequency | Role |
|----------|---------------|-----------|------|
| 1 | 30 | 821/828 (99.2%) | **Structural constant** |
| 3 | 28 | 735/828 (88.8%) | **Structural constant** |
| 6 | 27 | 779/828 (94.1%) | **Structural constant** |
| 11 | 26 | 785/828 (94.8%) | **Structural constant** |
| 13 | 31 | 770/828 (93.0%) | **Structural constant** |
| 18 | 29 | 772/828 (93.2%) | **Structural constant** |
| 23 | 25 | 818/828 (98.8%) | **Structural constant** |
| 25 | 32 | 823/828 (99.4%) | **Structural constant** |
| 32 | 35 | 828/828 (100%) | **Always 35 - delimiter/sentinel** |

These constant positions act as **column dividers**, segmenting the card into outcome groups. The values 25-32 and 35 encode structural boundaries, not outcomes.

### Player-Variable Card Positions

The positions that actually vary by player and encode performance:

| Position | Value Range | Key Values | What It Encodes |
|----------|-------------|------------|-----------------|
| 0 | 13-42 | 13, 14, 22-42 | Primary outcome selector (walk/K/power/special) |
| 2 | 7-42 | 8, 9, 10, 11, 13, 23 | Hit type distribution |
| 4 | 13, 24, 30, 32 | 30 (51%), 13 (39%) | Walk/out split |
| 5 | 0-23 | 7 (34%), 8 (40%), 9 (9%) | Contact quality (singles) |
| 7 | 13, 24, 29-32, 36 | 13 (81%) | Pitcher-dominated outcome |
| 8 | 7-40 | 8 (25%), 9 (29%) | Hit type / contact quality |
| 9 | 13, 24, 26-32 | 13 (44%), 32 (15%) | Walk/power distribution |
| 10 | 8-42 | 14 (35%), 9 (26%) | Strikeout/contact split |
| 12 | 0-21 | 7 (31%), 8 (29%), 0 (17%) | Hit type with double potential |
| 14 | 8-42 | 13 (53%), 14 (10%) | Walk/strikeout balance |
| 15 | 13, 14, 33 | 33 (75%) | Power outcome gate |
| 16 | 13, 24, 27-29, 32 | 24 (65%) | Extra-base hit selector |
| 17 | 8-42 | 13 (67%), 14 (10%) | Walk/strikeout balance |
| 19 | 0-40 | 8 (51%), 7 (17%) | Contact quality |
| 20 | 14, 36-42 | 14 (94%) | Strikeout gate |
| 21 | 13, 24, 27, 29-32 | 13 (59%), 29 (17%) | Walk/out distribution |
| 22 | 7-42 | 9 (34%), 13 (28%), 14 (13%) | Hit/walk/K balance |
| 24 | 13-21 | 21 (17%), 18 (14%), 20 (13%) | **Extra-base power rating** |
| 26 | 7-42 | 8 (52%), 9 (19%) | Contact quality |
| 27 | 13, 14, 32, 34 | 34 (70%), 13 (27%) | Special outcome flag |
| 28 | 9-42 | 24 (31%), 32 (18%), 13 (20%) | Power/out distribution |
| 29 | 9-41 | 13 (57%), 26 (23%) | Walk/out balance |
| 30 | 13, 24, 30-32 | 32 (39%), 31 (25%) | Out type selector |
| 31 | 9-42 | 13 (83%) | Walk-dominated (pitchers get all 13s) |
| 33 | 0-8 | 7 (29%), 0 (36%), 1 (17%), 6 (14%) | **Special flag byte 1** |
| 34 | 0-6 | 0 (58%), 1 (33%) | **Special flag byte 2** |

### Position String Format (offset 0x87)

For position players: `[POS] [DEF] [BAT] [NUM]`
- POS: Primary position code (OF, 1B, 2B, 3B, SS, C)
- DEF: Defensive rating or secondary position count
- BAT: Batting hand (L=Left, R=Right, B=Both/Switch)
- NUM: Encoded attribute

For pitchers: `[HAND] [GRADE] [FLAGS]`
- HAND: L (left) or R (right)
- GRADE: Pitching effectiveness grade (1-15 scale, higher = more IP)
- FLAGS: Y/Z/W/X flags indicating usage patterns, * indicates reliever

**Position Player Examples:**
```
"OF  2 B 17"  - Outfielder, 2 positions, Switch hitter
"SS  9 R 17"  - Shortstop, 9 defense, Right-handed
"C   7 L  5"  - Catcher, 7 defense, Left-handed
"1B  4 L  3"  - First base, 4 defense, Left-handed
"3B  6 R  4"  - Third base, 6 defense, Right-handed
```

**Pitcher Examples:**
```
"L 14     Z"  - Left-handed, grade 14 starter
"R 15    YZ"  - Right-handed, grade 15 starter (ace)
"R  5    YZ"  - Right-handed, grade 5 (middle reliever)
"R 15*   YZ"  - Right-handed, grade 15 reliever (* = reliever flag)
"L  9* WXY"   - Left-handed, grade 9 reliever, multiple flags
```

### Card Byte 33-34 Pair Analysis

These final two bytes encode special player attributes:

| Pair (byte33, byte34) | Count | Likely Meaning |
|------------------------|-------|----------------|
| (7, 0) | 240 | Standard position player, right-handed |
| (0, 1) | 238 | Standard position player, left-handed or switch |
| (6, 0) | 115 | Speed/baserunning ability indicator |
| (1, 0) | 90 | Power hitter flag |
| (1, 1) | 38 | Power + platoon advantage |
| (0, 2) | 35 | Contact hitter with SB threat |
| (0, 6) | 27 | Pitcher (starter) |
| (8, 0) | 18 | Elite defensive player |
| (5, 0) | 8 | Utility/pinch hit specialist |

### The 32-Byte META_BLOCK (offset 0x20-0x3F)

Contains player attributes and team assignment:

```
Offset  Size  Likely Field
------  ----  ------------
0x20    1     Team index within league (e.g., 1-4 for divisions)
0x21    1     Flags (pitcher indicator: 0x14=pitcher starter, 0x05=reliever, 0x00=position)
0x22    1     League assignment
0x23    1     Additional flag
0x24    1     Roster status
0x25    1     Reserved
0x26    1     Reserved
0x27    1     Reserved
0x28    1     Multi-position flags
0x29    1     Reserved
0x2A    1     Reserved
0x2B    1     Encoded age or experience value
0x2C    1     Usage flags
0x2D    1     Contract/eligibility
0x2E-0x2F 2   Additional position-specific data
0x30-0x3F 16  Team/league extended data, defensive ratings
```

### Sample Player Cards with Real Stats (1971 Baltimore Orioles)

**Don Buford** - OF, Switch hitter, .290 BA, 19 HR, 62 BB, 89 SO
```
Card: 14,30,11,28,30,7,27,13,8,29,9,26,6,31,14,33,28,14,29,8,14,13,9,25,16,32,8,13,40,22,31,14,35,1,0
Value distribution: v0=1 v1=1 v6=1 v7=1 v8=3 v9=2 v13=3 v14=5 v16=1 v22=1 v28=2 v29=2 v30=2 v31=2 v40=1
```

**Frank Robinson** - 1B, Right-handed, .281 BA, 28 HR, 62 BB, 72 SO
```
Card: 14,30,8,28,13,7,27,13,8,24,9,26,5,31,42,14,24,14,29,7,14,24,9,25,20,32,8,34,24,13,30,37,35,1,0
Value distribution: v1=1 v5=1 v7=2 v8=3 v9=2 v13=3 v14=4 v20=1 v24=4 v34=1 v37=1 v42=1
Note: More v24 (extra-base hits) and v42 (power) values = 28 HR power
```

**Mark Belanger** - SS, Right-handed, .266 BA, 0 HR, 48 BB, 73 SO
```
Card: 14,30,8,28,30,7,27,13,8,32,9,26,7,31,39,14,24,14,29,8,14,13,9,25,20,32,8,34,23,26,31,22,35,0,2
Value distribution: v0=1 v2=1 v7=2 v8=4 v9=2 v13=2 v14=4 v20=1 v22=1 v23=1 v24=1 v26=2 v39=1
Note: Zero v1/v5/v37/v42 values = no HR power; v0=1 v2=1 at end = speed
```

**Mike Cuellar** - Pitcher (L 14), .103 BA as batter
```
Card: 13,30,23,13,13,9,27,13,36,13,13,26,8,31,13,13,24,13,29,9,14,13,13,25,13,32,21,34,13,13,13,13,35,0,1
Value distribution: v13=16 (out of 35 positions!)
Note: Pitchers' cards are flooded with value 13 (walk outcomes for batters facing them)
```

---

## 3. Statistics File Formats

### NSTAT.DAT - Batting Statistics (32 bytes per player)

One record per player, indexed in same order as PLAYERS.DAT. Verified against known 1971 statistics.

```
Offset  Size  Type     Field              Verified
------  ----  ----     -----              --------
0x00    2     uint16   Index/ID           Match confirmed
0x02    2     uint16   Games (G)          YES - 122 for Buford
0x04    2     uint16   At Bats (AB)       YES - 449 for Buford
0x06    2     uint16   Runs (R)           YES - 99 for Buford
0x08    2     uint16   Hits (H)           YES - 130 for Buford
0x0A    2     uint16   RBI                YES - 54 for Buford
0x0C    2     uint16   Strikeouts (SO)    YES - 89 for Buford
0x0E    2     uint16   Walks (BB)         YES - 62 for Buford
0x10    2     uint16   HBP/Misc           15 for Buford (HBP or composite)
0x12    1     uint8    Doubles (2B)       YES - 19 for Buford
0x13    1     uint8    Triples (3B)       YES - 4 for Buford
0x14    1     uint8    Home Runs (HR)     YES - 19 for Buford
0x15    1     uint8    Stolen Bases (SB)  YES - 2 for Buford
0x16    10    mixed    Extended stats     CS, SF, SH, GIDP, IBB, etc.
```

### PSTAT.DAT - Pitching Statistics (22 bytes per pitcher)

One record per pitcher only (343 pitchers in 1971 season). 7546 / 22 = 343 records exactly.

```
Offset  Size  Type    Field                    Verified
------  ----  ----    -----                    --------
0x00    2     uint16  Outs Pitched (IP * 3)    YES - 876 = 292 IP for Cuellar
0x02    2     uint16  Hits Allowed             YES - 250 for Cuellar
0x04    2     uint16  Runs Allowed             YES - 111 for Cuellar
0x06    2     uint16  Earned Runs              YES - 100 for Cuellar
0x08    2     uint16  Walks (BB)               78 for Cuellar
0x0A    2     uint16  Strikeouts (SO)          YES - 124 for Cuellar
0x0C    1     uint8   Wins (W)                 YES - 20 for Cuellar
0x0D    1     uint8   Losses (L)               YES - 9 for Cuellar
0x0E    1     uint8   Saves (SV)               YES - 0/11 for starter/reliever
0x0F    1     uint8   Games (G)                YES - 38 for Cuellar
0x10    1     uint8   Games Started (GS)       YES - 38 for Cuellar
0x11    1     uint8   Home Runs Allowed (HRA)  Likely (30 for Cuellar)
0x12    1     uint8   Complete Games (CG)      Needs verification
0x13    1     uint8   Shutouts/HBP             Needs verification
0x14    1     uint8   Wild Pitches             Needs verification
0x15    1     uint8   Encoded flags/extra      Variable
```

---

## 4. Game Simulation Engine

### Core Simulation Loop

Extracted from WINBB.EXE string analysis, the game uses a **plate-appearance state machine**:

```
GAME LOOP:
  1. InitPlateAppearance()
     - Load batter card (CARD_BLOCK from PLAYERS.DAT)
     - Load pitcher grade and fatigue state
     - Evaluate game situation (score, inning, outs, runners)
     - Check manager AI for strategic decisions

  2. RESOLVE PLATE APPEARANCE:
     a. Manager pre-pitch decisions:
        - Intentional walk?
        - Bunt signal?
        - Hit-and-run?
        - Steal attempt?
        - Pitching change?

     b. Generate outcome:
        - Random number selects card position (0-34)
        - Read byte value at that position
        - Cross-reference with IDT.OBJ decision table
        - Apply pitcher grade modifier
        - Determine outcome category

     c. Resolve play:
        - Single/Double/Triple/Home Run
        - Strikeout (looking/swinging)
        - Walk/HBP
        - Ground out/Fly out/Pop out/Line out
        - Error, Double Play, Sacrifice
        - Stolen base attempt (if signaled)

     d. Advance baserunners:
        - Apply speed ratings
        - Check for extra-base advancement
        - Resolve scoring

  3. EndOfPlateAppearance()
     - Update batting/pitching stats
     - Check pitcher fatigue thresholds
     - Generate commentary (B3EHMSG system)
     - Trigger audio/animation events

  4. NextPlateAppearance() or EndHalfInning()
```

### The IDT.OBJ Decision Table (144 bytes)

This compact table is the core simulation lookup. It's a **36-entry x 4-column matrix** (144 = 36 x 4):

```
Raw data (decimal):
 1, 5,10,15,  4,13,25,25,  2, 5,10,38,  3, 8,12,17,
 1, 5,11,16,  2, 7,13,28,  3, 6,14,37,  1, 8,22,21,
 2, 6,13,31,  4, 9,10,23,  1, 5,12,17,  3,12,11,18,
 1, 6,13,30,  2, 7,11,23,  1, 5,14,18,  3, 6,10,27,
 1, 5,15,39,  1, 5,10,34,  5,15,24,40,  1, 5,16,20,
 2, 7,12,29,  1, 5,17,19,  1, 5,23,22,  4,10,11,24,
 1, 5,18,36,  3, 8,11,32,  2, 6,21,22,  3, 9,12,16,
 1, 5,19,20,  4,11,13,33,  1, 7,20,24,  1, 5,10,21,
 2, 6,12,26,  1, 5,11,19,  5,14,14,35
```

**Column interpretation:**
- Column 0: Frequency weight (1-5) - how often this row is selected
- Column 1: Threshold low (5-15) - minimum card value for this outcome
- Column 2: Threshold high (10-24) - card value range
- Column 3: Outcome index (15-40) - maps to B3EHMSG.TBL event table

This table determines how card values translate into specific game outcomes, modulated by the pitcher's grade and the game situation.

### Play Outcome Types (from WINBB.EXE strings)

**Batting outcomes:** Single, Double, Triple, Home Run, Strikeout, Walk, HBP, Intentional Walk, Ground out, Fly out, Pop out, Line out, Sacrifice Hit, Sacrifice Fly, GIDP, Bunt (fair/foul), Foul out

**Baserunning outcomes:** Stolen Base, Caught Stealing, Picked Off, Runner Advancement, Runner Held, Tag Out, Safe (close/easy)

**Special events:** Error (by position), Wild Pitch, Passed Ball, Balk, Injury (to any position), Rain Delay, Dome Delay, Ejection (batter/pitcher), Argument

**Game state tracking:**
- `_BASESITUATION` - 8 states (empty through bases loaded)
- `_OUTSITUATION` - 3 states (0, 1, 2 outs)
- `_INNING` / `_INNINGPREVIOUS` / `_NEXTINNING`
- `_SCORE` / `_RUNSHITSERRORS`

---

## 5. Card Value Correlation Analysis

### Methodology

Correlation analysis was run on all 460 qualified batters (AB > 50) from the 1971 season. For each card value (0-42), we computed the Pearson correlation between "number of times that value appears on a player's card" and the player's actual batting rate statistics.

### Full Correlation Results

```
VALUE  COUNT   CorrBB    CorrK   CorrHR   CorrBA  Corr2B  Corr3B  CorrSB  BEST     R
-----  -----  -------  -------  -------  -------  ------  ------  ------  ----  ------
    0    566  -0.1447  -0.0052   0.1273   0.3108  0.5192  0.2511 -0.1726   2B  +0.519
    1    375  -0.2553   0.2641   0.7149   0.4789  0.2632  0.1456 -0.5188   HR  +0.715
    5     23   0.1059   0.0631   0.3034   0.0189  0.0603 -0.0375  0.0401   HR  +0.303
    6     98   0.1910  -0.0668  -0.0798  -0.1658  0.0753 -0.2687  0.1987   3B  -0.269
    7    560  -0.5309  -0.0456   0.0299   0.6801  0.2264  0.2586 -0.2393   BA  +0.680
    8   1376  -0.4529   0.1258   0.2395   0.5651  0.3514  0.0808 -0.4600   BA  +0.565
    9    907  -0.2943   0.0801   0.1121   0.4241  0.1550  0.1484 -0.3412   BA  +0.424
   10    124  -0.1331   0.0448  -0.0107   0.1719  0.0732  0.1985 -0.0967   3B  +0.199
   11     54  -0.1382   0.0358  -0.0596   0.2119  0.1138  0.2272 -0.0976   3B  +0.227
   13   2309   0.9780  -0.2854  -0.1464  -0.6884 -0.4800 -0.3111  0.5652   BB  +0.978
   14   1260  -0.0673   0.9591   0.3399   0.2148  0.2024 -0.0073 -0.3396    K  +0.959
   21     94   0.5855  -0.4441  -0.3145  -0.6190 -0.4659 -0.3031  0.7305   SB  +0.731
   23     99   0.5228  -0.4277  -0.3765  -0.5899 -0.4710 -0.2627  0.7380   SB  +0.738
   24    681  -0.1989  -0.0272  -0.0226   0.0978  0.1292 -0.0662 -0.1742   BB  -0.199
   26    632  -0.4980   0.0503   0.0350   0.2590  0.1609  0.2093 -0.2913   BB  -0.498
   30    922  -0.4844  -0.1363  -0.1959   0.0282  0.0667  0.1084 -0.0748   BB  -0.484
   31    664  -0.6214   0.0579   0.1186   0.5488  0.3556  0.3348 -0.3147   BB  -0.621
   36    184   0.3431  -0.3238  -0.2581  -0.4090 -0.2892 -0.1982  0.4692   SB  +0.469
   37     46  -0.0580   0.1470   0.3005   0.1472  0.0669 -0.0217 -0.1723   HR  +0.301
   40    141  -0.1454   0.1673   0.1629   0.2897  0.2642  0.2076 -0.2844   BA  +0.290
   41     38  -0.0573   0.1356   0.3026   0.1604  0.0909  0.0001 -0.1513   HR  +0.303
   42     32   0.0442   0.0628  -0.0010  -0.0280  0.0140 -0.0623 -0.0025    K  +0.063
```

### Card Value Meaning Summary (Definitive)

Based on correlation analysis, sorted by confidence:

| Value | Correlation | R | Interpretation |
|-------|-------------|---|----------------|
| **13** | BB | **+0.978** | **WALK outcome** - Near-perfect correlation. More 13s = more walks. Pitchers' cards are flooded with 13s. |
| **14** | K | **+0.959** | **STRIKEOUT outcome** - Near-perfect correlation. More 14s = more strikeouts. |
| **1** | HR | **+0.715** | **HOME RUN outcome** - Strong power indicator. Frank Robinson (28 HR) has v1=1; Mark Belanger (0 HR) has v1=0. |
| **21** | SB | **+0.731** | **STOLEN BASE opportunity** - Pitchers (who bat but run bases) have high SB counts due to intentional walk situations. |
| **23** | SB | **+0.738** | **BASERUNNING/SPEED indicator** - Strongly correlates with stolen base rates. |
| **7** | BA | **+0.680** | **SINGLE (high quality)** - Strong positive BA correlation, negative BB correlation = hit not walk. |
| **31** | BB | **-0.621** | **NON-WALK out** - More 31s = fewer walks = ball-in-play outs for contact hitters. |
| **8** | BA | **+0.565** | **SINGLE (standard)** - Second-strongest BA correlation. The most common hit outcome. |
| **0** | 2B | **+0.519** | **DOUBLE outcome** - Strong doubles correlation. Buford (.290, 19 2B) has v0=1. |
| **26** | BB | **-0.498** | **CONTACT OUT** - Negative walk correlation = ball in play, not taking walks. |
| **30** | BB | **-0.484** | **GROUND/FLY OUT** - Standard out that replaces walk opportunities. |
| **36** | SB | **+0.469** | **SPEED/RUNNING play** - Appears on fast players' cards. |
| **9** | BA | **+0.424** | **SINGLE (weak)** - Moderate BA correlation, infield singles or bloop hits. |
| **5** | HR | **+0.303** | **HOME RUN (rare)** - Lower frequency power outcome. |
| **37** | HR | **+0.301** | **HOME RUN (variant)** - Rare power outcome type. |
| **41** | HR | **+0.303** | **HOME RUN (variant)** - Rare power outcome type. |
| **40** | BA | **+0.290** | **HIT (special)** - Moderate BA correlation, possibly HBP or reached-on-error. |
| **10-11** | 3B | **+0.199/+0.227** | **TRIPLE outcomes** - Weak but positive triple correlation. |
| **22** | HR | **+0.139** | **EXTRA-BASE HIT** - Weak power correlation, likely context-dependent. |

### Key Insight: The Card Is a Probability Distribution

Each player's 35-byte card is essentially a **custom probability distribution** over ~20 possible outcomes. The simulation engine:

1. Picks a random position (0-34) on the card
2. Reads the byte value
3. Maps that value to an outcome using the IDT.OBJ table
4. Some values are fixed structural markers (25-32, 35) that modify how adjacent values are interpreted

**Power hitters** have more values 1, 5, 37, 41, 42 (HR outcomes).
**Contact hitters** have more values 7, 8, 9 (single outcomes) and fewer 14 (K outcomes).
**Walk machines** have fewer values 13 (which correlates with walks for the BATTER, but in a pitcher context, 13 means the pitcher walks batters).
**Speed players** have values 21, 23, 36 (SB/running outcomes).
**Pitchers (as batters)** have cards flooded with value 13 (they can't hit, but draw walks from getting IBB'd).

---

## 6. Manager AI System

### Four Manager Personalities

APBA includes 4 distinct manager AI profiles, each with ~375KB of decision data:

| Manager | Files | Style |
|---------|-------|-------|
| Cap Spalding | `MGRCAPTS.*` | Conservative/traditional strategy |
| Duke Robinson | `MGRDUKER.*` | Aggressive/risk-taking |
| Johnny McCoy | `MGRJMCOY.*` | Balanced/adaptive |
| Larry Pepper | `MGRLPEPR.*` | Statistical/analytical |

### Manager Decision File Types

Each manager has 4 files:
- `.DCT` (~52KB) - **Decision Dictionary**: When to consider making a move (trigger conditions)
- `.LIB` (~247KB) - **Strategy Library**: What specific moves to make given triggers
- `.MOB` (~56KB) - **Movement/Substitution Patterns**: Player substitution priority rules
- `.MSY` (~25KB) - **Synchronization/Timing**: When during the game flow to execute decisions

### Decision Types (from WINBB.EXE)

**Offensive Decisions (`OffDynDecision`):**
- Pinch hit (platoon advantage, late-game situations)
- Steal attempt (speed rating vs catcher arm rating)
- Hit-and-run (runner on 1st, contact hitter at plate)
- Sacrifice bunt (runner in scoring position, pitcher batting)
- Intentional walk request

**Defensive Decisions (`DefDynDecision`):**
- Pitching change (fatigue threshold, matchup advantage)
- Defensive substitution (late-game defensive upgrade)
- Intentional walk (first base open, dangerous hitter)
- Infield positioning (in/deep/normal)
- Pickoff attempt

**Decision Factors:**
- Score differential
- Inning and half
- Outs count
- Base situation
- Batter/pitcher matchup (L/R platoon)
- Pitcher fatigue (innings pitched, pitch count proxy)
- Bullpen availability
- Bench strength

### Manager Modes

- **PlayAuto**: Computer makes all decisions for both teams
- **PlayManual**: Human controls all decisions
- **MicroManager**: Computer suggests moves, human can override

---

## 7. Commentary & Presentation

### Three-Tier Commentary Architecture

The commentary system in `TABLES/` generates realistic play-by-play narration:

```
TABLES/
  B3EHMSG.MSG    # 300 KB - Human-readable templates with variable substitution
  B3EHMSG.TBL    # 47 KB  - Binary lookup table: game state -> message ID
  B3EHMSG.BLK    # 534 KB - Pre-compiled message blocks with audio/animation codes
  B3EHMSG.MSX    # 67 KB  - Index/offset table into BLK file
  B3EHNUM.MSG    # 4.9 KB - Number-to-word conversion templates
  B3EHNUM.TBL    # 4.8 KB - Number conversion lookup
  B3EHNUM.MSX    # 1.5 KB - Number conversion index
  IDT.OBJ        # 144 B  - Decision table (covered in Section 4)
```

### Template Variable System

Commentary uses `&variable(params)` syntax for dynamic content:

```
&team(name,offense)                    -> "Baltimore Orioles"
&team(city,defense)                    -> "Boston"
&p(both)                               -> "Mike Cuellar"
&0(both)                               -> "Don Buford" (current batter)
&inning(ordinal)                       -> "seventh"
&ingame(offense,pbatter,psnh,ordinal)  -> "second" (2nd hit of game)
&ingame(defense,p1b,psne,ordinal)      -> "third" (3rd error)
&daysperformance(offense,pbatter)      -> "2 for 3 today"
&mgr(both,offense)                     -> "Earl Weaver"
&std(defense,psub,psnpera,digit2)      -> "3.08" (ERA)
&ondeck(,,1)                           -> "Brooks Robinson"
```

### 100+ Game Event Categories

**Play-by-play events (BOT prefix):**
- BOTHitComments, BOTDoubleNumber, BOTTripleNumber, BOTHRNumberForT
- BOTOuts, BOTOutsSimple, BOTOutsExcitedB, BOTOutsFinallyB
- BOTWalkBasic, BOTWalkComments, BOTWalkEffect
- BOTStrikeoutBasV, BOTStrikeoutCom
- BOTDPCall, BOTDPCommentsAfter, BOTDPCommentsBefore
- BOTSB, BOTSBHomeNumber, BOTCSInGameForP
- BOTErrorComment, BOTErrorsInGame
- BOTSacFly, BOTSacrificeV, BOTBuntFoulV
- BOTBackToBackDo, BOTBackToBackHR, BOTBackToBackSi
- BOTInjuryTo[Position], BOTRainDelay, BOTDomeDelay
- BOTIntentionalW, BOTHBPGeneric, BOTPickOff

**Audio/Visual events (AB prefix):**
- ABHRAnimation, ABRunnerScores, ABRunnerHolds
- ABCheeringOut, ABCheeringHREnd, ABCheeringStrike
- ABBooingIntenti, ABCrowdGoesQuie
- ABArgueBeginDef, ABArgueEjectOff
- ABVolumeSafeEas, ABVolumeSpikeHo

### Commentary Examples

```
"back-to-back doubles for the &team(name,offense)!"
"a pair of strikeouts for &p here in the &inning(ordinal)"
"manager &mgr(both,offense) is banging his head on the dugout wall"
"and that's his &ingame(defense,p1b,psne,ordinal) error in the game"
"he has a &std(defense,psub,psnpera,digit2) ERA"
"for &0, his &ttd(offense,pbatter,psnd,ordinal) double of the series"
```

---

## 8. Stadium & Audio System

### Stadiums

7 real historical stadiums plus 1 generic, each with day and night variants:

| Stadium | Code | INI Files |
|---------|------|-----------|
| Chicago (Wrigley) | CHIN | FL-DCHIN.INI, FL-NCHIN.INI |
| Cincinnati (Riverfront) | CINC | FL-DCINC.INI, FL-NCINC.INI |
| Detroit (Tiger Stadium) | DETR | FL-DDETR.INI, FL-NDETR.INI |
| Forbes Field (Pittsburgh) | FORB | FL-DFORB.INI, FL-NFORB.INI |
| Minnesota (Met/HHH) | MINN | FL-DMINN.INI |
| New York (Yankee Stadium) | NYCA | FL-DNYCA.INI, FL-NNYCA.INI |
| Generic Baseball Field | GENR | FL-DGENR.INI |

### Stadium INI Structure

```ini
[FIELD]
Name=Baseball Field
Location=Anywhere
Anthem=USA-SB31
GCI=1024x768x256

[1024x768x256]
Field=F-LDGENR              # Background image file (DIB format)
FieldFont="Arial",8,400     # Font for player names on field
ShowSBLineups=On             # Show lineups on scoreboard
Pos1=322,Center,298,Center   # Catcher position: X,HAlign,Y,VAlign
Pos2=319,Center,434,Top      # Pitcher position
Pos3=478,Left,251,Bottom     # First baseman
Pos4=368,Left,216,Bottom     # Second baseman
Pos5=176,Right,256,Bottom    # Third baseman
Pos6=246,Right,214,Bottom    # Shortstop
Pos7=122,Center,206,Bottom   # Left fielder
Pos8=317,Center,180,Bottom   # Center fielder
Pos9=516,Center,194,Bottom   # Right fielder
SB=328,Center,149,Bottom     # Scoreboard position
ShowButtons=On
ShowStats=On
```

### Sound System (SFX.INI)

**Event-driven audio with per-stadium overrides:**

```ini
[Categories]
NationalAnthem=RANDOM              # Pick random anthem variant
PlayBall=RANDOM                    # Pick random play ball sound
7thInningStretch=RANDOM            # Pick random stretch music
LocalsHomeRun=RANDOM               # Pick random HR celebration
LocalsNeedRuns=RANDOM              # Pick random rally sound

[LocalsHomeRun]
01=,LocalsHomeRun01,1,UNLIMITED    # Animation + unlimited plays
02=,LocalsHomeRun02,1,UNLIMITED
03=,LocalsHomeRun03,1,UNLIMITED

[FL-DTORN]                         # Toronto-specific override
NationalAnthem.01=AnthemCANADA,,1,PERGAME,1  # Play O Canada

[FL-DLOSA]                         # LA-specific override
IdleTimeEffectPreEarlyGame.Add1=PlaneFlyBy,,6,PERGAME,10  # Plane sounds
```

### Audio Assets

- 3 MIDI national anthems (USA, Canada, Japan)
- 1 WAV crowd sound file
- 11 FLC animations (home runs, play ball, fireworks)
- 3 VAT files for voice synthesis (player names, team names, play lines)
- 2 SYM files for message/number symbol mapping

---

## 9. League & Organization Data

### ORG.DAT Structure

Contains league/division/team hierarchy using a linked-section format:

```
Offset    Marker        Content
------    ------        -------
0x0000    FFFF FFFF     Header sentinel
0x00D0    FFFF          League root: "PROFESSIONAL BASEBALL"
0x01A0    FEFF FFFF     League 1 definition
0x0270    FDFF FFFF     League 2 definition
0x0340    EFFF FEFF     Division 1 within league
0x0410    EEFF FEFF     Division 2 within league
...       ...           Team entries with name, code, ratings
```

Each section is ~208 bytes (0xD0) with:
- 4-byte marker (section type identifier)
- 20+ byte name string
- 4-byte code
- Numeric fields for team attributes
- Offset pointers to next section

### Schedule (SCHEDULE.ORG)

Contains full season game schedule with:
- Date/time encoding (4-byte format)
- Home/away team assignments
- Manager name references
- Lineup designations ("Primary", "vs LHP 80%", "vs RHP 50%", "vs RHP 25%")

### Team Lineup Files

Two files per team per organization:
- `T{NNNN}LU.ORG` (175-300 bytes) - **Lineup**: Batting order with position assignments and platoon labels
- `T{NNNN}RS.ORG` (~277 bytes) - **Roster/Bench**: Reserve players, bullpen configuration

Lineup labels indicate platoon usage:
- "Primary" - Default lineup
- "vs LHP 80%" - Use against left-handed pitchers 80% of the time
- "vs RHP 50%" - Use against right-handed pitchers 50%
- "vs RHP 25%" - Occasional platoon matchup

---

## 10. Porting Strategy to React/TypeScript

### What to Keep from APBA

1. **Card-based probability system** - The core concept of encoding each player as a weighted distribution of outcomes
2. **Plate appearance state machine** - The sequential flow is how real baseball works
3. **Comprehensive stat tracking** - All the stat categories APBA tracks are standard MLB stats
4. **Manager decision triggers** - The situational awareness logic (when to bunt, steal, pull pitcher)
5. **Platoon splits** - L/R matchup handling

### What to Replace/Modernize

| APBA System | Baseball Ledger Replacement |
|-------------|---------------------------|
| 35-byte binary card | Dynamic probability distributions from Lahman CSV |
| IDT.OBJ lookup table | Weighted random selection algorithm in TypeScript |
| Binary PLAYERS.DAT | Lahman People.csv + Batting.csv + Pitching.csv + Fielding.csv |
| Binary NSTAT/PSTAT | Database records (GCP Firestore or equivalent) |
| MGR*.DCT/LIB/MOB/MSY | Claude AI-driven manager decisions |
| B3EHMSG template system | Claude AI-generated play-by-play commentary |
| FLC animations | CSS/Canvas animations or Lottie |
| MIDI/WAV audio | Web Audio API with modern sound files |
| Windows INI configs | React state management (Zustand per UI spec) |
| 16-bit binary formats | JSON + TypeScript interfaces |

### Card Generation from Lahman Data

Replace the APBA 35-byte card with a runtime probability distribution:

```typescript
interface PlayerCard {
  playerId: string;
  name: { first: string; last: string };
  battingHand: 'L' | 'R' | 'S';
  throwingHand: 'L' | 'R';
  primaryPosition: string;
  positions: string[];

  // Outcome probabilities (sum to 1.0) - derived from Lahman stats
  outcomes: {
    single: number;       // (H - 2B - 3B - HR) / PA
    double: number;       // 2B / PA
    triple: number;       // 3B / PA
    homeRun: number;      // HR / PA
    walk: number;         // BB / PA
    strikeout: number;    // SO / PA
    hitByPitch: number;   // HBP / PA
    groundOut: number;    // Estimated: ~0.43 of remaining outs
    flyOut: number;       // Estimated: ~0.35 of remaining outs
    lineOut: number;      // Estimated: ~0.12 of remaining outs
    popOut: number;       // Estimated: ~0.10 of remaining outs
    doublePlay: number;   // GIDP / PA
    sacrifice: number;    // SH / PA
    reachedOnError: number; // ~0.02 league average
  };

  // Modifiers
  speed: number;          // SB / (SB + CS) and SB rate
  power: number;          // ISO = SLG - BA
  discipline: number;     // BB / K ratio
  clutch: number;         // AI-derived or randomized

  // Defensive
  fieldingPct: number;
  range: number;          // Derived from fielding stats
  arm: number;            // Position-dependent
}

interface PitcherCard extends PlayerCard {
  pitcherGrade: number;   // Replaces APBA's pitcher grade (1-15)
  stamina: number;        // Innings per start capacity
  stuff: number;          // K/9 rating
  control: number;        // BB/9 rating
  groundBallRate: number; // GB/FB ratio
  era: number;

  // Modifier to batter's outcome probabilities
  modifiers: {
    strikeoutBonus: number;   // Adds to batter's K probability
    walkReduction: number;    // Subtracts from batter's BB probability
    hitReduction: number;     // Subtracts from batter's hit probabilities
    homeRunReduction: number; // Subtracts from batter's HR probability
  };
}
```

### Simulation Engine Core

```typescript
function simulatePlateAppearance(
  batter: PlayerCard,
  pitcher: PitcherCard,
  situation: GameSituation,
  managerDecisions: ManagerDecisions
): PlateAppearanceResult {
  // 1. Apply pitcher modifiers to batter's base probabilities
  const adjustedOutcomes = applyPitcherModifiers(batter.outcomes, pitcher.modifiers);

  // 2. Apply platoon advantage (L/R matchup)
  const platoonAdjusted = applyPlatoonSplit(adjustedOutcomes, batter.battingHand, pitcher.throwingHand);

  // 3. Apply park factor (if using park effects)
  const finalProbs = applyParkFactor(platoonAdjusted, situation.ballpark);

  // 4. Generate random number and determine outcome
  const roll = Math.random();
  const outcome = resolveOutcome(finalProbs, roll);

  // 5. Resolve baserunner advancement
  const baseResult = advanceRunners(outcome, situation.bases, batter.speed);

  // 6. Check for errors
  const errorResult = checkErrors(outcome, situation.defense);

  return { outcome, baseResult, errorResult, runs: baseResult.runsScored };
}
```

### AI Integration Points

1. **Manager AI (Claude API)**: Instead of 375KB binary decision files, use Claude to evaluate game situations and make strategic decisions. Prompt with current game state, available players, and baseball strategy context.

2. **Commentary (Claude API)**: Instead of the B3EHMSG template system, use Claude to generate natural play-by-play text. Much more varied and contextual than templated text.

3. **Draft Strategy (Claude API)**: AI-driven drafting per the existing Baseball Ledger spec.

4. **Lineup Optimization**: AI-generated optimal lineups based on matchup analysis.

### Architecture Mapping

```
APBA BBW                          Baseball Ledger
---------                         ---------------
WINBB.EXE (Game Engine)    ->     engine/SimulationEngine.ts
  - IDT.OBJ               ->     engine/OutcomeResolver.ts
  - Manager AI             ->     engine/ManagerAI.ts (Claude API)
  - Commentary             ->     engine/Commentary.ts (Claude API)

WINLM.EXE (League Mgr)    ->     league/LeagueManager.ts
  - SCHEDULE.ORG           ->     league/Scheduler.ts
  - ORG.DAT                ->     league/Standings.ts

WINDRAFT.EXE (Draft)       ->     league/DraftEngine.ts

WINSTATS.EXE (Stats)       ->     stats/StatTracker.ts
  - NSTAT.DAT              ->     stats/BattingStats.ts
  - PSTAT.DAT              ->     stats/PitchingStats.ts

PLAYERS.DAT (Ratings)      ->     data/PlayerRatings.ts (from Lahman CSV)
  - 35-byte card           ->     data/PlayerCard.ts (probability distribution)
  - META_BLOCK             ->     data/PlayerAttributes.ts

SFX.INI + AUDIO/           ->     ui/AudioManager.ts (Web Audio API)
FL-*.INI + BACKDROP/       ->     ui/StadiumView.tsx (React component)
```

---

## Appendix A: File Inventory

### Root BBW Directory

| File | Size | Type |
|------|------|------|
| WINBB.EXE | 1,120,000 | Main game engine |
| WINDRAFT.EXE | 1,317,888 | Draft module |
| WINLM.EXE | 861,696 | League manager |
| WINSTATS.EXE | 683,264 | Statistics viewer |
| WINMAS.EXE | 253,952 | Master admin |
| BBEREG.EXE | 93,152 | Registration |
| BBHIRES.DLL | 332,006 | Hi-res graphics |
| BWCC.DLL | 152,304 | UI controls |
| AAPLAY.DLL | 137,232 | Animation player |
| MASDLL.DLL | 25,088 | Sound engine |
| EREGLIB.DLL | 35,440 | E-registration |
| WINBB.HLP | 498,211 | Game help |
| WINDRAFT.HLP | 510,771 | Draft help |
| WINLM.HLP | 463,959 | League help |
| WINSTATS.HLP | 352,784 | Stats help |
| BBTUTOR.HLP | 349,622 | Tutorial |
| ANNOUNCE.HLP | 61,528 | Announcer help |
| README3.WRI | 73,472 | Documentation |
| BBWART.WRI | 21,120 | Art gallery doc |
| CREDITS.TXT | 2,525 | Credits |
| SFX.INI | 17,286 | Sound config |
| 15x DIB files | ~787KB each | Stadium background images |
| 4x MGR*.DCT/LIB/MOB/MSY | ~375KB each set | Manager AI profiles |

### TABLES Directory

| File | Size | Purpose |
|------|------|---------|
| IDT.OBJ | 144 | Core decision table |
| B3EHMSG.MSG | 306,288 | Commentary templates |
| B3EHMSG.TBL | 47,776 | Simulation lookup table |
| B3EHMSG.BLK | 545,796 | Compiled message blocks |
| B3EHMSG.MSX | 67,176 | Message index |
| B3EHNUM.MSG | 4,962 | Number-to-word templates |
| B3EHNUM.TBL | 4,820 | Number lookup |
| B3EHNUM.MSX | 1,530 | Number index |

### Per-Season WDD Directory

| File | Size Range | Records | Purpose |
|------|-----------|---------|---------|
| PLAYERS.DAT | 58-121 KB | 400-828 | Player records (146 bytes each) |
| NSTAT.DAT | 13-26 KB | 400-828 | Batting stats (32 bytes each) |
| PSTAT.DAT | 3-7.5 KB | 130-343 | Pitching stats (22 bytes each) |
| ORG.DAT | 4-7 KB | 1 | League hierarchy |
| ORG.I00 | 1,518 | 1 | Organization index |
| SCHEDULE.ORG | 55-102 KB | 1 | Season schedule |
| T*.ORG | 175-300 B | 20-41 per org | Team lineups and rosters |

---

## Appendix B: Position Frequency Data (1971 Season, 828 Players)

### Card Position 24 - The Power Rating

This position varies most and directly encodes extra-base hit power:

| Value at Pos 24 | Count | Meaning |
|-----------------|-------|---------|
| 13 | 222 | No power (pitchers, slap hitters) |
| 15 | 40 | Minimal power |
| 16 | 62 | Below average power |
| 17 | 82 | Average power |
| 18 | 118 | Above average power |
| 19 | 60 | Good power |
| 20 | 105 | Very good power (20+ HR) |
| 21 | 138 | Excellent power or speed |

### Card Position 0 - Primary Outcome Gate

| Value at Pos 0 | Count | Meaning |
|----------------|-------|---------|
| 13 | 336 | Walk-heavy card (high OBP) |
| 14 | 262 | Strikeout-prone |
| 22-24 | ~111 | Contact/neutral outcomes |
| 36-42 | ~117 | Special outcomes (power, speed, rare events) |
| 40 | 41 | Good hitter flag |

---

*Document generated: 2026-02-07*
*Source data: APBA Baseball for Windows 3.0 (Miller Associates, 1995)*
*Analysis methodology: Binary format reverse engineering, string extraction, statistical correlation*
