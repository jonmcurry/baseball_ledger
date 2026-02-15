# Ghidra Disassembly Guide for WINBB.EXE

## Goal
Extract the 4 remaining unknowns from WINBB.EXE to achieve 100% faithful simulation.

## Setup

### Install Ghidra
1. Download from https://ghidra-sre.org/ (requires Java 17+)
2. Extract the archive
3. Run `ghidraRun.bat` (Windows) or `ghidraRun` (Mac/Linux)

### Import WINBB.EXE
1. File > New Project > Non-Shared Project
2. File > Import File > select `BBW/WINBB.EXE`
3. Ghidra auto-detects NE (New Executable) format
4. Accept default import options (Language: x86:LE:16:Real Mode)
5. Double-click the file to open the CodeBrowser
6. When prompted, click "Yes" to auto-analyze (takes 2-5 min)

## Target 1: Grade Adjustment Formulas

### Find BJStartGradeAdj
1. In CodeBrowser: Search > For Strings > search "BJStartGradeAdj"
2. Double-click the result (should be at ~0x0F79EA)
3. Right-click the string > References > Find References to this address
4. Follow the XREF to find the function that uses this string
5. The function likely reads the grade value, applies adjustments, and returns

### What to Look For
- The formula that modifies pitcher grade based on:
  - Batter's handedness (L/R/S) vs pitcher's handedness (L/R)
  - Batter's "Platoon" rating value
  - Batter's "Type" (batting characteristic: SA/PL/PR/PB)
- Example pseudocode we expect:
  ```
  effectiveGrade = baseGrade + platoonAdjustment
  if (batterHand opposite pitcherHand) effectiveGrade -= platoonBonus
  ```
- Document the exact formula with all constants

### Find BJReliefGradeAdj
Same process, search "BJReliefGradeAdj" (at ~0x0F79FE). May share logic
with BJStartGradeAdj but with different constants for relief pitchers.

## Target 2: Pitcher Symbol Effects

### Find Symbol Processing
1. Search for string "Symbol = " (at ~0x0F3908)
2. Follow XREFs to find where symbols are read from the position string
3. Look for conditional branches on character values ('K','X','Y','W','Z','G','H','L','M')

### Expected Symbol Logic (from APBA Master Game rules)
- **K**: Force strikeout on eligible card values
- **X**: Force strikeout on additional eligible values
- **Y**: Expansion of strikeout range (relief usage pattern)
- **W**: Force walk on specific card values
- **Z**: Nullify walk on specific card values (control pitcher)
- **G**: Convert home run to double (ground ball pitcher)
- **H**: Convert double to home run (fly ball pitcher)
- **L**: Long relief usage pattern
- **M**: Middle relief usage pattern
- **\***: Reliever flag (affects fatigue/usage, not outcomes)

### What to Document
For each symbol, document:
- Which card values / IDT outcomes it overrides
- The replacement outcome
- Whether it applies before or after IDT lookup
- Whether it stacks with other symbols

## Target 3: IDT Usage Flow

### Find IDT Loading
1. Search for string "IDT Read" (at ~0x0F4D58)
2. Follow XREFs to find the loading function
3. Trace where the loaded 144-byte buffer is stored (global variable)

### Find IDT Lookup
1. From the IDT storage location, find references to it
2. One of those references will be the lookup function (called during PA resolution)
3. Document the exact lookup algorithm:
   - How is the random row selected (weighted by column 0)?
   - How is the card value compared to thresholds (columns 1-2)?
   - How many attempts before fallback?
   - What happens when column 3 (outcome index) is used?

### Cross-Reference with InitPlateAppearance
1. Search for string "InitPlateAppearance" (at ~0x0F40D2)
2. Follow XREFs to find the PA resolution function
3. Trace the complete flow: card read -> grade check -> IDT lookup -> outcome

## Target 4: Platoon + Type Interaction

### Find Offense Rating Usage
1. Search for string "Platoon" near 0x0F0B5B
2. Follow XREFs to find where the Platoon rating is read
3. Search for "Type" near 0x0F0B56
4. Follow XREFs to find where Type is read
5. Both should converge in the grade adjustment or PA resolution function

### What to Document
- How the 4 batting characteristics (SA/PL/PR/PB) modify outcomes
- Whether they modify the effective grade or the card interpretation
- The exact Platoon adjustment values (vs LHP, vs RHP numbers from position string)

## Bonus: Byte Pattern at 0x0F4D8F

After "IDT Read", there's a small byte pattern:
```
01 02 03 01 02 01 02 01 00 00 00 01 00 00 00 01
00 00 00 01 01 01 01 01 00 00 00 01 01 01 00 01
01 00 00 01 01 00 00 01 02
```
This ~35 bytes could be a configuration table. Check if it's referenced by
the IDT lookup or PA resolution code. The values (0,1,2,3) suggest a small
category or flag mapping.

## Output Format

For each finding, document:
```
## [Function Name]
### Location: 0xOFFSET in WINBB.EXE
### Pseudocode:
function name(params) {
    // decompiled logic
}
### Constants:
- CONSTANT_NAME = value
### Notes:
- Any observations about behavior
```

Save findings to `docs/ghidra-findings.md` in the project.
