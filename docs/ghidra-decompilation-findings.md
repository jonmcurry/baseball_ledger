# WINBB.EXE Ghidra Decompilation Findings

## Method
Ghidra 12.0.3 headless decompilation with JDK 21, NE format, x86:LE:16:Protected Mode.
Auto-analysis found 4,583 functions across 36 code segments. 13 targeted simulation
functions decompiled to C pseudocode. Full output saved in `BBW/ghidra_decompiled.txt`.

## Segment Map (Key Segments)

| Segment | Selector | Size | Contents |
|---------|----------|------|----------|
| Code12 | 1058 | 38,055 bytes | PA resolution, IDT lookup, pitcher symbols |
| Code21 | 10a0 | 41,634 bytes | Card value resolution, player management |
| Code20 | 1098 | 15,783 bytes | Bytecode interpreter, play scripts |
| Code34 | 1108 | 13,648 bytes | Math utilities (clamp, random range) |
| Code35 | 1110 | 8,573 bytes | Borland runtime (FUN_1110_039d = state accessor) |
| Data36 | 1118 | 52,666 bytes | All game data tables, strings, IDT data |

## Critical Function Identification

### FUN_1058_5f49 - PA Resolution (IDT Lookup) [1,643 bytes]
The MAIN plate appearance resolution function. This is where all PA outcomes are determined.

### FUN_1058_8583 - Pitcher Symbol Processing [530 bytes]
Handles pitcher-specific symbol outcomes (grades, K symbols, walk symbols).

### FUN_1058_5be1 - Grade Setup (PRE-PA) [658 bytes]
**THE grade adjustment function.** Applies all modifiers to the pitcher's base grade
before the PA is resolved. This answers the BJStartGradeAdj question.

### FUN_10a0_3c17 - Card Value Resolution [1,628 bytes]
Maps card position values to fielding plays and outcomes. 34-case switch statement.

### FUN_1058_6ae7 - Run Expectancy / Scoring [678 bytes]
Calculates scoring probability based on game state.

### FUN_1058_6db5 - Hit/Out Resolution [1,926 bytes]
Post-PA: updates stats, advances runners, handles earned runs.

---

## 1. PA Resolution Flow (FUN_1058_5f49)

### Pseudocode
```
function resolvePlateAppearance(gameState):
    // Initialize outcome fields to "no result"
    gameState.rawCardValue = -1      // offset 0x331
    gameState.intermediateResult = -1 // offset 0x333
    gameState.finalOutcome = -1      // offset 0x332
    gameState.scriptPtr = null       // offset 0x3d8/0x3da

    playType = gameState.playType    // offset 0x312

    // Special play types bypass normal PA
    if playType == 3:  // steal attempt
        return resolveSteal(gameState)
    if playType == 4:  // hit-and-run
        return resolveHitAndRun(gameState)
    if playType not in [0, 1, 2]:
        return  // invalid

    // --- MAIN PA LOOP ---
    isRetry = false
    do:
        if not isRetry:
            // FIRST PASS: Normal card draw
            selectBatter(gameState)
            for cardPos = 1 to 36:   // 0x24 = 36 positions
                pass  // advance through card
            adjustForHandedness()
            getFielderLineup(gameState)
            cardValue = readCardValue(gameState, batterIdx, 0)

            // Check for special grade override (DAT_1118_bd30/bd32)
            if gradeOverrideActive and random(2) == 0:
                // Use pre-computed outcome
                cardValue = directLookup()
            else:
                cardValue = fullResolution()

            // Check if card value is valid (< 36)
            if cardValue < 0x24:  // 36
                // Normal range check needed
                if gradeOverrideActive2 and random(2) == 0:
                    rawOutcome = directLookup()
                else:
                    rawOutcome = fullResolution()
            else:
                rawOutcome = 13  // 0x0D = default for out-of-range
        else:
            // RETRY PASS: After IDT or symbol resolution
            setRandomSeed(36)  // 0x24
            selectBatter(gameState)
            rawOutcome = lookup()

        // --- OUTCOME CLASSIFICATION ---
        if rawOutcome < 0 or rawOutcome > 12:
            if rawOutcome == '#':  // 0x23 = 35
                // Skip (handled separately)
            elif rawOutcome >= 15 and rawOutcome <= 23:  // 0x0F to 0x17
                // *** IDT LOOKUP PATH ***
                resolveViaIDT(gameState, rawOutcome)
            elif rawOutcome >= 36 and rawOutcome < 42:  // 0x24 to 0x29
                // Symbol position: random(10) table lookup
                setRandomSeed(10)
                rawOutcome = lookupSymbolTable()
        elif rawOutcome in [7, 8, 11] and not isRetry:
            // Card values 7, 8, 11: pitcher grade check
            pitcherIdx = gameState.pitcherTeam     // 0x2cc
            setFielder(gameState, 1, pitcherIdx)
            pitcherData = getPlayerData(gameState, 0, pitcherIdx)

            // Grade resolution
            gradeResult = resolveGrade()
            cardValueFromPitcher = getFromPitcherCard()

            // Check fielding/archetype outcomes
            if cardValueFromPitcher < 1 or cardValueFromPitcher > 42:  // 0x2A
                // Special archetype symbols
                if cardValueFromPitcher == '+':   // 43
                    if (archetypeFlags & 0x03) != 0: rawOutcome = 1  // hit
                elif cardValueFromPitcher == ',':  // 44
                    if (archetypeFlags & 0x01) != 0: rawOutcome = 1
                elif cardValueFromPitcher == '-':  // 45
                    if (archetypeFlags & 0x02) != 0: rawOutcome = 1
                elif cardValueFromPitcher == '.':  // 46
                    if (archetypeFlags & 0x0C) != 0: rawOutcome = 6  // out
                elif cardValueFromPitcher == '/':  // 47
                    if (archetypeFlags & 0x08) != 0: rawOutcome = 6
                elif cardValueFromPitcher == '0':  // 48
                    if (archetypeFlags & 0x04) != 0: rawOutcome = 6
            else:
                rawOutcome = directMapping()

        isRetry = true
    while rawOutcome == 0  // retry if no outcome

    // --- STORE RESULTS ---
    gameState.rawCardValue = rawOutcome        // 0x331
    combineGradeAndValue()
    gameState.finalOutcome = mapToPlay()       // 0x332

    // Umpire decision check
    resultCode = getResultCode()
    if resultCode != 0 and resultCode < 10:
        umpireResult = checkUmpireDecision(gameState,
            UMPIRE_TABLE[resultCode])  // s_Umpire_s_Decision + 0x11
        if umpireResult != 0:
            gameState.finalOutcome = 2  // force specific outcome
```

### IDT Lookup Detail (within FUN_1058_5f49)
```
function resolveViaIDT(gameState, cardValue):
    // cardValue is in range [15, 23] (0x0F to 0x17)

    // Step 1: Check bitmap to see if this card value's IDT row is active
    iVar9 = 0x102  // offset modifier for bitmap
    bitMask = getBitMask()  // FUN_1110_196c
    bitmapEntry = DATA[cardValue * 2 + iVar9 + 0x382A]

    if (bitmapEntry & bitMask) != 0:
        return  // IDT row inactive for this card value, keep original

    // Step 2: Accumulate total frequency weight across IDT rows
    totalWeight = 0
    for row = 15 to 23:  // 0x0F to 0x17
        bitMask = getBitMask()
        if (DATA[row * 2 + 0x102 + 0x382A] & bitMask) == 0:
            // Row active: add its frequency weight
            totalWeight += DATA[row + 0x382B]  // SIGNED char addition

    // Step 3: Generate random number in [0, totalWeight)
    randomValue = random(totalWeight)

    // Step 4: Walk through rows again to find matching outcome
    cumulative = 0
    for row = 15 to 23:
        bitMask = getBitMask()
        if (DATA[row * 2 + 0x102 + 0x382A] & bitMask) == 0:
            cumulative += DATA[row + 0x382B]
            if randomValue < cumulative:
                cardValue = getOutcomeForRow(row)
                break

    return cardValue
```

Key data addresses for IDT:
- **0x382A**: Bitmap table (24 bytes) - determines which IDT rows are active
- **0x382B**: Frequency weight table - weight for each IDT row
- **0x0102**: Offset modifier (bitmap base within game object at ES:[DI+0x382A])

---

## 2. Grade Adjustment (FUN_1058_5be1)

This is the **critical missing piece** - the BJStartGradeAdj formula.

### Pseudocode
```
function setupGradeForPA(gameState):
    pitcherIdx = gameState.pitcherTeam        // offset 0x2cc
    pitcherData = getPlayerData(gameState, 0, pitcherIdx)

    // Store base appearance data
    pitcherData.appearance = getFreshValue()    // offset 0x42

    // Event broadcast
    broadcastEvent(gameState, 1, 0, pitcherIdx, 0x536)

    pitcherStats = getPlayerStats(gameState, 0, pitcherIdx)

    // --- ADJUSTMENT 1: Fatigue ---
    // Check if pitcher is fatigued (innings pitched check)
    if isPitcherFatigued(pitcherStats) or pitcherStats.gamesFinished != 0:
        // grade = clamp(grade + (currentGrade - startingGrade), 1, max)
        grade = clamp(pitcherData.grade + (pitcherData.grade - pitcherData.startGrade))
        // FUN_1108_12d8 is clamp(value, minBound)
        pitcherData.grade = grade

    // --- ADJUSTMENT 2: Relief Pitcher Penalty ---
    if gameState.isReliefSituation != 0       // offset 0x314
       AND gameState.pitcherType != 7:         // offset 0x311 (7 = closer?)
        // Subtract 2 from grade, clamp to minimum 1
        pitcherData.grade = clamp(pitcherData.grade - 2, 1)

    // --- ADJUSTMENT 3: Fresh Pitcher Bonus ---
    // Get pitcher's seasonal stats array
    seasonIdx = getSeasonIndex()
    seasonData = getSeasonArray(gameState.pitchingData, gameState.inningHalf - 1)

    if pitcherData.isFresh != 0:               // offset 0x49
        if gameState.pitcherType != 0           // offset 0x311
           OR gameState.fatigueAdj != 0         // offset 0x2eb
           OR seasonData.fatigueFlag != 0:
            // Fresh pitcher gets +5 bonus, clamped to max 20
            pitcherData.grade = clamp(pitcherData.grade + 5, 20)

    // --- ADJUSTMENT 4: Platoon Matchup ---
    batterData = getPlayerInfo(gameState, batterIdx)
    pitcherInfo = getPlayerInfo(gameState, pitcherIdx)

    if pitcherInfo.throwHand == batterData.batHand:  // offset 0x2A == 0x38
        // Same-hand matchup: apply platoon adjustment from table
        // platoonAdj = batterData.platoonValue   // offset 0x3B
        // grade = clamp(grade + platoonAdj, max=30)
        pitcherData.grade = clamp(pitcherData.grade + batterData.platoonAdj, 30)

    // --- ADJUSTMENT 5: Random Variance ---
    // random(40) to get index into adjustment table
    randomIdx = random(40)  // FUN_1110_1e5f(0x28)
    tableAdj = DATA[randomIdx + 0x3802]  // adjustment table at seg36:0x3802
    // grade = clamp(grade + tableAdj, 1, max)
    pitcherData.grade = clamp(pitcherData.grade + tableAdj, 1)
```

### Grade Adjustment Summary Table
| # | Adjustment | Condition | Formula | Range |
|---|-----------|-----------|---------|-------|
| 1 | Base copy | Always | data[0x42] = base grade | - |
| 2 | Fatigue | Pitcher is tired | grade = max(data[0x43] - data[0x47], 1) | [1, max] |
| 3 | Relief penalty | Relief + not closer (type 7) | grade = max(grade - 2, 1) | [1, max] |
| 4 | Fresh bonus | Fresh + (type!=0 OR adj!=0 OR flag) | grade = min(grade + 5, 20) | [1, 20] |
| 5 | Platoon | Same handedness (0x2A == 0x38) | grade = min(grade + platoon[0x3B], 30) | [1, 30] |
| 6 | Random variance | Always | grade = clamp(grade + DATA[0x3802+rand(40)], 1, 30) | [1, 30] |

---

## 3. Pitcher Symbol Processing (FUN_1058_8583)

### Pseudocode
```
function processPitcherSymbol(gameState):
    // Check if card value is a symbol position (36-41)
    if gameState.rawCardValue < 36 or gameState.rawCardValue > 41:
        // Not a symbol - do random(10) table lookup
        setRandomSeed(10)
        gameState.rawCardValue = lookupSymbolTable()

    // Grade check (uses global flags at 1118:bd30, 1118:bd34)
    if gradeOverrideDisabled or gradeCheckFails:
        // Full grade resolution path
        r1 = getRandomValue()
        setRandomSeed(36)  // 0x24
        r2 = combineValues(r1)
        r3 = lookupGradeTable(r2)
        applyGradeComparison(r3, r2, r1)
        gameState.intermediateResult = getResult()  // offset 0x333
    else:
        // Simplified path (grade override active)
        gameState.intermediateResult = getDirectResult()

    // Map intermediate to final outcome
    combineResults()
    postResolution = FUN_1058_7813(gameState, intermediateValue)
    gameState.finalOutcome = getResult()  // offset 0x332

    // Build play script
    buildPlayScript(gameState)
```

---

## 4. Card Value Resolution (FUN_10a0_3c17)

This is a massive 34-case switch that maps card position values to fielding outcomes.

### Card Value to Play Mapping
| Card Value | Action | Description |
|-----------|--------|-------------|
| 0 (0x00) | FUN_10a0_4e2d(obj, 8, fielder) | Double play? (fielding play 8) |
| 1 (0x01) | FUN_10a0_4e2d(obj, 7, fielder) | Home run candidate (play 7) |
| 2 (0x02) | FUN_10a0_4e2d(obj, 6, fielder) | Extra-base hit (play 6) |
| 3 (0x03) | FUN_10a0_4e2d(obj, 5, fielder) | Triple? (play 5) |
| 4 (0x04) | FUN_10a0_4e2d(obj, 4, fielder) | Double? (play 4) |
| 5 (0x05) | FUN_10a0_4e2d(obj, 3, fielder) | Single+ (play 3) |
| 6 (0x06) | FUN_10a0_4e2d(obj, 2, fielder) | Single (play 2) |
| 7 (0x07) | FUN_10a0_4e2d(obj, 1, fielder) | Ground out? (play 1) |
| 8 (0x08) | Pitcher matchup check (0x2cb) | Pitcher vs specific fielder |
| 9 (0x09) | Fielder check (same team) | Similar to 8 |
| 10 (0x0A) | Fielder check (same team) | Similar to 8, 9 |
| 11 (0x0B) | Fielder check (same team) | Similar to 8-10 |
| 12-20 | FUN_10a0_4dba(obj, pos, fielder) | Fielding plays at positions 1-9 |
| 21 (0x15) | FUN_10a0_4dba(obj, 10, fielder) | Position 10 play |
| 22 (0x16) | Random outcome | Pure random |
| 23 (0x17) | Steal check (0x3d0, 0x3d2) | Stolen base attempt |
| 24 (0x18) | Power check (steal-like) | Same direction as 25 |
| 25 (0x19) | Power check: rating 0x11-0x13 | Runner speed vs fielder |
| 26 (0x1A) | Power check: reverse direction | Opposite of 25 |
| 27 (0x1B) | FUN_10a0_4e2d(obj, 9, fielder) | Fielding play 9 |
| 28-33 | result = -1 (no play) | Reserved/unused positions |

---

## 5. Key Game Object Field Map

All accessed via ES:[DI+offset] (16-bit far pointer to game state).

| Offset | Size | Field Name | Description |
|--------|------|-----------|-------------|
| 0x044 | 2 | archetypeFlags | Bit flags: &1=speed, &2=power, &4=contact, &8=defense |
| 0x18D | 1 | gamePhase | 0=pre-game, 1=in-progress |
| 0x199 | 2 | inningCount | Current inning counter |
| 0x2CA | 1 | inningHalf | 1=top, 2=bottom (0-indexed for arrays) |
| 0x2CB | 1 | batterTeam | Team index of current batter (1 or 2) |
| 0x2CC | 1 | pitcherTeam | Team index of current pitcher |
| 0x2CD-0x2CF | 3x6 | runnerPositions | Runner data per base (3 bytes each, 6 slots) |
| 0x2EB | 1 | fatigueAdj | Fatigue adjustment flag |
| 0x2EC | 1 | gradeStart | Starting grade for current pitcher |
| 0x2ED | 1 | gradeMinimum | Minimum grade allowed |
| 0x2EE | 1 | powerRating | Power rating (0x11-0x13 range checked) |
| 0x301 | 1 | atBatActive | 1 during active at-bat |
| 0x305 | 1 | extraInnings | Extra innings flag |
| 0x306 | 1 | blowoutFlag | Set when score diff > 7 |
| 0x30A | 1 | errorCount | Accumulated errors |
| 0x30C | 1 | earnedRuns | Earned runs counter |
| 0x311 | 1 | pitcherType | Pitcher type (7=closer?) |
| 0x312 | 1 | playType | 0/1/2=normal PA, 3=steal, 4=hit-run |
| 0x314 | 1 | isReliefSituation | Relief pitcher in game |
| 0x315 | 1 | managerFlag | Manager strategy flag |
| 0x318 | 1 | pitcherOfRecord | Who gets W/L |
| 0x331 | 1 | rawCardValue | Card value from resolution |
| 0x332 | 1 | finalOutcome | Final play outcome code |
| 0x333 | 1 | intermediateResult | Intermediate (grade check result) |
| 0x335 | 1 | hitType | 0=no hit, 1-4=single/double/triple/HR |
| 0x340-0x341 | 2 | outsRecorded | Outs in current inning |
| 0x343 | 1 | atBatCount | At-bats in game |
| 0x346 | 1 | hitRecorded | Whether a hit was recorded |
| 0x349 | 1 | errorOnPlay | Error occurred on play |
| 0x34B | 1 | paStarted | PA officially started |
| 0x34C | 1 | symbolProcessed | Symbol already processed |
| 0x34D | 1 | isNotStrikeout | True if not a K result |
| 0x34E-0x350 | 2x2 | teamScores | Score per team (indexed) |
| 0x355-0x357 | 3x? | eventLog | Play-by-play event entries |
| 0x3D0 | 2 | stealAttemptData | Stolen base attempt info |
| 0x3D8 | 4 | scriptPtr | Pointer to play script bytecode |
| 0x3DC | 4 | scriptEnd | End of play script |

---

## 6. Key Data Tables in Segment 36 (1118:xxxx)

| Address | Size | Description |
|---------|------|-------------|
| 0x37D2 | 10 bytes | Random(10) symbol lookup: [36,36,37,38,39,39,40,40,40,41] |
| 0x37FE | varies | Grade comparison table |
| 0x3802 | 40+ bytes | Random variance adjustment table (indexed by random(40)) |
| 0x382A | 24 bytes | IDT bitmap table (which rows are active per card value) |
| 0x382B | 9+ bytes | IDT frequency weight table |
| 0x3842 | varies | Fielding play lookup table |
| 0x6738 | varies | Pitcher rating bitmap |
| 0x6BA6 | string | "Umpire's Decision" + umpire decision lookup table (+0x11) |
| 0x7490 | varies | Play script validation table |
| 0x9E02 | ~500 bytes | Borland property persistence table (44 entries) |
| 0xA0EA | string | "BJStartGradeAdj" |
| 0xA3BF | string | "MA_BB.INI" |
| 0xBD30 | 1 byte | Grade override flag 1 |
| 0xBD32 | 1 byte | Grade override threshold 1 |
| 0xBD34 | 1 byte | Grade override flag 2 |
| 0xBED8 | varies | Team color table (palette entries) |

---

## 7. Utility Function Reference

| Function | Purpose |
|----------|---------|
| FUN_1110_039d | Borland runtime: game state accessor/dispatcher (polymorphic) |
| FUN_1110_1e5f | Set random seed / generate random(N) |
| FUN_1110_196c | Borland Pascal SET bitmask: `1 << (index & 7)` (DECOMPILED) |
| FUN_1108_12d8 | clamp(value, bound) - clamp to minimum |
| FUN_1108_12a8 | clamp(value, max) - clamp to maximum |
| FUN_10a0_3932 | Get player game data (fielding card/stats) |
| FUN_10a0_39d0 | Get player season stats |
| FUN_10a0_38a1 | Get player info record (bios, handedness, etc.) |
| FUN_10a0_4dba | Set fielder at position for play |
| FUN_10a0_4e2d | Resolve fielding play outcome |
| FUN_10a0_36b4 | Broadcast game event (for play-by-play) |
| FUN_1098_2971 | Resolve special play (steal=3, hit-run=4) |
| FUN_1098_3932 | Execute play script bytecode |
| FUN_1098_2a06 | Combine grade results |
| FUN_1098_2ab1 | Post-grade combination |
| FUN_1098_2b33 | Threshold comparison (for umpire decisions) |
| FUN_1098_2c9b | Grade comparison (pitcher vs batter) |
| FUN_1098_2d2e | Intermediate result mapping |
| FUN_1098_2db8 | Build play script from outcome |
| FUN_1058_7726 | Umpire decision check |
| FUN_1058_7813 | Post-resolution outcome mapping |
| FUN_10c8_3881 | Check pitcher qualifying stats |
| FUN_10c8_3ac9 | Check pitcher fatigue flag |

---

## 8. Implementation Status

### Confirmed and Implemented:
1. Card value 0-42 mapping to outcomes
2. IDT table structure with active range [15, 23]
3. IDT bitmap gating (confirmed by FUN_1110_196c decompilation)
4. IDT frequency weights extracted from WINBB.EXE DATA[0x383A-0x3842]
5. 6-layer grade adjustment (Ghidra FUN_1058_5be1):
   - Layer 1-2: Base + Fatigue
   - Layer 3: Relief penalty (-2, closers exempt)
   - Layer 4: Fresh bonus (+5, cap 20)
   - Layer 5: Platoon (same-hand, cap 30)
   - Layer 6: Random variance (DATA[0x3802], final range [1, 30])
6. Random variance table (40 entries, extracted from DATA segment)
7. Archetype flags at offset 0x44 affect symbol outcomes
8. Umpire decision post-check (probabilistic approximation)

### Known Approximations (Unclosable Without More Ghidra Work):
1. **Umpire decision**: BBW's FUN_1058_7726 is DETERMINISTIC based on player
   record offsets 0x2f, 0x33, 0x35. Without PLAYERS.DAT field map, we use
   3% probabilistic approximation matching observed aggregate rates.
2. **Fatigue accumulation**: BBW's data[0x47] mechanism confirmed by full
   byte-scan of all 35 code segments:
   - Zeroed at game start (1068:3da0, 10a0:1e6e)
   - Incremented by 1 per event (INC at 1058:2cb4)
   - Conditionally adjusted +1/+2 based on pitcher type at data[0x2cb]
     (10a0:9bab/9bcf)
   - Capped at 30 (PUSH 0x1E for min() at 10a0:9b93)
   - Grade = max(data[0x43] - data[0x47], 1)
   Our per-inning linear decay approximates this per-event counter.
   The exact trigger conditions require decompiling the full parent
   function at 1058:~2940 (not in our 13-function set).
3. **Fresh bonus 3rd condition**: BBW checks 3 OR conditions; we check 2.
   The third involves a season data lookup we cannot decode.
4. **Baserunning**: Not in 13 decompiled functions. Speed-check heuristic.
5. **Manager AI** (pinch-hit, H&R, IBB): Requires additional FUN decompilation.
6. **DP execution details**: Complex fielding logic, uniform DP success model.
7. **Earned run reconstruction**: FUN_1058_6db5 is 1,926 bytes; conservative ER budget.
