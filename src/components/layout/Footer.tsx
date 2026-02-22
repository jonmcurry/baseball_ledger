/**
 * Footer
 *
 * Minimal editorial footer with thin rule divider.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

export function Footer() {
  return (
    <footer
      role="contentinfo"
      className="border-t border-[var(--border-default)] px-gutter py-6 text-center"
    >
      <span className="font-body text-xs tracking-widest uppercase text-[var(--text-tertiary)]">
        Copyright 2026 &mdash; Ledger Baseball
      </span>
    </footer>
  );
}

export default Footer;
