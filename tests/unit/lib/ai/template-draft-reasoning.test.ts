/**
 * Template Draft Reasoning Tests
 */

import type { DraftReasoningRequest } from '../../../../src/lib/types/ai';
import { generateDraftReasoningTemplate } from '../../../../src/lib/ai/template-draft-reasoning';

function makeRequest(overrides: Partial<DraftReasoningRequest> = {}): DraftReasoningRequest {
  return {
    round: 1,
    managerStyle: 'balanced',
    managerName: 'Johnny McCoy',
    teamName: 'Sluggers',
    pickedPlayerName: 'Ken Griffey Jr.',
    pickedPlayerPosition: 'CF',
    pickedPlayerValue: 92,
    alternativePlayers: [
      { name: 'Barry Bonds', position: 'LF', value: 88 },
    ],
    teamNeeds: ['CF', 'SP', 'CL'],
    ...overrides,
  };
}

describe('generateDraftReasoningTemplate', () => {
  it('returns source "template"', () => {
    const result = generateDraftReasoningTemplate(makeRequest());
    expect(result.source).toBe('template');
  });

  it('mentions the picked player name', () => {
    const result = generateDraftReasoningTemplate(makeRequest());
    expect(result.reasoning).toContain('Ken Griffey Jr.');
  });

  it('mentions the team name', () => {
    const result = generateDraftReasoningTemplate(makeRequest());
    expect(result.reasoning).toContain('Sluggers');
  });

  // Early rounds (1-3)
  it('early round mentions elite talent focus', () => {
    const result = generateDraftReasoningTemplate(makeRequest({ round: 2 }));
    expect(result.reasoning).toContain('elite talent');
  });

  // Mid rounds (4-8)
  it('mid round mentions rotation and premium positions', () => {
    const result = generateDraftReasoningTemplate(makeRequest({ round: 5 }));
    expect(result.reasoning).toContain('rotation');
  });

  // Late rounds (9+)
  it('late round mentions relievers and bench depth', () => {
    const result = generateDraftReasoningTemplate(makeRequest({ round: 12 }));
    expect(result.reasoning).toContain('bench depth');
  });

  it('mentions when pick fills a team need', () => {
    const result = generateDraftReasoningTemplate(makeRequest({
      pickedPlayerPosition: 'CF',
      teamNeeds: ['CF', 'SP'],
    }));
    expect(result.reasoning).toContain('team need');
  });

  it('mentions when pick does not fill top need', () => {
    const result = generateDraftReasoningTemplate(makeRequest({
      pickedPlayerPosition: 'LF',
      teamNeeds: ['CF', 'SP'],
    }));
    expect(result.reasoning).toContain('value was too good');
  });

  it('mentions value comparison with alternatives', () => {
    const result = generateDraftReasoningTemplate(makeRequest({
      pickedPlayerValue: 92,
      alternativePlayers: [{ name: 'Barry Bonds', position: 'LF', value: 88 }],
    }));
    expect(result.reasoning).toContain('Barry Bonds');
  });

  // Manager personality flavor
  it('conservative manager gets safe/reliable flavor', () => {
    const result = generateDraftReasoningTemplate(makeRequest({
      managerStyle: 'conservative',
      managerName: 'Cap Spalding',
    }));
    expect(result.reasoning).toContain('safe');
  });

  it('aggressive manager gets bold flavor', () => {
    const result = generateDraftReasoningTemplate(makeRequest({
      managerStyle: 'aggressive',
      managerName: 'Duke Robinson',
    }));
    expect(result.reasoning).toContain('bold');
  });

  it('analytical manager gets numbers flavor', () => {
    const result = generateDraftReasoningTemplate(makeRequest({
      managerStyle: 'analytical',
      managerName: 'Larry Pepper',
    }));
    expect(result.reasoning).toContain('numbers');
  });

  it('handles empty alternatives list', () => {
    const result = generateDraftReasoningTemplate(makeRequest({
      alternativePlayers: [],
    }));
    expect(result.reasoning.length).toBeGreaterThan(0);
  });
});
