# Changelog

## 2026-02-07 - APBA Baseball for Windows 3.0 Reverse Engineering

### Added
- `docs/APBA_REVERSE_ENGINEERING.md` - Comprehensive reverse engineering analysis of APBA BBW 3.0
  - Complete binary file format specifications (PLAYERS.DAT, NSTAT.DAT, PSTAT.DAT, ORG.DAT)
  - Player card system analysis: 35-byte card encoding with outcome probability distributions
  - Statistical correlation analysis of card values vs real 1971 batting stats (460 qualified batters)
  - Game simulation engine architecture (plate appearance state machine, IDT.OBJ decision table)
  - Manager AI system documentation (4 personality profiles with decision dictionaries)
  - Commentary system architecture (3-tier template system with 100+ game events)
  - Stadium and audio system configuration
  - League organization data formats
  - Concrete porting strategy mapping APBA systems to React/TypeScript equivalents
  - TypeScript interface definitions for PlayerCard and PitcherCard
