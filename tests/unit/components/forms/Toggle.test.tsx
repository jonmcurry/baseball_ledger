// @vitest-environment jsdom
/**
 * Tests for Toggle component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toggle } from '@components/forms/Toggle';

describe('Toggle', () => {
  it('renders with label', () => {
    render(<Toggle checked={false} onChange={() => {}} label="Enable injuries" />);
    expect(screen.getByText('Enable injuries')).toBeInTheDocument();
  });

  it('reflects checked state via aria-checked', () => {
    render(<Toggle checked={true} onChange={() => {}} label="Enable injuries" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange when clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Toggle checked={false} onChange={handleChange} label="Enable injuries" />);

    await user.click(screen.getByRole('switch'));
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Toggle checked={false} onChange={() => {}} label="Enable injuries" disabled />);
    expect(screen.getByRole('switch')).toBeDisabled();
  });
});
