// @vitest-environment jsdom
/**
 * Tests for LeaderLine component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeaderLine } from '@components/typography/LeaderLine';

describe('LeaderLine', () => {
  it('renders label text', () => {
    render(<LeaderLine label="Roster" value="I" />);
    expect(screen.getByText('Roster')).toBeInTheDocument();
  });

  it('renders value text', () => {
    render(<LeaderLine label="Roster" value="I" />);
    expect(screen.getByText('I')).toBeInTheDocument();
  });

  it('renders dots separator', () => {
    const { container } = render(<LeaderLine label="Roster" value="I" />);
    const dots = container.querySelector('.leader-line-dots');
    expect(dots).not.toBeNull();
  });

  it('renders as a button when onClick is provided', () => {
    render(<LeaderLine label="Roster" value="I" onClick={() => {}} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders as a span when onClick is not provided', () => {
    const { container } = render(<LeaderLine label="Roster" value="I" />);
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('span.leader-line')).not.toBeNull();
  });

  it('calls onClick when button is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<LeaderLine label="Roster" value="I" onClick={handleClick} />);
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies leader-line class', () => {
    const { container } = render(<LeaderLine label="Roster" value="I" />);
    const root = container.querySelector('.leader-line');
    expect(root).not.toBeNull();
  });

  it('applies leader-line-label class to label', () => {
    const { container } = render(<LeaderLine label="Roster" value="I" />);
    const label = container.querySelector('.leader-line-label');
    expect(label?.textContent).toBe('Roster');
  });

  it('applies leader-line-value class to value', () => {
    const { container } = render(<LeaderLine label="Roster" value="I" />);
    const val = container.querySelector('.leader-line-value');
    expect(val?.textContent).toBe('I');
  });

  it('accepts custom className', () => {
    const { container } = render(
      <LeaderLine label="Test" value="X" className="my-custom" />,
    );
    const root = container.querySelector('.leader-line');
    expect(root?.className).toContain('my-custom');
  });
});
