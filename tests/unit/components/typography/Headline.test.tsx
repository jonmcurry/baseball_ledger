// @vitest-environment jsdom
/**
 * Tests for Headline component
 */

import { render, screen } from '@testing-library/react';
import { Headline } from '@components/typography/Headline';

describe('Headline', () => {
  it('renders children text', () => {
    render(<Headline>Season Standings</Headline>);
    expect(screen.getByText('Season Standings')).toBeInTheDocument();
  });

  it('renders as h2 by default', () => {
    render(<Headline>Title</Headline>);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('renders as h3 when level=3', () => {
    render(<Headline level={3}>Subtitle</Headline>);
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });

  it('renders as h4 when level=4', () => {
    render(<Headline level={4}>Division</Headline>);
    expect(screen.getByRole('heading', { level: 4 })).toBeInTheDocument();
  });

  it('applies pennant-header class for section variant (default)', () => {
    const { container } = render(<Headline>Title</Headline>);
    const h = container.querySelector('h2');
    expect(h?.className).toContain('pennant-header');
  });

  it('applies broadsheet-breakout class for breakout variant', () => {
    const { container } = render(<Headline variant="breakout">Breaking News</Headline>);
    const h = container.querySelector('h2');
    expect(h?.className).toContain('broadsheet-breakout');
  });

  it('does not apply pennant-header when variant is breakout', () => {
    const { container } = render(<Headline variant="breakout">Title</Headline>);
    const h = container.querySelector('h2');
    expect(h?.className).not.toContain('pennant-header');
  });

  it('accepts custom className', () => {
    const { container } = render(<Headline className="text-3xl">Title</Headline>);
    const h = container.querySelector('h2');
    expect(h?.className).toContain('text-3xl');
  });
});
