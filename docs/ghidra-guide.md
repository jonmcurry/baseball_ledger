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

## Critical Architecture Notes

### Why BJStartGradeAdj Has 0 Cross-References
The BJ/Pankin strings are entries in a **Borland C++ property persistence table**.
The code does NOT reference individual strings by address. Instead:

1. A property table starts at **seg36:0x9E02** (44+ entries with `FF FF 00 00` separators)
2. Code iterates the table sequentially (walking entry by entry)
3. Each entry's string is compared against a target key using string comparison
4. When a match is found, the corresponding value is read from/written to **MA_BB.INI**

This means searching for XREFs to individual strings like "BJStartGradeAdj" will
always show 0 results. Use the alternative search strategies below.

### Segment Map
| Segment | File Offset | Size | Type | Key Contents |
|---------|-------------|------|------|-------------|
| Seg 4 | 0x01BB00 | 16KB | CODE | MA_BB.INI read/write |
| Seg 11 | 0x03E700 | 16KB | CODE | Grade clamping (CMP 1, CMP 15) |
| Seg 12 | 0x043A00 | 38KB | CODE | Card value processing, pitcher symbols |
| Seg 20 | 0x07E400 | 16KB | CODE | IDT table loading |
| Seg 30 | 0x0D2700 | 15KB | CODE | Property table read/write |
| Seg 36 | 0x0ED900 | 48KB | DATA | All strings, property table, player fields |

### Key Data Offsets (all in Segment 36)
| Offset | Contents |
|--------|----------|
| 0x31C3 | "Grade" field label |
| 0x3256 | "Type" field label (batting characteristic) |
| 0x325B | "Platoon" field label |
| 0x67BE | "NextPlateAppearance" debug string |
| 0x67D2 | "InitPlateAppearance" debug string |
| 0x6810 | "BeginPlay" debug string |
| 0x744F | "IDT" filename string |
| 0x7453 | ".OBJ" extension string |
| 0x7458 | "IDT Read" log string |
| 0x9E02 | Property table start ("RunMaximized" is first entry) |
| 0xA08C | "PankinHand" property |
| 0xA0AE | "PankinBatting" property |
| 0xA0C0 | "PankinSlugging" property |
| 0xA0E6 | "BJStartGradeAdj" property |
| 0xA0FA | "BJReliefGradeAdj" property |
| 0xA3BF | "MA_BB.INI" filename string |

## Target 1: Grade Adjustment Formulas

### Strategy: Follow MA_BB.INI References
The "BJStartGradeAdj" value is persisted to MA_BB.INI. Find where it is
computed by tracing through the INI reading code.

1. **Search for "MA_BB.INI"** in Ghidra (Search > For Strings)
   - Located at seg36:0xA3BF
   - Has **67 code cross-references** (mostly in segment 4)
   - Right-click > References > Find References -- this WILL show results
2. Follow references in **segment 4** (the INI read/write code)
3. Look for code that also references "BJStartGradeAdj" or "BJReliefGradeAdj"
   (the property table iteration code nearby)
4. Trace what VALUES are written -- these are the grade adjustments

### Strategy: Find Grade Clamping Code
The grade adjustment result must be clamped to [1, 15]. Search for code that
compares against both 1 and 15:

1. Go to **seg11:0x24D7** (file offset 0x040BD7)
   - CMP AX, 1 at 0x24D7
   - CMP AX, 15 at 0x24E2
   - This is a switch/case dispatcher, may route to grade logic
2. Go to **seg12:0x62DF** (file offset 0x049CDF)
   - `MOV WORD [BP-06], 15` -- sets variable to grade maximum
   - Part of a larger function that checks card values and grade ranges

### Strategy: Property Table Code in Segment 30
1. Go to **seg30:0x1342** (file offset 0x0D3A42)
   - Code references the property table base at seg36:0x9E02
   - Pattern: PUSH table_ptr, PUSH default_value, MOV DI obj_ptr, CALL
   - This is the Borland property read/write framework
2. Go to **seg30:0x150E** (file offset 0x0D3C0E)
   - Second reference to property table, reads object fields and writes to INI

### What to Look For
- The formula that modifies pitcher grade. Could be:
  ```
  adjustedGrade = baseGrade + platoonAdjustment
  if (batterHand opposite pitcherHand) adjustedGrade -= platoonBonus
  clamp(adjustedGrade, 1, 15)
  ```
- Where the adjustment VALUE is computed (separate from where it is stored)
- The Pankin ratings (PankinBatting, PankinSlugging, PankinHand) are in the
  same property table, suggesting they influence the grade adjustment

## Target 2: Pitcher Symbol Effects

### FOUND: Card Value Remapping Code in Segment 12

**Go directly to seg12:0x86B0** (file offset 0x0CC0B0)

This code checks card values and remaps outcomes based on pitcher attributes:

```
seg12:0x86B0: CMP AL, 13     ; Is card value 13 (WALK)?
              JNZ +0x17       ; No -> skip
              LES DI,[BP+06]  ; Load game object pointer
              CMP BYTE ES:[DI+0x312], 01  ; Check pitcher flag at offset 0x312
              JNZ +6          ; If flag != 1...
              MOV [BP-03], 1  ;   result = 1  (walk preserved?)
              JMP +4
              MOV [BP-03], 8  ;   result = 8  (walk suppressed to out?)

seg12:0x86C8: CMP AL, 14     ; Is card value 14 (STRIKEOUT)?
              JNZ +0x17
              CMP BYTE ES:[DI+0x312], 01
              JNZ +6
              MOV [BP-03], 3  ;   result = 3  (K preserved?)
              JMP +4
              MOV [BP-03], 9  ;   result = 9  (K remapped?)

seg12:0x86E4: CMP AL, 15     ; Is card value 15?
              JNZ +0x15
              CMP BYTE ES:[DI+0x312], 01
              JNZ +6
              MOV [BP-03], 2  ;   result = 2
              JMP +4
              MOV [BP-03], 8  ;   result = 8
```

**Key observations:**
- Offset 0x312 in the game object is a **pitcher attribute flag** (1 or not-1)
- Card values 13 (walk), 14 (K), 15 are checked individually
- Each card value maps to TWO possible outcomes depending on the flag
- Result codes (1-9) feed into a lookup at `[DI+0x856B]`
- The final result is stored at game object offset 0x332

**To complete this analysis in Ghidra:**
1. Navigate to seg12:0x86B0
2. Scroll UP to find the function entry point (look for `PUSH BP; MOV BP,SP`)
3. Identify what the byte at object offset 0x312 represents
4. Map the result codes (1, 2, 3, 5, 7, 8, 9) to actual outcomes
5. Check if the code continues checking more card values (0-4, 5-12, 16+)
6. Also check the code at seg12:0x86A4 (preceding block): values 5 and 7

### Also Check: Larger Card Value Switch at seg12:0x625F
This area processes different card values with object field checks:
- `[DI+0x44]` tested against bit masks (0x04, 0x08, 0x0C)
- Comparisons with values 0x2F, 0x30, and grade range [15, 23]
- This may be another part of the PA resolution pipeline

## Target 3: IDT Usage Flow

### IDT Table Loading
1. **Go to seg20:0x2104** (file offset 0x080504)
   - References "IDT" string at seg36:0x744F
   - This is the IDT.OBJ file loading code
2. Also check **seg20:0x2178** (file offset 0x080578)
   - Another reference to "IDT" in what appears to be error handling

### IDT Lookup Function
From the IDT load location, trace WHERE the 144-byte buffer is stored.
Then find references to that storage location -- one will be the lookup function.

The lookup function should:
1. Select a random row from the 36 rows (weighted by column 0)
2. Compare the card value against thresholds in columns 1-2
3. If card value is in range, return the outcome from column 3
4. Retry up to 3 times, then fall back to direct mapping

## Target 4: Platoon + Type Interaction

### Field Label References
| Label | Seg36 Offset | Code References |
|-------|-------------|-----------------|
| "Type" | 0x3256 | seg27:0x3856 |
| "Platoon" | 0x325B | seg35:0x1F81 |
| "Grade" | 0x31C3 | seg33:0x0F70 |
| "PankinBatting" | 0xA0AE | seg35:0x04FF |
| "PankinSlugging" | 0xA0C0 | seg31:0x1638 |

### Approach
1. Go to **seg27:0x3856** -- code that references "Type" field
   - Pattern found: `BF 56 32 0E 57 BF 3C` = MOV DI, 0x3256; PUSH CS; PUSH DI
   - This pushes the "Type" string address as a function argument
2. Go to **seg35:0x1F81** -- code that references "Platoon" field
3. Trace the functions these lead to -- they read the player's Type/Platoon
   ratings and should eventually feed into the grade adjustment formula

### Expected Interaction
- Type (SA/PL/PR/PB) = batting characteristic that modifies HOW outcomes happen
- Platoon = numeric rating for handedness advantage/disadvantage
- These likely combine with pitcher grade to produce the effective grade

## Bonus: Byte Pattern at 0x0F4D8F

After "IDT Read" at 0x0F4D62, interesting byte patterns:
```
0F4D8F: 01 02 03 01 02 01 02 01  -- small sequence (1,2,3,1,2,1,2,1)
0F4D97: 00 00 00 01 00 00 00 01  -- boolean-like pattern
0F4DA7: 00 00 00 01 01 01 00 01  -- boolean-like pattern
0F4DB7: 01 00 00 01 02 57 00 A9  -- transitions to different data
```
This could be a configuration table for IDT column interpretation.

## Quick Reference: Ghidra Navigation

### Go to a specific segment:offset
1. In the Listing window: Navigation > Go To... (or press G)
2. Enter the address in format: `seg36::A0E6` or the file offset

### Search for strings
1. Search > For Strings > enter text > Search All

### Find cross-references
1. Click on an address or string in the Listing
2. Right-click > References > Show References to Address

### View decompiled C
1. Window > Decompile (if not already visible)
2. Click anywhere in a function to see its C representation

## Output Format

For each finding, document:
```
## [Function Name]
### Location: segment:offset in WINBB.EXE
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
