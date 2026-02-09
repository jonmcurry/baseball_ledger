// @vitest-environment jsdom
/**
 * Tests for Select component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from '@components/forms/Select';

const OPTIONS = [
  { value: '4', label: '4 Teams' },
  { value: '6', label: '6 Teams' },
  { value: '8', label: '8 Teams' },
] as const;

describe('Select', () => {
  it('renders label and options', () => {
    render(<Select value="4" onChange={() => {}} options={OPTIONS} name="teams" label="Team Count" />);
    expect(screen.getByLabelText('Team Count')).toBeInTheDocument();
    expect(screen.getByText('4 Teams')).toBeInTheDocument();
    expect(screen.getByText('8 Teams')).toBeInTheDocument();
  });

  it('calls onChange when selection changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Select value="4" onChange={handleChange} options={OPTIONS} name="teams" label="Team Count" />);

    await user.selectOptions(screen.getByLabelText('Team Count'), '8');
    expect(handleChange).toHaveBeenCalledWith('8');
  });

  it('shows error message', () => {
    render(
      <Select value="" onChange={() => {}} options={OPTIONS} name="teams" label="Team Count" error="Please select" />,
    );
    expect(screen.getByText('Please select')).toBeInTheDocument();
    expect(screen.getByLabelText('Team Count')).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders placeholder option', () => {
    render(
      <Select value="" onChange={() => {}} options={OPTIONS} name="teams" label="Team Count" placeholder="Choose..." />,
    );
    expect(screen.getByText('Choose...')).toBeInTheDocument();
  });
});
