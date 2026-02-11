/**
 * InviteKeyDisplay
 *
 * Shows the league invite key with a copy-to-clipboard button (REQ-LGE-003).
 * Promoted to shared component per REQ-SCOPE-004 (used by league + dashboard).
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import { useState } from 'react';

export interface InviteKeyDisplayProps {
  inviteKey: string;
}

export function InviteKeyDisplay({ inviteKey }: InviteKeyDisplayProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(inviteKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-card border border-sandstone bg-old-lace/50 px-4 py-3">
      <div>
        <p className="text-xs font-medium text-muted">Invite Key</p>
        <p className="font-stat text-lg tracking-wide text-ink">{inviteKey}</p>
      </div>
      <button
        type="button"
        aria-label="Copy invite key"
        onClick={handleCopy}
        className="ml-auto rounded-button border border-sandstone px-3 py-1.5 text-xs font-medium text-ink hover:bg-sandstone/20"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export default InviteKeyDisplay;
