/**
 * PlayoffBracketView
 *
 * Visual bracket: WC -> DS -> CS -> WS.
 * Feature-scoped sub-component. No store imports.
 */

import type { PlayoffBracket } from '@lib/types/schedule';
import { SeriesCard } from './SeriesCard';

export interface PlayoffBracketViewProps {
  readonly bracket: PlayoffBracket;
  readonly teams: ReadonlyMap<string, string>;
}

export function PlayoffBracketView({ bracket, teams }: PlayoffBracketViewProps) {
  const getTeamName = (teamId: string | null | undefined) =>
    teamId ? (teams.get(teamId) ?? 'TBD') : 'TBD';

  return (
    <div className="space-y-4">
      <h3 className="font-headline text-sm font-bold text-ballpark">Playoff Bracket</h3>

      {bracket.championId && (
        <div className="rounded-card border border-ballpark bg-ballpark/10 px-gutter py-2 text-center">
          <p className="text-xs text-muted">Champion</p>
          <p className="font-headline text-lg font-bold text-ballpark">
            {getTeamName(bracket.championId)}
          </p>
        </div>
      )}

      {bracket.rounds.map((round) => (
        <div key={round.name} className="space-y-2">
          <h4 className="text-xs font-medium text-muted">
            {round.name.replace(/([A-Z])/g, ' $1').trim()}
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {round.series.map((series) => (
              <SeriesCard
                key={series.id}
                series={series}
                homeTeam={getTeamName(series.higherSeed?.teamId)}
                awayTeam={getTeamName(series.lowerSeed?.teamId)}
              />
            ))}
          </div>
        </div>
      ))}

      {bracket.rounds.length === 0 && (
        <p className="text-xs text-muted">Playoff bracket has not been set.</p>
      )}
    </div>
  );
}
