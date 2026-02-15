# System Requirements Document (SRD)  
**Project:** Reverse Engineering APBA Baseball for Windows v3.0 Installation Files  
**Version:** 1.0  
**Date:** 2025  
**Objective:** Extract and understand the data formats and logic used in APBA Baseball for Windows v3.0 to recreate the core simulation engine in a modern web-based application (JavaScript/TypeScript).

## 1. Project Goal

Create a precise digital replica of the APBA Baseball for Windows v3.0 simulation mechanics by reverse-engineering the original installation files from the CD.  
The end goal is to extract:

- Player card data structures (batter & pitcher attributes, including the 36 play-result numbers)
- Play result board lookup tables (the core outcome charts)
- Any supporting game logic tables (platoon adjustments, symbol effects, runner advance rules, etc.)

This will allow faithful recreation of plate appearance resolution without relying on approximations or external card generators.

## 2. Known Characteristics of APBA Baseball for Windows v3.0

- Released in the late 1990s / early 2000s
- 16-bit or early 32-bit Windows application (runs on Windows 3.1/95/98/ME/2000/XP compatibility mode)
- Core simulation is a direct port of the APBA Master Game board game rules
- Uses **36 equally likely outcomes** (simulated dice roll: 11–66)
- Each batter has **36 play-result numbers** (0–41 range, many cards have primary + secondary column)
- Pitchers have **letter or numeric grade** + **symbols** (K, X, Y, W, Z, G, H, L, M, etc.)
- Play result boards vary by **base/out situation** (≈8–10 situations)
- Outcomes modified by **effective pitcher grade**, **fielding column**, **pitcher symbols**, **platoon/pull adjustments**

## 3. Expected File Types in the Installation

Typical files found on APBA Baseball for Windows CDs/installations:

- **Executables**  
  - BASEBALL.EXE, BBALL.EXE, APBA.EXE, GAME.EXE, SIM.EXE (main program — most likely contains play result boards)

- **Data files**  
  - *.DAT (player cards, teams, seasons, parks)  
  - *.ROS (roster files)  
  - *.FRN (franchise/organization files)  
  - *.C (commissioner files)  
  - *.BKP (backup files)  
  - *.MDB (older versions sometimes used Microsoft Access databases)

- **Resource / configuration**  
  - *.DLL (possible resource overlays or data modules)  
  - *.INI or *.CFG (settings)

## 4. Reverse Engineering Targets

### 4.1 Priority 1 – Play Result Boards
- Goal: Reconstruct the lookup tables that map:
  - Situation (bases + outs)
  - Play result number (N: 1–41)
  - Effective pitcher grade
  - Fielding column (1/2/3)
  → Outcome (hit type/location, out type, walk, strikeout, error, etc.) + runner advance rules

- Expected location: Hard-coded inside the main .EXE or in a separate large .DAT file  
- Search techniques:
  - String search for outcome phrases:  
    "SINGLE", "DOUBLE", "TRIPLE", "HOME RUN", "STRIKEOUT", "WALK", "GROUND OUT", "FLY OUT", "LINE OUT", "ERROR", "FOUL OUT", "POP OUT", "INFIELD FLY", "DP", "TP"
  - Look for repeated blocks with numbers 1–41 near these strings
  - Look for grade identifiers (A,B,C,D or 1–30)

### 4.2 Priority 2 – Player Card Data Format
- Each batter record likely contains:
  - Name / ID / team / position / hand / speed
  - 36 primary play-result numbers (1 byte or 2 bytes each)
  - Optional secondary column (36 numbers, often flagged by 0 or special value)
  - Batting Characteristic (SA, PL, PR, PB)
  - Platoon adjustments (two numbers: vs LHP, vs RHP)
  - Speed rating (F/S or numeric)

- Each pitcher record likely contains:
  - Name / ID / team / hand
  - Grade (byte: A=1, B=2, C=3, D=4 or numeric)
  - Symbols (bitfield or list of flags: K, X, Y, W, Z, G, H, L, M, etc.)

- Expected format:
  - Fixed-length records (common in 90s/2000s sports sims)
  - Or delimited / header-based structure

### 4.3 Priority 3 – Supporting Tables
- Platoon adjustment matrix
- Symbol effect rules (which results can be overridden to K, W, etc.)
- Runner advance tables (extra base chances by arm strength)
- Error chance formulas
- Fatigue / stamina rules

## 5. Recommended Reverse Engineering Workflow

1. **Inventory the CD/installation**
   - List all files and directories
   - Note file sizes (large files are likely data or executables)

2. **Extract readable strings**
   - Use `strings` (Linux/Mac) or Strings.exe (Windows Sysinternals) on .EXE and large .DAT files
   - Look for clusters of baseball terms, especially outcome phrases

3. **Identify the main executable**
   - Open the largest .EXE in a hex editor (HxD, 010 Editor, etc.)
   - Search for outcome strings → note offsets
   - Look for repeated numeric patterns (01 02 03 ... 41)

4. **Locate player data files**
   - Open .DAT / .ROS / .MDB files
   - Look for player names (ASCII) + nearby binary data
   - Estimate record size by looking for repeating patterns every N bytes

5. **Document findings**
   - Create tables showing:
     - Offset / location
     - Format (byte, word, string)
     - Sample values
     - Inferred meaning

6. **Build parsers**
   - Write Python / Node.js scripts to:
     - Dump all player cards from roster files
     - Extract and pretty-print play result boards
     - Validate by comparing known players to real APBA cards

## 6. Tools Recommended

- Hex editors: HxD, 010 Editor, ImHex
- Strings extraction: Sysinternals Strings, binwalk, `strings` command
- Disassemblers (advanced): Ghidra, IDA Free
- Database viewers: MDB Viewer, Microsoft Access (for .MDB files)
- Programming: Python (struct, binascii), Node.js (Buffer), TypeScript

## 7. Deliverables Expected from Implementation

- Python/Node script to parse roster .DAT files → output JSON of all players/cards
- Structured representation of play result boards (JSON, TS objects, or markdown tables)
- Sample lookup function that takes (situation, N, grade, symbols) → returns outcome string
- Documentation of discovered file formats (record layouts, field offsets, types)

## 8. Success Criteria

- Can extract and read the 36 play-result numbers for any player in a sample season file
- Can reconstruct at least one full play result board section (e.g., bases empty, 0 outs)
- Can simulate a plate appearance using extracted data and match known APBA behavior

End of SRD