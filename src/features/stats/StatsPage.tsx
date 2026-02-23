/**
 * StatsPage
 *
 * League statistics with batting/pitching leader boards.
 * Tabs for batting/pitching, league filter, pagination.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStatsStore } from '@stores/statsStore';
import { StatTable } from '@components/data-display/StatTable';
import { Pagination } from '@components/data-display/Pagination';
import { ErrorBanner } from '@components/feedback/ErrorBanner';
import { LoadingLedger } from '@components/feedback/LoadingLedger';
import {
  BATTING_COLUMNS_TRADITIONAL,
  BATTING_COLUMNS_ADVANCED,
  PITCHING_COLUMNS_TRADITIONAL,
  PITCHING_COLUMNS_ADVANCED,
} from './StatColumnConfigs';
import { usePageTitle } from '@hooks/usePageTitle';

const LEAGUE_FILTERS = ['combined', 'AL', 'NL'] as const;

type SortOrder = 'asc' | 'desc';

/** Resolve sort value from top-level or nested stats object. */
function resolveSortValue(obj: unknown, key: string): unknown {
  const rec = obj as Record<string, unknown>;
  if (key in rec) return rec[key];
  const stats = rec.stats;
  if (typeof stats === 'object' && stats !== null && key in (stats as Record<string, unknown>)) {
    return (stats as Record<string, unknown>)[key];
  }
  return undefined;
}

export function StatsPage() {
  usePageTitle('Statistics');
  const { leagueId } = useParams<{ leagueId: string }>();
  const battingLeaders = useStatsStore((s) => s.battingLeaders);
  const pitchingLeaders = useStatsStore((s) => s.pitchingLeaders);
  const fetchBattingLeaders = useStatsStore((s) => s.fetchBattingLeaders);
  const fetchPitchingLeaders = useStatsStore((s) => s.fetchPitchingLeaders);
  const activeTab = useStatsStore((s) => s.activeTab);
  const [sortBy, setSortBy] = useState<string>('BA');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const leagueFilter = useStatsStore((s) => s.leagueFilter);
  const currentPage = useStatsStore((s) => s.currentPage);
  const pageSize = useStatsStore((s) => s.pageSize);
  const isLoading = useStatsStore((s) => s.isLoading);
  const error = useStatsStore((s) => s.error);
  const statView = useStatsStore((s) => s.statView);
  const setActiveTab = useStatsStore((s) => s.setActiveTab);
  const setLeagueFilter = useStatsStore((s) => s.setLeagueFilter);
  const setStatView = useStatsStore((s) => s.setStatView);
  const setPage = useStatsStore((s) => s.setPage);

  // Fetch stats on mount when store is empty
  useEffect(() => {
    if (!leagueId) return;
    if (battingLeaders.length === 0 && pitchingLeaders.length === 0 && !isLoading) {
      fetchBattingLeaders(leagueId);
      fetchPitchingLeaders(leagueId);
    }
  }, [leagueId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredBatting = leagueFilter === 'combined'
    ? battingLeaders
    : battingLeaders.filter((l) => l.leagueDivision === leagueFilter);

  const filteredPitching = leagueFilter === 'combined'
    ? pitchingLeaders
    : pitchingLeaders.filter((l) => l.leagueDivision === leagueFilter);

  const sortedBatting = useMemo(() => {
    const data = [...filteredBatting];
    data.sort((a, b) => {
      const aVal = resolveSortValue(a, sortBy);
      const bVal = resolveSortValue(b, sortBy);
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
    return data;
  }, [filteredBatting, sortBy, sortOrder]);

  const sortedPitching = useMemo(() => {
    const data = [...filteredPitching];
    data.sort((a, b) => {
      const aVal = resolveSortValue(a, sortBy);
      const bVal = resolveSortValue(b, sortBy);
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
    return data;
  }, [filteredPitching, sortBy, sortOrder]);

  const activeDataLength = activeTab === 'batting' ? sortedBatting.length : sortedPitching.length;
  const totalPages = Math.max(1, Math.ceil(activeDataLength / pageSize));
  const start = (currentPage - 1) * pageSize;
  const pagedBatting = sortedBatting.slice(start, start + pageSize);
  const pagedPitching = sortedPitching.slice(start, start + pageSize);

  const handleSort = useCallback((key: string) => {
    if (key === sortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      // ERA and pitching stats sort ascending by default, batting stats descending
      const defaultAsc = ['ERA', 'WHIP', 'BB', 'H', 'ER', 'R'].includes(key);
      setSortOrder(defaultAsc ? 'asc' : 'desc');
    }
  }, [sortBy]);

  if (isLoading) {
    return <LoadingLedger message="Loading statistics..." />;
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-header-title">League Leaders</h2>
      </div>

      {error && <ErrorBanner severity="error" message={error} />}

      <div className="flex flex-wrap items-center gap-3 mb-gutter-lg">
        <div className="tab-strip" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'batting'}
            onClick={() => setActiveTab('batting')}
            className={`tab-strip-item${activeTab === 'batting' ? ' tab-strip-item--active' : ''}`}
          >
            Batting
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pitching'}
            onClick={() => setActiveTab('pitching')}
            className={`tab-strip-item${activeTab === 'pitching' ? ' tab-strip-item--active' : ''}`}
          >
            Pitching
          </button>
        </div>

        <button
          type="button"
          onClick={() => setStatView(statView === 'traditional' ? 'advanced' : 'traditional')}
          className="tab-strip-item border border-[var(--border-default)] px-3"
          aria-label="Toggle stat view"
        >
          {statView === 'traditional' ? 'Advanced' : 'Traditional'}
        </button>

        <div className="ml-auto flex gap-1">
          {LEAGUE_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setLeagueFilter(f)}
              className={`tab-strip-item${leagueFilter === f ? ' tab-strip-item--active' : ''}`}
            >
              {f === 'combined' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'batting' ? (
        <StatTable
          columns={statView === 'advanced' ? BATTING_COLUMNS_ADVANCED : BATTING_COLUMNS_TRADITIONAL}
          data={pagedBatting}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          isLoading={isLoading}
          emptyMessage="No batting leaders available"
        />
      ) : (
        <StatTable
          columns={statView === 'advanced' ? PITCHING_COLUMNS_ADVANCED : PITCHING_COLUMNS_TRADITIONAL}
          data={pagedPitching}
          sortBy={sortBy}
          sortOrder={sortOrder}
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

export default StatsPage;
