# WINBB.EXE Disassembly Plan

## Goal
Disassemble WINBB.EXE to extract the exact PA resolution algorithm, play result
boards, pitcher symbol effects, and all simulation logic. This is the only path
to 100% faithful reproduction of APBA Baseball for Windows 3.0.

## Target File
- **WINBB.EXE** - 1,120,000 bytes, 16-bit NE (New Executable), Borland C++
- Dated: June 12, 1995
- Format: Windows 3.x 16-bit protected mode

## Phase 1a: Programmatic Binary Analysis (automated)

### 1.1 String Extraction from WINBB.EXE
- [ ] Extract all readable strings (ASCII, min length 4)
- [ ] Categorize: simulation terms, outcome strings, function names, error messages
- [ ] Map outcome strings to memory offsets

### 1.2 B3EHMSG.TBL Analysis (47,776 bytes)
- [ ] Determine record structure (try common divisors: 2, 4, 8, 16, 32, 64)
- [ ] Check if it contains play result board data or just commentary indices
- [ ] Cross-reference with IDT.OBJ values and OutcomeCategory enum
- [ ] 47,776 / 4 = 11,944 entries (if 4-byte records)
- [ ] 47,776 / 8 = 5,972 entries (if 8-byte records)
- [ ] Check for situation x outcome x grade structure

### 1.3 IDT.OBJ Cross-Reference in WINBB.EXE
- [ ] Search for the 144-byte IDT.OBJ data pattern inside WINBB.EXE
- [ ] If found: it's compiled in; if not: loaded at runtime from file
- [ ] Search for "IDT.OBJ" filename string in EXE
- [ ] Look for file-loading code near the string reference

### 1.4 Play Result Board Search
- [ ] Search for repeated numeric patterns 1-41 near outcome strings
- [ ] Look for 8-10 situation blocks (base/out combinations)
- [ ] Look for grade-indexed columns (4 columns for A/B/C/D or 15 for 1-15)
- [ ] Check for fielding column data (3 columns per grade)

### 1.5 Manager AI File Structure
- [ ] Sample first 256 bytes of MGR*.DCT and MGR*.LIB
- [ ] Identify record structure and decision encoding

## Phase 1b: Ghidra Disassembly (manual)

### Prerequisites
1. Install Ghidra from https://ghidra-sre.org/ (requires Java 17+)
2. Create new project, import WINBB.EXE
3. Select "x86:LE:16:Real Mode" or let Ghidra auto-detect NE format
4. Run auto-analysis (default options, takes 2-5 minutes)

### Key Search Targets
1. **IDT reference**: Search strings for "IDT" -> find loading code -> trace to PA function
2. **PA resolution function**: Look for the function that:
   - Reads card position (array index 0-34)
   - Reads byte value from card
   - Calls IDT lookup
   - Applies grade modifier
   - Returns outcome
3. **Pitcher symbol effects**: Search for "STRIKEOUT", "WALK" override logic
4. **Play result boards**: Search for large lookup tables near outcome strings
5. **B3EHMSG.TBL loading**: How the 47KB table is loaded and used

### What to Document
For each discovered function/table:
- Offset in EXE
- Pseudocode or C equivalent
- Input parameters
- Output values
- Cross-references to other functions

## Phase 2: Implementation

Based on Phase 1 findings, implement exact BBW logic:
- [ ] Replace or augment IDT-based PA resolution with discovered algorithm
- [ ] Add pitcher symbol effects (K/X/Y/W/Z/G/H/L/M)
- [ ] Add situation-dependent modifiers (if found)
- [ ] Add platoon grade adjustment formula (if found)
- [ ] Add exact runner advance tables (if found)
- [ ] Update tests to validate against known BBW outputs

## Known Facts (Starting Points)
- IDT.OBJ is 144 bytes = 36 rows x 4 columns
- Cards are 35 bytes at offset 0x40 in PLAYERS.DAT (146 bytes/record)
- Position string at offset 0x87 (11 bytes) encodes grade + symbols
- B3EHMSG.TBL outcome index maps to OutcomeCategory (15-40 range)
- Pitcher grades are 1-15 scale
- EXE is 16-bit NE format (Borland C++ for Windows 3.x)
