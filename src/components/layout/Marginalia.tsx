/**
 * Marginalia
 *
 * Right-side contextual column for the broadsheet layout.
 * Renders page-specific context passed as children.
 * Hidden on tablet and mobile (content moves inline via CSS).
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import type { ReactNode } from 'react';

export interface MarginaliaProps {
  children: ReactNode;
}

export function Marginalia({ children }: MarginaliaProps) {
  return <>{children}</>;
}

export default Marginalia;
