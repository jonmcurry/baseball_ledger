/**
 * Mock Roster Service
 *
 * Layer 3 stub that provides hardcoded roster data for development.
 */

import type { RosterEntry } from '@lib/types/roster';
import type { PlayerCard, Position } from '@lib/types/player';

function card(playerId: string, first: string, last: string, pos: string, pitcherGrade: number | null = null): PlayerCard {
  const isPitcher = pos === 'P' || pos === 'SP' || pos === 'RP' || pos === 'CL';
  return {
    playerId,
    nameFirst: first,
    nameLast: last,
    seasonYear: 1993,
    battingHand: 'R',
    throwingHand: 'R',
    primaryPosition: pos as Position,
    eligiblePositions: [pos as Position],
    isPitcher,
    card: [7, 8, 9, 7, 13, 8, 7, 9, 8, 14, 7, 8, 9, 13, 14, 7, 8, 9, 8, 7, 9, 7, 8, 19, 8, 7, 9, 7, 8, 7, 9, 8, 7, 7, 0],
    powerRating: 19,
    archetype: { byte33: 7, byte34: 0 },
    speed: 0.6,
    power: 0.187,
    discipline: 0.58,
    contactRate: 0.836,
    fieldingPct: 0.980,
    range: 0.7,
    arm: 0.6,
    ...(isPitcher && pitcherGrade !== null ? {
      pitching: {
        role: 'SP' as const,
        grade: pitcherGrade,
        stamina: 7.0,
        era: 2.45,
        whip: 1.02,
        k9: 8.6,
        bb9: 1.8,
        hr9: 0.6,
        usageFlags: [],
        isReliever: false,
      },
    } : {}),
  };
}

const MOCK_ROSTER: RosterEntry[] = [
  { id: 'r-1', playerId: 'p-griffey', playerCard: card('p-griffey', 'Ken', 'Griffey Jr.', 'CF'), rosterSlot: 'starter', lineupOrder: 1, lineupPosition: 'CF' },
  { id: 'r-2', playerId: 'p-ripken', playerCard: card('p-ripken', 'Cal', 'Ripken Jr.', 'SS'), rosterSlot: 'starter', lineupOrder: 2, lineupPosition: 'SS' },
  { id: 'r-3', playerId: 'p-thomas', playerCard: card('p-thomas', 'Frank', 'Thomas', '1B'), rosterSlot: 'starter', lineupOrder: 3, lineupPosition: '1B' },
  { id: 'r-4', playerId: 'p-bonds', playerCard: card('p-bonds', 'Barry', 'Bonds', 'LF'), rosterSlot: 'starter', lineupOrder: 4, lineupPosition: 'LF' },
  { id: 'r-5', playerId: 'p-jones', playerCard: card('p-jones', 'Chipper', 'Jones', '3B'), rosterSlot: 'starter', lineupOrder: 5, lineupPosition: '3B' },
  { id: 'r-6', playerId: 'p-walker', playerCard: card('p-walker', 'Larry', 'Walker', 'RF'), rosterSlot: 'starter', lineupOrder: 6, lineupPosition: 'RF' },
  { id: 'r-7', playerId: 'p-alomar', playerCard: card('p-alomar', 'Roberto', 'Alomar', '2B'), rosterSlot: 'starter', lineupOrder: 7, lineupPosition: '2B' },
  { id: 'r-8', playerId: 'p-piazza', playerCard: card('p-piazza', 'Mike', 'Piazza', 'C'), rosterSlot: 'starter', lineupOrder: 8, lineupPosition: 'C' },
  { id: 'r-9', playerId: 'p-maddux', playerCard: card('p-maddux', 'Greg', 'Maddux', 'P', 3), rosterSlot: 'rotation', lineupOrder: 9, lineupPosition: 'P' },
  { id: 'r-10', playerId: 'p-gwynn', playerCard: card('p-gwynn', 'Tony', 'Gwynn', 'RF'), rosterSlot: 'bench', lineupOrder: null, lineupPosition: null },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchRoster(_teamId: string): Promise<RosterEntry[]> {
  return [...MOCK_ROSTER];
}
