/**
 * Input
 *
 * Text input with label, error state, and aria-describedby for validation.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import { useId } from 'react';

export interface InputProps {
  value: string;
  onChange: (value: string) => void;
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'url';
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  onBlur?: () => void;
}

export function Input({
  value,
  onChange,
  name,
  label,
  type = 'text',
  placeholder,
  disabled = false,
  error,
  onBlur,
}: InputProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-button border px-3 py-2 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ballpark/50 disabled:opacity-40 disabled:cursor-not-allowed ${
          error ? 'border-stitch-red' : 'border-sandstone'
        }`}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-stitch-red">
          {error}
        </p>
      )}
    </div>
  );
}

export default Input;
