/**
 * usePageTitle
 *
 * REQ-COMP-013: Sets document.title with "Page | Baseball Ledger" format.
 * Restores previous title on unmount.
 *
 * Layer 5: Hook. No store or component imports.
 */

import { useEffect, useRef } from 'react';

const SUFFIX = 'Baseball Ledger';

export function usePageTitle(title: string): void {
  const previousTitle = useRef(document.title);

  useEffect(() => {
    document.title = `${title} | ${SUFFIX}`;
    return () => {
      document.title = previousTitle.current;
    };
  }, [title]);
}
