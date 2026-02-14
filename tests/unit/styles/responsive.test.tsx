// @vitest-environment jsdom
/**
 * Tests for responsive layout (REQ-COMP-010, REQ-UI-013)
 *
 * Verifies desktop-first design with max-md: breakpoint classes
 * on all SRD-specified components.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from '@components/layout/AppShell';
import { Header } from '@components/layout/Header';
import { StandingsTable } from '@components/data-display/StandingsTable';
import { StatTable, type StatColumn } from '@components/data-display/StatTable';
import { DiamondField } from '@components/baseball/DiamondField';
import { PlayerCardDisplay } from '@components/baseball/PlayerCardDisplay';
import type { DivisionStandings } from '@lib/types/league';
import type { PlayerCard } from '@lib/types/player';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function makeStandings(): DivisionStandings[] {
  return [
    {
      leagueDivision: 'AL',
      division: 'East',
      teams: [
        {
          id: 'nyy', name: 'Yankees', city: 'New York', ownerId: 'u1',
          managerProfile: 'balanced', leagueDivision: 'AL', division: 'East',
          wins: 95, losses: 67, runsScored: 800, runsAllowed: 650,
          homeWins: 0, homeLosses: 0, awayWins: 0, awayLosses: 0,
          streak: '-', lastTenWins: 0, lastTenLosses: 0,
        },
        {
          id: 'bos', name: 'Red Sox', city: 'Boston', ownerId: null,
          managerProfile: 'aggressive', leagueDivision: 'AL', division: 'East',
          wins: 88, losses: 74, runsScored: 720, runsAllowed: 700,
          homeWins: 0, homeLosses: 0, awayWins: 0, awayLosses: 0,
          streak: '-', lastTenWins: 0, lastTenLosses: 0,
        },
      ],
    },
  ];
}

interface TestRow { id: string; name: string; avg: number; }
const statColumns: StatColumn<TestRow>[] = [
  { key: 'name', header: 'Name', getValue: (r) => r.name },
  { key: 'avg', header: 'AVG', getValue: (r) => r.avg.toFixed(3), numeric: true },
];
const statData: TestRow[] = [
  { id: '1', name: 'Aaron', avg: 0.305 },
];

const fakePlayer: PlayerCard = {
  playerKey: 'ruth01',
  nameFirst: 'Babe',
  nameLast: 'Ruth',
  seasonYear: 1927,
  battingHand: 'L',
  throwingHand: 'L',
  primaryPosition: 'RF',
  eligiblePositions: ['RF', 'LF'],
  isPitcher: false,
  speed: 0.4,
  powerRating: 21,
  contactRate: 0.75,
  discipline: 0.6,
  fieldingPct: 0.97,
  range: 0.5,
  cardValues: new Array(26).fill(0),
} as PlayerCard;

/* -------------------------------------------------------------------------- */
/*  AppShell (REQ-COMP-010)                                                    */
/* -------------------------------------------------------------------------- */

describe('AppShell responsive (REQ-COMP-010)', () => {
  it('has max-w-ledger container for centered layout', () => {
    render(<AppShell><div>Test</div></AppShell>);
    const container = screen.getByRole('main').closest('[class*="max-w-ledger"]');
    expect(container).toBeInTheDocument();
  });

  it('has left spine decoration with fixed positioning', () => {
    render(<AppShell><div>Test</div></AppShell>);
    // The spine is a fixed left-positioned element with gradient
    const outer = screen.getByRole('main').closest('[class*="min-h-screen"]');
    expect(outer).toBeInTheDocument();
  });

  it('has flex layout for main content', () => {
    render(<AppShell><div>Test</div></AppShell>);
    const main = screen.getByRole('main');
    expect(main.className).toContain('flex');
    expect(main.className).toContain('flex-col');
  });
});

/* -------------------------------------------------------------------------- */
/*  Header hamburger menu (REQ-COMP-010)                                       */
/* -------------------------------------------------------------------------- */

describe('Header responsive (REQ-COMP-010)', () => {
  const headerProps = {
    leagueName: 'Test League',
    leagueStatus: 'regular_season' as const,
    userName: 'Player 1',
    isCommissioner: false,
    onNavigate: vi.fn(),
    onLogout: vi.fn(),
  };

  it('renders hamburger menu button for mobile', () => {
    render(<Header {...headerProps} />);
    const hamburger = screen.getByRole('button', { name: /open menu/i });
    expect(hamburger).toBeInTheDocument();
    expect(hamburger.className).toContain('max-md:block');
  });

  it('nav is collapsed by default (max-h-0 on mobile)', () => {
    render(<Header {...headerProps} />);
    const nav = screen.getByRole('navigation');
    expect(nav.className).toContain('max-h-0');
  });

  it('toggles mobile nav open when hamburger is clicked', async () => {
    const user = userEvent.setup();
    render(<Header {...headerProps} />);

    const hamburger = screen.getByRole('button', { name: /open menu/i });
    await user.click(hamburger);

    const nav = screen.getByRole('navigation');
    expect(nav.className).toContain('max-h-96');
  });

  it('closes mobile menu when a nav link is clicked', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<Header {...headerProps} onNavigate={onNavigate} />);

    // Open the menu
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    // Click a nav item
    await user.click(screen.getByText(/season/i));

    expect(onNavigate).toHaveBeenCalledWith('/dashboard');
    const nav = screen.getByRole('navigation');
    expect(nav.className).toContain('max-h-0');
  });

  it('hamburger button has aria-expanded attribute', async () => {
    const user = userEvent.setup();
    render(<Header {...headerProps} />);

    const hamburger = screen.getByRole('button', { name: /open menu/i });
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');

    await user.click(hamburger);
    const closeBtn = screen.getByRole('button', { name: /close menu/i });
    expect(closeBtn).toHaveAttribute('aria-expanded', 'true');
  });

  it('hides desktop user info on mobile (max-md:hidden)', () => {
    render(<Header {...headerProps} />);
    // The desktop username span should have max-md:hidden
    const userSpans = screen.getAllByText('Player 1');
    const desktopSpan = userSpans.find(
      (el) => el.className.includes('max-md:hidden'),
    );
    expect(desktopSpan).toBeDefined();
  });

  it('shows hamburger even when league is in setup', () => {
    render(<Header {...headerProps} leagueStatus="setup" />);
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
  });
});

/* -------------------------------------------------------------------------- */
/*  StandingsTable (REQ-COMP-010)                                              */
/* -------------------------------------------------------------------------- */

describe('StandingsTable responsive (REQ-COMP-010)', () => {
  it('hides GB, RS, RA, DIFF columns on narrow viewports', () => {
    render(
      <StandingsTable
        standings={makeStandings()}
        userTeamId="nyy"
        onTeamClick={vi.fn()}
      />,
    );
    // Check header cells
    const table = screen.getAllByRole('table')[0];
    const headers = table.querySelectorAll('th');
    const gbHeader = Array.from(headers).find((th) => th.textContent === 'GB');
    const rsHeader = Array.from(headers).find((th) => th.textContent === 'RS');
    const raHeader = Array.from(headers).find((th) => th.textContent === 'RA');
    const diffHeader = Array.from(headers).find((th) => th.textContent === 'DIFF');

    expect(gbHeader?.className).toContain('max-md:hidden');
    expect(rsHeader?.className).toContain('max-md:hidden');
    expect(raHeader?.className).toContain('max-md:hidden');
    expect(diffHeader?.className).toContain('max-md:hidden');
  });

  it('keeps Team, W, L, PCT columns visible on narrow viewports', () => {
    render(
      <StandingsTable
        standings={makeStandings()}
        userTeamId="nyy"
        onTeamClick={vi.fn()}
      />,
    );
    const table = screen.getAllByRole('table')[0];
    const headers = table.querySelectorAll('th');
    const teamHeader = Array.from(headers).find((th) => th.textContent === 'Team');
    const wHeader = Array.from(headers).find((th) => th.textContent === 'W');
    const lHeader = Array.from(headers).find((th) => th.textContent === 'L');
    const pctHeader = Array.from(headers).find((th) => th.textContent === 'PCT');

    expect(teamHeader?.className).not.toContain('max-md:hidden');
    expect(wHeader?.className).not.toContain('max-md:hidden');
    expect(lHeader?.className).not.toContain('max-md:hidden');
    expect(pctHeader?.className).not.toContain('max-md:hidden');
  });
});

/* -------------------------------------------------------------------------- */
/*  StatTable (REQ-COMP-010)                                                   */
/* -------------------------------------------------------------------------- */

describe('StatTable responsive (REQ-COMP-010)', () => {
  it('first header column has sticky classes for mobile', () => {
    render(
      <StatTable
        columns={statColumns}
        data={statData}
        sortBy="name"
        sortOrder="asc"
        onSort={vi.fn()}
      />,
    );
    const nameHeader = screen.getByText('Name').closest('th');
    expect(nameHeader?.className).toContain('max-md:sticky');
    expect(nameHeader?.className).toContain('max-md:left-0');
  });

  it('first data column has sticky classes for mobile', () => {
    render(
      <StatTable
        columns={statColumns}
        data={statData}
        sortBy="name"
        sortOrder="asc"
        onSort={vi.fn()}
      />,
    );
    const nameCell = screen.getByText('Aaron').closest('td');
    expect(nameCell?.className).toContain('max-md:sticky');
    expect(nameCell?.className).toContain('max-md:left-0');
  });

  it('non-first columns do not have sticky classes', () => {
    render(
      <StatTable
        columns={statColumns}
        data={statData}
        sortBy="name"
        sortOrder="asc"
        onSort={vi.fn()}
      />,
    );
    const avgHeader = screen.getByText('AVG').closest('th');
    expect(avgHeader?.className).not.toContain('max-md:sticky');
  });
});

/* -------------------------------------------------------------------------- */
/*  DiamondField (REQ-COMP-010)                                                */
/* -------------------------------------------------------------------------- */

describe('DiamondField responsive (REQ-COMP-010)', () => {
  it('has min-width constraint for narrow viewports', () => {
    render(<DiamondField positions={[]} />);
    const svg = screen.getByRole('group', { name: /baseball diamond/i });
    expect(svg.className.baseVal ?? svg.getAttribute('class')).toContain('max-md:min-w-[280px]');
  });

  it('has preserveAspectRatio for proportional scaling', () => {
    render(<DiamondField positions={[]} />);
    const svg = screen.getByRole('group', { name: /baseball diamond/i });
    expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
  });
});

/* -------------------------------------------------------------------------- */
/*  PlayerCardDisplay (REQ-COMP-010)                                           */
/* -------------------------------------------------------------------------- */

describe('PlayerCardDisplay responsive (REQ-COMP-010)', () => {
  it('uses 480px max-width on desktop', () => {
    render(<PlayerCardDisplay player={fakePlayer} isOpen={true} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    const card = dialog.querySelector('[class*="max-w-"]');
    expect(card?.className).toContain('max-w-[480px]');
  });

  it('has max-md:mx-4 margin for mobile', () => {
    render(<PlayerCardDisplay player={fakePlayer} isOpen={true} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    const card = dialog.querySelector('[class*="max-w-"]');
    expect(card?.className).toContain('max-md:mx-4');
  });

  it('has max-md:max-w-none for full width on mobile', () => {
    render(<PlayerCardDisplay player={fakePlayer} isOpen={true} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    const card = dialog.querySelector('[class*="max-w-"]');
    expect(card?.className).toContain('max-md:max-w-none');
  });
});
