// @vitest-environment jsdom
/**
 * Tests for HeadlineInterrupt component
 */

import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeadlineInterrupt } from '@components/feedback/HeadlineInterrupt';

describe('HeadlineInterrupt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when isVisible is false', () => {
    const { container } = render(
      <HeadlineInterrupt headline="Champions!" isVisible={false} onDismiss={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders headline text when isVisible is true', () => {
    render(
      <HeadlineInterrupt headline="Yankees Win!" isVisible={true} onDismiss={() => {}} />,
    );
    expect(screen.getByText('Yankees Win!')).toBeInTheDocument();
  });

  it('renders subheadline when provided', () => {
    render(
      <HeadlineInterrupt
        headline="Champions!"
        subheadline="A dynasty continues"
        isVisible={true}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByText('A dynasty continues')).toBeInTheDocument();
  });

  it('does not render subheadline when not provided', () => {
    render(
      <HeadlineInterrupt headline="Champions!" isVisible={true} onDismiss={() => {}} />,
    );
    expect(screen.queryByText('A dynasty continues')).not.toBeInTheDocument();
  });

  it('renders with role="alert"', () => {
    render(
      <HeadlineInterrupt headline="Champions!" isVisible={true} onDismiss={() => {}} />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders "Stop the Presses" label', () => {
    render(
      <HeadlineInterrupt headline="Champions!" isVisible={true} onDismiss={() => {}} />,
    );
    expect(screen.getByText('Stop the Presses')).toBeInTheDocument();
  });

  it('calls onDismiss after autoHideMs', () => {
    const handleDismiss = vi.fn();
    render(
      <HeadlineInterrupt
        headline="Champions!"
        isVisible={true}
        onDismiss={handleDismiss}
        autoHideMs={3000}
      />,
    );
    expect(handleDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when overlay is clicked', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const handleDismiss = vi.fn();
    render(
      <HeadlineInterrupt
        headline="Champions!"
        isVisible={true}
        onDismiss={handleDismiss}
        autoHideMs={99999}
      />,
    );
    await user.click(screen.getByRole('alert'));
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('cleans up timer on unmount', () => {
    const handleDismiss = vi.fn();
    const { unmount } = render(
      <HeadlineInterrupt
        headline="Champions!"
        isVisible={true}
        onDismiss={handleDismiss}
        autoHideMs={5000}
      />,
    );
    unmount();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(handleDismiss).not.toHaveBeenCalled();
  });

  it('uses default autoHideMs of 4000', () => {
    const handleDismiss = vi.fn();
    render(
      <HeadlineInterrupt headline="Champions!" isVisible={true} onDismiss={handleDismiss} />,
    );
    act(() => {
      vi.advanceTimersByTime(3999);
    });
    expect(handleDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });
});
