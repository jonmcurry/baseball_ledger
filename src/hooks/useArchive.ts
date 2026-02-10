/**
 * useArchive Hook
 *
 * Fetches archived seasons for a given league.
 *
 * Layer 5: Hook. Fetches data. Does not import components.
 */

import { useState, useEffect } from 'react';
import { apiGet } from '@services/api-client';

export interface ArchivedSeasonData {
  readonly id: string;
  readonly seasonNumber: number;
  readonly champion: string | null;
  readonly createdAt: string;
}

interface UseArchiveReturn {
  seasons: ArchivedSeasonData[];
  isLoading: boolean;
  error: string | null;
}

export function useArchive(leagueId: string): UseArchiveReturn {
  const [seasons, setSeasons] = useState<ArchivedSeasonData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return { seasons, isLoading, error };
}
