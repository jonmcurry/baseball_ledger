/**
 * Toggle
 *
 * Accessible switch component with vintage styling.
 * Uses role="switch" with aria-checked for screen reader support.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import { useId } from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: ToggleProps) {
  const id = useId();

  return (
    <div className="flex items-center gap-gutter">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ballpark/50 disabled:opacity-40 disabled:cursor-not-allowed ${
          checked ? 'bg-ballpark' : 'bg-sandstone'
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-4 w-4 transform rounded-full bg-old-lace shadow-sm transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <label htmlFor={id} className="text-sm text-ink cursor-pointer">
        {label}
      </label>
    </div>
  );
}
