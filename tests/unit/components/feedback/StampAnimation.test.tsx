// @vitest-environment jsdom
/**
 * Tests for StampAnimation
 *
 * REQ-SCH-009: Season completed stamp animation.
 * REQ-COMP-011: CSS animation patterns.
 */

import { render, screen } from '@testing-library/react';
import { StampAnimation } from '@components/feedback/StampAnimation';

describe('StampAnimation', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(<StampAnimation isVisible={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders default text when visible', () => {
    render(<StampAnimation isVisible={true} />);
    expect(screen.getByText('SEASON COMPLETED')).toBeInTheDocument();
  });

  it('renders custom text when provided', () => {
    render(<StampAnimation isVisible={true} text="WORLD SERIES" />);
    expect(screen.getByText('WORLD SERIES')).toBeInTheDocument();
  });

  it('applies stamp-animation-text class for CSS animation', () => {
    render(<StampAnimation isVisible={true} />);
    const textEl = screen.getByText('SEASON COMPLETED');
    expect(textEl.className).toContain('stamp-animation-text');
  });

  it('has accessible role=status for screen readers', () => {
    render(<StampAnimation isVisible={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
