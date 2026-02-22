/**
 * Colophon
 *
 * Newspaper-style footer for the broadsheet layout.
 * Replaces the minimal Footer component.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

export function Colophon() {
  const year = new Date().getFullYear();
  return (
    <footer className="colophon" role="contentinfo">
      Baseball Ledger -- Tabletop Baseball Simulation -- Est. 2024 -- {year}
    </footer>
  );
}

export default Colophon;
