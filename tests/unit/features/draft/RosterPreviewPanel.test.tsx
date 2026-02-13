// @vitest-environment jsdom
/**
 * Tests for RosterPreviewPanel
 */

import { render, screen } from '@testing-library/react';
import { RosterPreviewPanel } from '@features/draft/RosterPreviewPanel';
import { createMockDraftPick } from '../../../fixtures/mock-draft';

describe('RosterPreviewPanel', () => {
  it('shows team name and no picks message when empty', () => {
    render(<RosterPreviewPanel picks={[]} teamName="New York Yankees" teamId="team-1" />);
    expect(screen.getByText('New York Yankees')).toBeInTheDocument();
    expect(screen.getByText(/No players drafted yet/)).toBeInTheDocument();
  });

  it('displays drafted players filtered by team', () => {
    const picks = [
      createMockDraftPick({ teamId: 'team-1', playerName: 'Babe Ruth', position: 'RF' }),
      createMockDraftPick({ teamId: 'team-2', playerName: 'Hank Aaron', position: 'LF', pick: 2 }),
      createMockDraftPick({ teamId: 'team-1', playerName: 'Lou Gehrig', position: '1B', round: 2, pick: 3 }),
    ];
    render(<RosterPreviewPanel picks={picks} teamName="New York Yankees" teamId="team-1" />);
    expect(screen.getByText('Babe Ruth')).toBeInTheDocument();
    expect(screen.getByText('Lou Gehrig')).toBeInTheDocument();
    expect(screen.queryByText('Hank Aaron')).not.toBeInTheDocument();
    expect(screen.getByText(/2 \/ 21 Drafted/)).toBeInTheDocument();
  });

  it('auto-assigns first player at a position to starter, excess to bench', () => {
    // Fill all 9 starter slots, then add a 10th position player
    const picks = [
      createMockDraftPick({ teamId: 'team-1', playerName: 'Bill Dickey', position: 'C', round: 1, pick: 1 }),
      createMockDraftPick({ teamId: 'team-1', playerName: 'Lou Gehrig', position: '1B', round: 2, pick: 1 }),
      createMockDraftPick({ teamId: 'team-1', playerName: 'Joe Morgan', position: '2B', round: 3, pick: 1 }),
      createMockDraftPick({ teamId: 'team-1', playerName: 'Barry Larkin', position: 'SS', round: 4, pick: 1 }),
      createMockDraftPick({ teamId: 'team-1', playerName: 'Brooks Robinson', position: '3B', round: 5, pick: 1 }),
      createMockDraftPick({ teamId: 'team-1', playerName: 'Ted Williams', position: 'LF', round: 6, pick: 1 }),
      createMockDraftPick({ teamId: 'team-1', playerName: 'Joe DiMaggio', position: 'CF', round: 7, pick: 1 }),
      createMockDraftPick({ teamId: 'team-1', playerName: 'Babe Ruth', position: 'RF', round: 8, pick: 1 }),
      createMockDraftPick({ teamId: 'team-1', playerName: 'Edgar Martinez', position: 'DH', round: 9, pick: 1 }),
      // 10th position player goes to bench
      createMockDraftPick({ teamId: 'team-1', playerName: 'Ozzie Smith', position: 'SS', round: 10, pick: 1 }),
    ];
    render(<RosterPreviewPanel picks={picks} teamName="Cincinnati Reds" teamId="team-1" />);
    // Starters
    expect(screen.getByText('Barry Larkin')).toBeInTheDocument();
    // Bench player is also visible
    expect(screen.getByText('Ozzie Smith')).toBeInTheDocument();
    // Bench shows BN badge with natural position label
    expect(screen.getByText((_content, el) =>
      el?.tagName === 'SPAN' && el.textContent === '(SS)',
    )).toBeInTheDocument();
  });

  it('shows Starting Lineup, Bench, and Pitching section headers', () => {
    const picks = [
      createMockDraftPick({ teamId: 'team-1', playerName: 'Mike Trout', position: 'CF', round: 1, pick: 1 }),
      createMockDraftPick({ teamId: 'team-1', playerName: 'Pedro Martinez', position: 'SP', round: 2, pick: 1 }),
    ];
    render(<RosterPreviewPanel picks={picks} teamName="Test Team" teamId="team-1" />);
    expect(screen.getByText('Starting Lineup')).toBeInTheDocument();
    expect(screen.getByText('Bench')).toBeInTheDocument();
    expect(screen.getByText('Pitching')).toBeInTheDocument();
  });

  it('groups RP and CL under Bullpen sub-section', () => {
    const picks = [
      createMockDraftPick({ teamId: 'team-1', playerName: 'Mariano Rivera', position: 'CL', round: 1, pick: 1 }),
      createMockDraftPick({ teamId: 'team-1', playerName: 'Joe Nathan', position: 'RP', round: 2, pick: 1 }),
    ];
    render(<RosterPreviewPanel picks={picks} teamName="Test Team" teamId="team-1" />);
    expect(screen.getByText('Bullpen')).toBeInTheDocument();
    expect(screen.getByText('Mariano Rivera')).toBeInTheDocument();
    expect(screen.getByText('Joe Nathan')).toBeInTheDocument();
  });

  it('shows composition summary bar', () => {
    const picks = [
      createMockDraftPick({ teamId: 'team-1', playerName: 'Player A', position: 'C', round: 1, pick: 1 }),
      createMockDraftPick({ teamId: 'team-1', playerName: 'Player B', position: 'SP', round: 2, pick: 1 }),
    ];
    render(<RosterPreviewPanel picks={picks} teamName="Test Team" teamId="team-1" />);
    expect(screen.getByText(/POS 1\/13/)).toBeInTheDocument();
    expect(screen.getByText(/PIT 1\/8/)).toBeInTheDocument();
    expect(screen.getByText(/2\/21/)).toBeInTheDocument();
  });
});
