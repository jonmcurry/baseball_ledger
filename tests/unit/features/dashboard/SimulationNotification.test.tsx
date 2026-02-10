// @vitest-environment jsdom
/**
 * Tests for SimulationNotification component (REQ-SCH-007)
 */

import { render, screen, act } from '@testing-library/react';
import { SimulationNotification } from '@features/dashboard/SimulationNotification';

describe('SimulationNotification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when isVisible is false', () => {
    const { container } = render(
      <SimulationNotification
        daysSimulated={7}
        gamesCompleted={28}
        isVisible={false}
        onDismiss={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders typewriter text with single-day message', () => {
    render(
      <SimulationNotification
        daysSimulated={1}
        gamesCompleted={4}
        isVisible={true}
        onDismiss={vi.fn()}
      />,
    );

    // Advance timers enough for full text to appear
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByRole('status')).toBeInTheDocument();
    // Single day message should contain "complete" and game count
    const statusEl = screen.getByRole('status');
    expect(statusEl.textContent).toContain('complete');
    expect(statusEl.textContent).toContain('4');
  });

  it('renders typewriter text with multi-day message', () => {
    render(
      <SimulationNotification
        daysSimulated={7}
        gamesCompleted={28}
        isVisible={true}
        onDismiss={vi.fn()}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    const statusEl = screen.getByRole('status');
    expect(statusEl.textContent).toContain('7 days');
    expect(statusEl.textContent).toContain('28');
  });

  it('calls onDismiss after typewriter completes and delay', () => {
    const onDismiss = vi.fn();
    render(
      <SimulationNotification
        daysSimulated={1}
        gamesCompleted={4}
        isVisible={true}
        onDismiss={onDismiss}
      />,
    );

    // Advance enough for typewriter to complete (message ~30 chars * 40ms = 1200ms)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // onDismiss should not fire immediately after typewriter
    expect(onDismiss).not.toHaveBeenCalled();

    // Advance past the auto-dismiss delay (4 seconds)
    act(() => {
      vi.advanceTimersByTime(4100);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows game count in message', () => {
    render(
      <SimulationNotification
        daysSimulated={30}
        gamesCompleted={120}
        isVisible={true}
        onDismiss={vi.fn()}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    const statusEl = screen.getByRole('status');
    expect(statusEl.textContent).toContain('120');
  });
});
