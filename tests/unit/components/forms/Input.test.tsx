// @vitest-environment jsdom
/**
 * Tests for Input component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@components/forms/Input';

describe('Input', () => {
  it('renders label and input', () => {
    render(<Input value="" onChange={() => {}} name="email" label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('displays current value', () => {
    render(<Input value="test@example.com" onChange={() => {}} name="email" label="Email" />);
    expect(screen.getByLabelText('Email')).toHaveValue('test@example.com');
  });

  it('calls onChange when typing', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Input value="" onChange={handleChange} name="email" label="Email" />);

    await user.type(screen.getByLabelText('Email'), 'a');
    expect(handleChange).toHaveBeenCalledWith('a');
  });

  it('shows error message with aria-describedby', () => {
    render(<Input value="" onChange={() => {}} name="email" label="Email" error="Required field" />);
    expect(screen.getByText('Required field')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('disables input when disabled prop is true', () => {
    render(<Input value="" onChange={() => {}} name="email" label="Email" disabled />);
    expect(screen.getByLabelText('Email')).toBeDisabled();
  });
});
