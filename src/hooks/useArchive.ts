/**
 * useArchive Hook
 *
 * Fetches archived seasons for a given league.
 * Supports fetching full detail for a single archive (REQ-SCH-009).
 *
 * Layer 5: Hook. Fetches data. Does not import components.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@services/api-client';
import type { ArchiveLeaderEntry } from '@lib/transforms/archive-builder';

export interface ArchivedSeasonData {
  readonly id: string;
  readonly seasonNumber: number;
  readonly champion: string | null;
  readonly createdAt: string;
}

export interface ArchiveDetail extends ArchivedSeasonData {
  readonly standings: Record<string, unknown>;
  readonly playoffResults: Record<string, unknown> | null;
  readonly leagueLeaders: {
    batting: Record<string, ArchiveLeaderEntry[]>;
    pitching: Record<string, ArchiveLeaderEntry[]>;
  } | null;
}

interface UseArchiveReturn {
  seasons: ArchivedSeasonData[];
  isLoading: boolean;
  error: string | null;
  detail: ArchiveDetail | null;
  detailLoading: boolean;
  fetchDetail: (seasonId: string) => void;
  clearDetail: () => void;
}

export function useArchive(leagueId: string): UseArchiveReturn {
  const [seasons, setSeasons] = useState<ArchivedSeasonData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ArchiveDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!leagueId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    apiGet<ArchivedSeasonData[]>(`/api/leagues/${leagueId}/archive`)
      .then((response) => {
        if (!cancelled) {
          setSeasons(response.data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load archives');
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [leagueId]);

  const fetchDetail = useCallback((seasonId: string) => {
    if (!leagueId) return;
    setDetailLoading(true);
    setError(null);

    apiGet<ArchiveDetail>(`/api/leagues/${leagueId}/archive?seasonId=${seasonId}`)
      .then((response) => {
        setDetail(response.data);
        setDetailLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load archive detail');
        setDetailLoading(false);
      });
  }, [leagueId]);

  const clearDetail = useCallback(() => {
    setDetail(null);
  }, []);

  return { seasons, isLoading, error, detail, detailLoading, fetchDetail, clearDetail };
}
