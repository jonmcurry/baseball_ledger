/**
 * SeasonList
 *
 * List of archived seasons for selection.
 * Feature-scoped sub-component. No store imports.
 */

export interface ArchivedSeason {
  readonly id: string;
  readonly year: number;
  readonly champion: string;
  readonly runnerUp: string;
}

export interface SeasonListProps {
  readonly seasons: readonly ArchivedSeason[];
  readonly onSelect: (seasonId: string) => void;
}

export function SeasonList({ seasons, onSelect }: SeasonListProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-headline text-sm font-bold text-ballpark">Archived Seasons</h3>
      {seasons.length === 0 && (
        <p className="text-xs text-muted">No archived seasons</p>
      )}
      <div className="space-y-1">
        {seasons.map((season) => (
          <button
            key={season.id}
            type="button"
            onClick={() => onSelect(season.id)}
            className="flex w-full items-center justify-between rounded-card border border-sandstone/50 px-3 py-2 text-left hover:bg-sandstone/20"
          >
            <div>
              <span className="font-stat text-sm font-bold text-ink">{season.year}</span>
              <span className="ml-2 text-xs text-muted">Champion: {season.champion}</span>
            </div>
            <span className="text-xs text-muted">View</span>
          </button>
        ))}
      </div>
    </div>
  );
}
