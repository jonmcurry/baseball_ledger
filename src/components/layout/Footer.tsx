/**
 * Footer
 *
 * Simple footer with app name and role="contentinfo".
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

export function Footer() {
  return (
    <footer
      role="contentinfo"
      className="border-t border-[var(--border-subtle)] px-gutter py-3 text-center text-xs text-[var(--text-tertiary)]"
    >
      Baseball Ledger -- APBA Baseball Simulation
    </footer>
  );
}

export default Footer;
