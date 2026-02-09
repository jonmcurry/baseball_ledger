// @vitest-environment jsdom
/**
 * Tests for BaseIndicator component
 *
 * SVG diamond showing base runner positions.
 */

import { render, screen } from '@testing-library/react';
import { BaseIndicator } from '@components/baseball/BaseIndicator';

describe('BaseIndicator', () => {
  it('renders an SVG with role="img"', () => {
    render(<BaseIndicator first={false} second={false} third={false} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('has descriptive aria-label with no runners', () => {
    render(<BaseIndicator first={false} second={false} third={false} />);
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      'Bases empty',
    );
  });

  it('has descriptive aria-label with runner on first', () => {
    render(<BaseIndicator first={true} second={false} third={false} />);
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      'Runner on first',
    );
  });

  it('has descriptive aria-label with runners on first and third', () => {
    render(<BaseIndicator first={true} second={false} third={true} />);
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      'Runners on first, third',
    );
  });

  it('has descriptive aria-label with bases loaded', () => {
    render(<BaseIndicator first={true} second={true} third={true} />);
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      'Bases loaded',
    );
  });

  it('renders three base diamond shapes', () => {
    render(<BaseIndicator first={false} second={false} third={false} />);
    const svg = screen.getByRole('img');
    const diamonds = svg.querySelectorAll('[data-base]');
    expect(diamonds).toHaveLength(3);
  });

  it('uses filled style for occupied bases', () => {
    render(<BaseIndicator first={true} second={false} third={false} />);
    const svg = screen.getByRole('img');
    const firstBase = svg.querySelector('[data-base="first"]');
    expect(firstBase?.getAttribute('class')).toContain('fill-ballpark');
  });

  it('uses empty style for unoccupied bases', () => {
    render(<BaseIndicator first={false} second={false} third={false} />);
    const svg = screen.getByRole('img');
    const firstBase = svg.querySelector('[data-base="first"]');
    expect(firstBase?.getAttribute('class')).toContain('fill-sandstone');
  });
});
