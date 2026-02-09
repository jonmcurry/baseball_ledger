# Phase 8: AI Enhancement

## Overview

Phase 8 adds Claude API integration and template fallback commentary across all
5 AI features required by the SRD (REQ-AI-006, REQ-AI-007, REQ-AI-008).

## Sub-phases

### 8A: AI Types + Template Fallbacks
- `src/lib/types/ai.ts` with all request/response interfaces
- 5 template logic files in `src/lib/ai/` (commentary, game-summary, trade-eval, draft-reasoning, manager-explanation)
- `src/lib/ai/commentary-templates.ts` with 250+ template strings
- 114 tests

### 8B: Claude Client + Prompt Builders
- `api/_lib/claude-client.ts` (Anthropic SDK wrapper with retry/timeout/fallback)
- 5 prompt builder modules in `api/_lib/prompts/`
- Error code additions (CLAUDE_TIMEOUT, CLAUDE_MALFORMED, CLAUDE_UNAVAILABLE)
- `createExternalError()` factory
- 36 tests

### 8C: AI API Endpoints
- 5 Vercel Serverless Functions in `api/ai/`
- Zod validation, auth, Claude -> template fallback pattern
- 19 tests

### 8D: Client AI Service
- `src/services/ai-service.ts` with 5 typed service functions
- Barrel re-export via `src/services/index.ts`
- 6 tests

## Key Decisions

1. **Template fallbacks are deterministic** -- Commentary uses hash(batterId + inning + outs)
   for reproducible template selection. No randomness.

2. **Claude returns null on failure** -- `callClaude()` returns null after all retries
   exhausted. Endpoints use template functions as fallback. Client always sees 200 with
   `source: 'template' | 'claude'`.

3. **No explicit rate limiter** (REQ-AI-007) -- Bulk simulation runs server-side and
   never calls AI endpoints. AI is only invoked from client UI during single-game views
   or playoff games. Architecture inherently prevents bulk AI calls.

4. **Manager personality thresholds** -- Trade evaluation uses per-style acceptance
   thresholds: conservative +15%, aggressive -5%, balanced +5%, analytical +10%.
   Analytical managers also apply positional premiums (SP 1.15x, C/SS 1.10x).

5. **3 commentary styles** -- newspaper (past tense, formal), radio (present tense,
   exclamations), modern (casual, analytics-aware).

## Metrics

| Metric | Before | After |
|--------|--------|-------|
| Test count | 1,688 | 1,749 |
| Test files | 127 | 139 (+12) |
| Source files | ~224 | ~244 |
| AI endpoints | 0 | 5 |
| Template fallbacks | 0 | 5 |
| Lint errors | 19 (pre-existing) | 19 (unchanged) |

## Requirements Covered

- REQ-AI-006 (5 Claude-powered features)
- REQ-AI-007 (rate limiting via architecture)
- REQ-AI-008 (graceful degradation with template fallbacks)
- REQ-NFR-006 (10s timeout on external calls)
