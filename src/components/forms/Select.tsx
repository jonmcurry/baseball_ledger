/**
 * Select
 *
 * Dropdown select with label and error state.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import { useId } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  name: string;
  label: string;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

export function Select({
  value,
  onChange,
  options,
  name,
  label,
  disabled = false,
  error,
  placeholder,
}: SelectProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-button border bg-old-lace px-3 py-2 font-body text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ballpark/50 disabled:opacity-40 disabled:cursor-not-allowed ${
          error ? 'border-stitch-red' : 'border-sandstone'
        }`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-stitch-red">
          {error}
        </p>
      )}
    </div>
  );
}

export default Select;
