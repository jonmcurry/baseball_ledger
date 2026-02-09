/**
 * usePostseasonTheme Hook
 *
 * Manages the data-theme="postseason" attribute on <html> based on
 * league status. When status is 'playoffs', the postseason theme is applied.
 *
 * Layer 5: Hook. Composes stores. Does not import components.
 * REQ-COMP-002: Postseason theme variant.
 */

import { useEffect } from 'react';
import { useLeagueStore } from '@stores/leagueStore';

export function usePostseasonTheme() {
  const league = useLeagueStore((s) => s.league);
  const isPlayoffs = league?.status === 'playoffs';

  useEffect(() => {
    if (isPlayoffs) {
      document.documentElement.setAttribute('data-theme', 'postseason');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    return () => {
      document.documentElement.removeAttribute('data-theme');
    };
  }, [isPlayoffs]);

  return { isPlayoffs };
}
