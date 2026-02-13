// @vitest-environment jsdom
/**
 * Tests for PitchingRotation
 */

import { render, screen } from '@testing-library/react';
import { PitchingRotation } from '@features/roster/PitchingRotation';
import { createMockRosterEntry } from '../../../fixtures/mock-roster';

describe('PitchingRotation', () => {
  const mockPitcherCard = {
    playerId: 'p-sp1',
    nameFirst: 'Greg',
    nameLast: 'Maddux',
    seasonYear: 1995,
    battingHand: 'R' as const,
    throwingHand: 'R' as const,
    primaryPosition: 'P' as const,
    eligiblePositions: ['P'] as const,
    isPitcher: true,
    card: [] as number[],
    powerRating: 13,
    archetype: { byte33: 7, byte34: 0 },
    speed: 0.4,
    power: 0.1,
    discipline: 0.3,
    contactRate: 0.3,
    fieldingPct: 0.95,
    range: 0.5,
    arm: 0.5,
    pitching: { role: 'SP' as const, grade: 3, stamina: 7, era: 2.36, whip: 1.05, k9: 7.5, bb9: 1.8, hr9: 0.7, usageFlags: [] as string[], isReliever: false },
  };

  const mockCloserCard = {
    ...mockPitcherCard,
    playerId: 'p-cl1',
    nameFirst: 'Trevor',
    nameLast: 'Hoffman',
    pitching: { role: 'CL' as const, grade: 9, stamina: 2, era: 2.14, whip: 0.95, k9: 10.5, bb9: 2.0, hr9: 0.7, usageFlags: [] as string[], isReliever: true },
  };

  it('renders heading', () => {
    render(<PitchingRotation rotation={[]} bullpen={[]} nextStarterIdx={0} />);
    expect(screen.getByText('Pitching Staff')).toBeInTheDocument();
  });

  it('displays starter with NEXT indicator', () => {
    const rotation = [
      createMockRosterEntry({
        id: 'r-sp1',
        rosterSlot: 'rotation',
        playerCard: mockPitcherCard,
      }),
    ];
    render(<PitchingRotation rotation={rotation} bullpen={[]} nextStarterIdx={0} />);
    expect(screen.getByText('Greg Maddux')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('G3')).toBeInTheDocument();
  });

  it('shows CL role label for closers in bullpen', () => {
    const bullpen = [
      createMockRosterEntry({
        id: 'r-cl1',
        rosterSlot: 'bullpen',
        playerCard: mockCloserCard,
        lineupOrder: null,
        lineupPosition: null,
      }),
    ];
    render(<PitchingRotation rotation={[]} bullpen={bullpen} nextStarterIdx={0} />);
    expect(screen.getByText('Trevor Hoffman')).toBeInTheDocument();
    expect(screen.getByText('CL')).toBeInTheDocument();
  });
});
