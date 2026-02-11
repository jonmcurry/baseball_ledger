// @vitest-environment jsdom
/**
 * Tests for LineScore component
 *
 * Classic baseball line score table with innings, R/H/E totals.
 */

import { render, screen } from '@testing-library/react';
import { LineScore, type InningScore } from '@components/baseball/LineScore';

const sampleInnings: InningScore[] = [
  { away: 0, home: 1 },
  { away: 2, home: 0 },
  { away: 0, home: 0 },
  { away: 1, home: 3 },
  { away: 0, home: 0 },
  { away: 0, home: 0 },
  { away: 0, home: 0 },
  { away: 1, home: 0 },
  { away: 0, home: null }, // bottom 9 not played (home winning)
];

describe('LineScore', () => {
  it('renders table caption describing the matchup (REQ-COMP-012)', () => {
    render(
      <LineScore
        awayTeamName="Red Sox"
        homeTeamName="Yankees"
        innings={sampleInnings}
        awayTotal={{ R: 4, H: 8, E: 1 }}
        homeTotal={{ R: 4, H: 7, E: 0 }}
      />,
    );
    const caption = screen.getByRole('table').querySelector('caption');
    expect(caption).toBeInTheDocument();
    expect(caption?.textContent).toContain('Red Sox');
    expect(caption?.textContent).toContain('Yankees');
  });

  it('renders team names', () => {
    render(
      <LineScore
        awayTeamName="Red Sox"
        homeTeamName="Yankees"
        innings={sampleInnings}
        awayTotal={{ R: 4, H: 8, E: 1 }}
        homeTotal={{ R: 4, H: 7, E: 0 }}
      />,
    );
    expect(screen.getByText('Red Sox')).toBeInTheDocument();
    expect(screen.getByText('Yankees')).toBeInTheDocument();
  });

  it('renders inning numbers in header', () => {
    render(
      <LineScore
        awayTeamName="Away"
        homeTeamName="Home"
        innings={sampleInnings}
        awayTotal={{ R: 4, H: 8, E: 1 }}
        homeTotal={{ R: 4, H: 7, E: 0 }}
      />,
    );
    const thead = screen.getByRole('table').querySelector('thead')!;
    const headerCells = thead.querySelectorAll('th');
    // First th is blank team name column, then 9 inning columns, then R/H/E
    const inningHeaders = Array.from(headerCells)
      .slice(1, 10)
      .map((th) => th.textContent);
    expect(inningHeaders).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });

  it('renders R, H, E column headers', () => {
    render(
      <LineScore
        awayTeamName="Away"
        homeTeamName="Home"
        innings={[{ away: 0, home: 0 }]}
        awayTotal={{ R: 0, H: 0, E: 0 }}
        homeTotal={{ R: 0, H: 0, E: 0 }}
      />,
    );
    expect(screen.getByText('R')).toBeInTheDocument();
    expect(screen.getByText('H')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
  });

  it('renders null innings as empty cells', () => {
    render(
      <LineScore
        awayTeamName="Away"
        homeTeamName="Home"
        innings={sampleInnings}
        awayTotal={{ R: 4, H: 8, E: 1 }}
        homeTotal={{ R: 4, H: 7, E: 0 }}
      />,
    );
    const table = screen.getByRole('table');
    // The null inning (bottom 9) should render as empty
    const rows = table.querySelectorAll('tbody tr');
    const homeRow = rows[1]; // second row is home
    const cells = homeRow.querySelectorAll('td');
    // Last inning cell for home should be empty (null)
    // Team name + 9 innings + R + H + E = 13 cells total
    const ninthInningCell = cells[9]; // 0-indexed: name(0), inn1-9(1-9)
    expect(ninthInningCell.textContent).toBe('');
  });

  it('renders total R, H, E for both teams', () => {
    render(
      <LineScore
        awayTeamName="Away"
        homeTeamName="Home"
        innings={[{ away: 3, home: 2 }]}
        awayTotal={{ R: 3, H: 5, E: 1 }}
        homeTotal={{ R: 2, H: 4, E: 0 }}
      />,
    );
    // Check that total values are present
    expect(screen.getByText('5')).toBeInTheDocument(); // away H
    expect(screen.getByText('4')).toBeInTheDocument(); // home H
  });

  it('uses font-stat class for monospace alignment', () => {
    render(
      <LineScore
        awayTeamName="Away"
        homeTeamName="Home"
        innings={[]}
        awayTotal={{ R: 0, H: 0, E: 0 }}
        homeTotal={{ R: 0, H: 0, E: 0 }}
      />,
    );
    expect(screen.getByRole('table').className).toContain('font-stat');
  });

  it('renders a table element', () => {
    render(
      <LineScore
        awayTeamName="Away"
        homeTeamName="Home"
        innings={[]}
        awayTotal={{ R: 0, H: 0, E: 0 }}
        homeTotal={{ R: 0, H: 0, E: 0 }}
      />,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('handles extra innings beyond 9', () => {
    const extraInnings: InningScore[] = [];
    for (let i = 0; i < 12; i++) {
      extraInnings.push({ away: i === 11 ? 2 : 0, home: 0 });
    }
    render(
      <LineScore
        awayTeamName="Away"
        homeTeamName="Home"
        innings={extraInnings}
        awayTotal={{ R: 2, H: 3, E: 0 }}
        homeTotal={{ R: 0, H: 2, E: 1 }}
      />,
    );
    // Should show inning numbers up to 12
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});
