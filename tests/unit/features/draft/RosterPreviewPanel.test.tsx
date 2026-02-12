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
    expect(screen.getByText(/2 Players Drafted/i)).toBeInTheDocument();
  });
});
