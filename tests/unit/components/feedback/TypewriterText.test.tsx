// @vitest-environment jsdom
/**
 * Tests for TypewriterText component
 *
 * Character-by-character text reveal with blinking cursor.
 */

import { render, screen, act } from '@testing-library/react';
import { TypewriterText } from '@components/feedback/TypewriterText';

describe('TypewriterText', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with empty visible text', () => {
    render(<TypewriterText text="Hello" />);
    const el = screen.getByRole('status');
    // Should not show full text immediately
    expect(el.textContent).not.toBe('Hello');
  });

  it('reveals text character by character', () => {
    render(<TypewriterText text="ABC" speed={50} />);

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(screen.getByRole('status').textContent).toContain('A');

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(screen.getByRole('status').textContent).toContain('AB');

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(screen.getByRole('status').textContent).toContain('ABC');
  });

  it('uses default speed of 40ms', () => {
    render(<TypewriterText text="XY" />);

    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(screen.getByRole('status').textContent).toContain('X');

    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(screen.getByRole('status').textContent).toContain('XY');
  });

  it('calls onComplete when text is fully revealed', () => {
    const onComplete = vi.fn();
    render(<TypewriterText text="Hi" speed={50} onComplete={onComplete} />);

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not call onComplete if not provided', () => {
    // Should not throw
    render(<TypewriterText text="Hi" speed={50} />);

    act(() => {
      vi.advanceTimersByTime(200);
    });
  });

  it('renders blinking cursor element', () => {
    render(<TypewriterText text="Test" />);
    const cursor = screen.getByRole('status').querySelector('[data-cursor]');
    expect(cursor).toBeInTheDocument();
  });

  it('has aria-live="polite"', () => {
    render(<TypewriterText text="Accessible" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('cleans up interval on unmount', () => {
    const onComplete = vi.fn();
    const { unmount } = render(
      <TypewriterText text="Long text here" speed={50} onComplete={onComplete} />,
    );

    act(() => {
      vi.advanceTimersByTime(50);
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    // onComplete should not be called after unmount
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('handles empty text gracefully', () => {
    const onComplete = vi.fn();
    render(<TypewriterText text="" speed={50} onComplete={onComplete} />);

    // Should complete immediately or after first tick
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('resets when text prop changes', () => {
    const { rerender } = render(<TypewriterText text="First" speed={50} />);

    act(() => {
      vi.advanceTimersByTime(250); // Reveal all of "First"
    });
    expect(screen.getByRole('status').textContent).toContain('First');

    rerender(<TypewriterText text="New" speed={50} />);

    // Should restart animation with new text
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(screen.getByRole('status').textContent).toContain('N');
    expect(screen.getByRole('status').textContent).not.toContain('First');
  });
});
