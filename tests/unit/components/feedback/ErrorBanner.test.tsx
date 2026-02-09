// @vitest-environment jsdom
/**
 * Tests for ErrorBanner component
 *
 * REQ-COMP-001: Severity-based alert banner with auto-dismiss.
 */

import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBanner } from '@components/feedback/ErrorBanner';

describe('ErrorBanner', () => {
  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  it('renders the message text', () => {
    render(<ErrorBanner severity="error" message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders with role="alert" for error severity', () => {
    render(<ErrorBanner severity="error" message="Error occurred" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders with role="status" for warning severity', () => {
    render(<ErrorBanner severity="warning" message="Warning issued" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders with role="status" for info severity', () => {
    render(<ErrorBanner severity="info" message="Info notice" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Severity styling
  // ---------------------------------------------------------------------------

  it('applies error styling class for error severity', () => {
    render(<ErrorBanner severity="error" message="Error" />);
    const banner = screen.getByRole('alert');
    expect(banner.className).toContain('stitch-red');
  });

  it('applies warning styling for warning severity', () => {
    render(<ErrorBanner severity="warning" message="Warning" />);
    const banner = screen.getByRole('status');
    expect(banner.className).toContain('amber');
  });

  it('applies info styling for info severity', () => {
    render(<ErrorBanner severity="info" message="Info" />);
    const banner = screen.getByRole('status');
    expect(banner.className).toContain('ballpark');
  });

  // ---------------------------------------------------------------------------
  // Dismiss button
  // ---------------------------------------------------------------------------

  it('renders dismiss button when onDismiss is provided', () => {
    const onDismiss = vi.fn();
    render(<ErrorBanner severity="error" message="Error" onDismiss={onDismiss} />);
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });

  it('does not render dismiss button when onDismiss is not provided', () => {
    render(<ErrorBanner severity="error" message="Error" />);
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<ErrorBanner severity="error" message="Error" onDismiss={onDismiss} />);

    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Auto-dismiss
  // ---------------------------------------------------------------------------

  it('auto-dismisses after specified milliseconds', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(
      <ErrorBanner
        severity="info"
        message="Auto dismiss"
        onDismiss={onDismiss}
        autoDismissMs={3000}
      />,
    );

    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('does not auto-dismiss without autoDismissMs', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<ErrorBanner severity="info" message="No auto" onDismiss={onDismiss} />);

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('does not auto-dismiss without onDismiss callback', () => {
    vi.useFakeTimers();
    // Should not throw even without onDismiss
    render(<ErrorBanner severity="info" message="No callback" autoDismissMs={3000} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    // No error means pass
    vi.useRealTimers();
  });

  it('clears auto-dismiss timer on unmount', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const { unmount } = render(
      <ErrorBanner
        severity="info"
        message="Cleanup"
        onDismiss={onDismiss}
        autoDismissMs={3000}
      />,
    );

    unmount();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Accessibility
  // ---------------------------------------------------------------------------

  it('has accessible severity label', () => {
    render(<ErrorBanner severity="error" message="A11y check" />);
    const banner = screen.getByRole('alert');
    expect(banner).toHaveAttribute('aria-live', 'assertive');
  });

  it('warning and info use polite aria-live', () => {
    const { rerender } = render(
      <ErrorBanner severity="warning" message="Warning" />,
    );
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');

    rerender(<ErrorBanner severity="info" message="Info" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
