/**
 * DeleteLeagueButton
 *
 * Destructive action with typed-name confirmation (REQ-LGE-010).
 * User must type the exact league name to enable the confirm button.
 *
 * Layer 6: Presentational component with a service call on confirm.
 */

import { useState } from 'react';
import { deleteLeague } from '@services/league-service';

export interface DeleteLeagueButtonProps {
  leagueId: string;
  leagueName: string;
  onDeleted: () => void;
}

export function DeleteLeagueButton({
  leagueId,
  leagueName,
  onDeleted,
}: DeleteLeagueButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConfirm = confirmText === leagueName;

  function handleOpen() {
    setIsOpen(true);
    setConfirmText('');
    setError(null);
  }

  function handleCancel() {
    setIsOpen(false);
    setConfirmText('');
    setError(null);
  }

  async function handleConfirm() {
    if (!canConfirm) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteLeague(leagueId);
      setIsOpen(false);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete league');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Delete League"
        onClick={handleOpen}
        className="rounded-button border border-stitch-red px-4 py-2 text-sm font-medium text-stitch-red hover:bg-stitch-red/10"
      >
        Delete League
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancel();
          }}
        >
          <div className="w-full max-w-md rounded-card border border-[var(--border-default)] bg-[var(--surface-overlay)] p-gutter-lg shadow-ledger">
            <h3 className="font-headline text-lg font-bold text-stitch-red">
              Delete League
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              This action cannot be undone. Type <strong className="text-[var(--text-primary)]">{leagueName}</strong> to confirm.
            </p>

            <input
              type="text"
              placeholder="Type league name to confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-3 w-full rounded-button border border-[var(--border-default)] bg-[var(--surface-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
            />

            {error && (
              <p className="mt-2 text-xs text-stitch-red">{error}</p>
            )}

            <div className="mt-gutter-lg flex justify-end gap-gutter">
              <button
                type="button"
                aria-label="Cancel"
                onClick={handleCancel}
                className="rounded-button border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                aria-label="Confirm Delete"
                disabled={!canConfirm || isDeleting}
                onClick={handleConfirm}
                className="rounded-button bg-stitch-red px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DeleteLeagueButton;
