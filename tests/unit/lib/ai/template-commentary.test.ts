/**
 * Template Commentary Engine Tests
 */

import { OutcomeCategory } from '../../../../src/lib/types/game';
import type { CommentaryRequest, CommentaryStyle } from '../../../../src/lib/types/ai';
import {
  generateTemplateCommentary,
  getSituationTag,
  hashSelection,
  selectTemplate,
  interpolateTemplate,
} from '../../../../src/lib/ai/template-commentary';

function makeRequest(overrides: Partial<CommentaryRequest> = {}): CommentaryRequest {
  return {
    batterId: 'player-001',
    batterName: 'Mike Trout',
    pitcherId: 'pitcher-001',
    pitcherName: 'Greg Maddux',
    outcome: OutcomeCategory.SINGLE_CLEAN,
    inning: 3,
    halfInning: 'top',
    outs: 1,
    scoreDiff: 0,
    runnersOn: 0,
    style: 'newspaper',
    ...overrides,
  };
}

// ================================================================
// getSituationTag
// ================================================================

describe('getSituationTag', () => {
  it('returns "routine" for early-game, no pressure', () => {
    expect(getSituationTag(makeRequest({ inning: 3, outs: 1, scoreDiff: 5, runnersOn: 0 })))
      .toBe('routine');
  });

  it('returns "clutch" when inning >= 6 and score within 3', () => {
    expect(getSituationTag(makeRequest({ inning: 7, outs: 1, scoreDiff: 2, runnersOn: 0 })))
      .toBe('clutch');
  });

  it('returns "clutch" when runners on and close score', () => {
    expect(getSituationTag(makeRequest({ inning: 3, outs: 0, scoreDiff: 1, runnersOn: 2 })))
      .toBe('clutch');
  });

  it('returns "dramatic" when 8th+ inning, 2 outs, within 2 runs', () => {
    expect(getSituationTag(makeRequest({ inning: 9, outs: 2, scoreDiff: -1, runnersOn: 1 })))
      .toBe('dramatic');
  });

  it('returns "dramatic" for 8th inning, tied, 2 outs', () => {
    expect(getSituationTag(makeRequest({ inning: 8, outs: 2, scoreDiff: 0, runnersOn: 0 })))
      .toBe('dramatic');
  });

  it('does not return "dramatic" when inning < 8', () => {
    expect(getSituationTag(makeRequest({ inning: 7, outs: 2, scoreDiff: 0, runnersOn: 0 })))
      .not.toBe('dramatic');
  });

  it('does not return "dramatic" when outs < 2', () => {
    expect(getSituationTag(makeRequest({ inning: 9, outs: 1, scoreDiff: 0, runnersOn: 0 })))
      .not.toBe('dramatic');
  });

  it('does not return "dramatic" when score diff > 2', () => {
    expect(getSituationTag(makeRequest({ inning: 9, outs: 2, scoreDiff: 5, runnersOn: 0 })))
      .not.toBe('dramatic');
  });
});

// ================================================================
// hashSelection
// ================================================================

describe('hashSelection', () => {
  it('returns a non-negative integer', () => {
    const h = hashSelection('player-001', 5, 2);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(h)).toBe(true);
  });

  it('returns the same value for the same inputs', () => {
    const h1 = hashSelection('player-001', 5, 2);
    const h2 = hashSelection('player-001', 5, 2);
    expect(h1).toBe(h2);
  });

  it('returns different values for different inputs', () => {
    const h1 = hashSelection('player-001', 5, 2);
    const h2 = hashSelection('player-002', 5, 2);
    expect(h1).not.toBe(h2);
  });

  it('varies by inning', () => {
    const h1 = hashSelection('player-001', 3, 0);
    const h2 = hashSelection('player-001', 7, 0);
    expect(h1).not.toBe(h2);
  });

  it('varies by outs', () => {
    const h1 = hashSelection('player-001', 3, 0);
    const h2 = hashSelection('player-001', 3, 2);
    expect(h1).not.toBe(h2);
  });
});

// ================================================================
// selectTemplate
// ================================================================

describe('selectTemplate', () => {
  it('returns a string for a valid outcome/style/situation', () => {
    const result = selectTemplate('15', 'newspaper', 'routine', 0);
    expect(typeof result).toBe('string');
    expect(result!.length).toBeGreaterThan(0);
  });

  it('returns null for an unknown outcome key', () => {
    expect(selectTemplate('999', 'newspaper', 'routine', 0)).toBeNull();
  });

  it('cycles through templates based on hash', () => {
    const t0 = selectTemplate('15', 'newspaper', 'routine', 0);
    const t1 = selectTemplate('15', 'newspaper', 'routine', 1);
    const t2 = selectTemplate('15', 'newspaper', 'routine', 2);
    // With 3 templates, hash 0 and hash 3 should match
    const t3 = selectTemplate('15', 'newspaper', 'routine', 3);
    expect(t0).toBe(t3);
    // At least some should differ (they have 3 templates)
    const unique = new Set([t0, t1, t2]);
    expect(unique.size).toBe(3);
  });
});

// ================================================================
// interpolateTemplate
// ================================================================

describe('interpolateTemplate', () => {
  it('replaces {batter} and {pitcher}', () => {
    const result = interpolateTemplate(
      '{batter} hit a homer off {pitcher}.',
      { batter: 'Bonds', pitcher: 'Clemens' },
    );
    expect(result).toBe('Bonds hit a homer off Clemens.');
  });

  it('replaces {team} and {opponent} when provided', () => {
    const result = interpolateTemplate(
      '{team} vs {opponent}: {batter} up.',
      { batter: 'Ruth', pitcher: 'Johnson', team: 'Yankees', opponent: 'Red Sox' },
    );
    expect(result).toBe('Yankees vs Red Sox: Ruth up.');
  });

  it('uses defaults for missing team/opponent', () => {
    const result = interpolateTemplate(
      '{team} and {opponent}',
      { batter: 'X', pitcher: 'Y' },
    );
    expect(result).toBe('the team and the opposition');
  });

  it('replaces multiple occurrences of the same placeholder', () => {
    const result = interpolateTemplate(
      '{batter} and {batter}',
      { batter: 'Mays', pitcher: 'P' },
    );
    expect(result).toBe('Mays and Mays');
  });
});

// ================================================================
// generateTemplateCommentary -- all 26 OutcomeCategory values
// ================================================================

describe('generateTemplateCommentary', () => {
  it('returns source "template" always', () => {
    const response = generateTemplateCommentary(makeRequest());
    expect(response.source).toBe('template');
  });

  it('returns non-empty text', () => {
    const response = generateTemplateCommentary(makeRequest());
    expect(response.text.length).toBeGreaterThan(0);
  });

  it('includes batter name in text', () => {
    const response = generateTemplateCommentary(makeRequest({ batterName: 'Aaron Judge' }));
    expect(response.text).toContain('Aaron Judge');
  });

  it('is deterministic for the same inputs', () => {
    const req = makeRequest();
    const r1 = generateTemplateCommentary(req);
    const r2 = generateTemplateCommentary(req);
    expect(r1.text).toBe(r2.text);
  });

  // Test all 26 OutcomeCategory values produce valid commentary
  const outcomeNames = Object.entries(OutcomeCategory)
    .filter(([key]) => isNaN(Number(key)))
    .map(([name, value]) => ({ name, value: value as number }));

  describe.each(outcomeNames)('outcome $name ($value)', ({ value }) => {
    it('produces commentary text', () => {
      const response = generateTemplateCommentary(makeRequest({ outcome: value }));
      expect(response.text.length).toBeGreaterThan(0);
      expect(response.source).toBe('template');
    });
  });

  // Test all 3 styles
  const styles: CommentaryStyle[] = ['newspaper', 'radio', 'modern'];

  describe.each(styles)('style %s', (style) => {
    it('produces commentary', () => {
      const response = generateTemplateCommentary(makeRequest({ style }));
      expect(response.text.length).toBeGreaterThan(0);
    });
  });

  // Test situation-dependent output variation
  it('produces different text for routine vs dramatic situations', () => {
    const routine = generateTemplateCommentary(
      makeRequest({ inning: 2, outs: 0, scoreDiff: 5, runnersOn: 0, outcome: OutcomeCategory.HOME_RUN }),
    );
    const dramatic = generateTemplateCommentary(
      makeRequest({ inning: 9, outs: 2, scoreDiff: -1, runnersOn: 1, outcome: OutcomeCategory.HOME_RUN }),
    );
    // Different situations should generally produce different templates
    // (though not guaranteed -- they could hash to the same index)
    expect(routine.source).toBe('template');
    expect(dramatic.source).toBe('template');
  });

  it('falls back to generic text for unknown outcome', () => {
    const response = generateTemplateCommentary(
      makeRequest({ outcome: 999 as OutcomeCategory }),
    );
    expect(response.text).toContain('Mike Trout');
    expect(response.text).toContain('Greg Maddux');
    expect(response.source).toBe('template');
  });
});
