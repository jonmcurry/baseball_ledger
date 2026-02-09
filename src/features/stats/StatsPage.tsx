/**
 * StatsPage
 *
 * League statistics with batting/pitching leader boards.
 * Tabs for batting/pitching, league filter, pagination.
 */

import { useCallback } from 'react';
import { useStatsStore } from '@stores/statsStore';
import { StatTable } from '@components/data-display/StatTable';
import { Pagination } from '@components/data-display/Pagination';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { LoadingLedger } from '@components/feedback/LoadingLedger';
import { BATTING_COLUMNS, PITCHING_COLUMNS } from './StatColumnConfigs';

const LEAGUE_FILTERS = ['combined', 'AL', 'NL'] as const;

export function StatsPage() {
  const battingLeaders = useStatsStore((s) => s.battingLeaders);
  const pitchingLeaders = useStatsStore((s) => s.pitchingLeaders);
  const activeTab = useStatsStore((s) => s.activeTab);
  const leagueFilter = useStatsStore((s) => s.leagueFilter);
  const currentPage = useStatsStore((s) => s.currentPage);
  const pageSize = useStatsStore((s) => s.pageSize);
  const isLoading = useStatsStore((s) => s.isLoading);
  const error = useStatsStore((s) => s.error);
  const setActiveTab = useStatsStore((s) => s.setActiveTab);
  const setLeagueFilter = useStatsStore((s) => s.setLeagueFilter);
  const setPage = useStatsStore((s) => s.setPage);

  const filteredBatting = leagueFilter === 'combined'
    ? battingLeaders
    : battingLeaders.filter((l) => l.leagueDivision === leagueFilter);

  const filteredPitching = leagueFilter === 'combined'
    ? pitchingLeaders
    : pitchingLeaders.filter((l) => l.leagueDivision === leagueFilter);

  const activeDataLength = activeTab === 'batting' ? filteredBatting.length : filteredPitching.length;
  const totalPages = Math.max(1, Math.ceil(activeDataLength / pageSize));
  const start = (currentPage - 1) * pageSize;
  const pagedBatting = filteredBatting.slice(start, start + pageSize);
  const pagedPitching = filteredPitching.slice(start, start + pageSize);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSort = useCallback((_key: string) => {
    // Sort will be implemented when stats service is connected
  }, []);

  if (isLoading) {
    return <LoadingLedger message="Loading statistics..." />;
  }

  return (
    <div className="space-y-gutter-lg">
      <h2 className="font-headline text-2xl font-bold text-ballpark">Statistics</h2>

      {error && <ErrorBanner severity="error" message={error} />}

      <div className="flex items-center gap-gutter">
        <div className="flex gap-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'batting'}
            onClick={() => setActiveTab('batting')}
            className={`rounded-button px-4 py-1.5 text-sm font-medium ${
              activeTab === 'batting'
                ? 'bg-ballpark text-old-lace'
                : 'border border-sandstone text-ink hover:bg-sandstone/20'
            }`}
          >
            Batting
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pitching'}
            onClick={() => setActiveTab('pitching')}
            className={`rounded-button px-4 py-1.5 text-sm font-medium ${
              activeTab === 'pitching'
                ? 'bg-ballpark text-old-lace'
                : 'border border-sandstone text-ink hover:bg-sandstone/20'
            }`}
          >
            Pitching
          </button>
        </div>

        <div className="ml-auto flex gap-1">
          {LEAGUE_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setLeagueFilter(f)}
              className={`rounded-button px-3 py-1 text-xs font-medium ${
                leagueFilter === f
                  ? 'bg-ballpark text-old-lace'
                  : 'border border-sandstone text-ink hover:bg-sandstone/20'
              }`}
            >
              {f === 'combined' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'batting' ? (
        <StatTable
          columns={BATTING_COLUMNS}
          data={pagedBatting}
          sortBy="BA"
          sortOrder="desc"
          onSort={handleSort}
          isLoading={isLoading}
          emptyMessage="No batting leaders available"
        />
      ) : (
        <StatTable
          columns={PITCHING_COLUMNS}
          data={pagedPitching}
          sortBy="ERA"
          sortOrder="asc"
          onSort={handleSort}
          isLoading={isLoading}
          emptyMessage="No pitching leaders available"
        />
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
