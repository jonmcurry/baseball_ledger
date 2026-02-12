/**
 * ConfirmDialog
 *
 * Modal overlay for confirming destructive actions.
 * REQ-COMP-012: Focus trapping via useFocusTrap hook.
 *
 * Layer 6: Presentational component.
 */

import { useRef } from 'react';
import { useFocusTrap } from '@hooks/useFocusTrap';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}: ConfirmDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, isOpen, onCancel);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div ref={containerRef} className="w-full max-w-md rounded-card border border-sandstone bg-old-lace p-gutter-lg shadow-ledger">
        <h3 id="confirm-dialog-title" className="font-headline text-lg font-bold text-ink">
          {title}
        </h3>
        <p id="confirm-dialog-message" className="mt-2 text-sm text-muted">
          {message}
        </p>
        <div className="mt-gutter-lg flex justify-end gap-gutter">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-button border border-sandstone px-4 py-2 text-sm font-medium text-ink hover:bg-sandstone/20"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-button bg-stitch-red px-4 py-2 text-sm font-medium text-ink hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
