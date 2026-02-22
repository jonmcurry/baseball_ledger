/**
 * TabularData
 *
 * Wraps a table with `.stat-table` class and monospace font for aligned
 * numerical columns. Optionally renders a caption element.
 *
 * Layer 6: Presentational component.
 */

import type { ReactNode } from 'react';

export interface TabularDataProps {
  children: ReactNode;
  caption?: string;
  className?: string;
}

export function TabularData({ children, caption, className = '' }: TabularDataProps) {
  return (
    <table className={`stat-table w-full ${className}`.trim()} role="table">
      {caption && <caption className="sr-only">{caption}</caption>}
      {children}
    </table>
  );
}

export default TabularData;
