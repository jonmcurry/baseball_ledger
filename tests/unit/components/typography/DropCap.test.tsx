// @vitest-environment jsdom
/**
 * Tests for DropCap component
 */

import { render, screen } from '@testing-library/react';
import { DropCap } from '@components/typography/DropCap';

describe('DropCap', () => {
  it('renders children text', () => {
    render(<DropCap>Albert Pujols was born in Santo Domingo.</DropCap>);
    expect(screen.getByText(/Albert Pujols/)).toBeInTheDocument();
  });

  it('applies drop-cap class', () => {
    const { container } = render(<DropCap>Test text.</DropCap>);
    const p = container.querySelector('p');
    expect(p?.className).toContain('drop-cap');
  });

  it('applies font-body class', () => {
    const { container } = render(<DropCap>Test text.</DropCap>);
    const p = container.querySelector('p');
    expect(p?.className).toContain('font-body');
  });

  it('renders as a <p> element', () => {
    const { container } = render(<DropCap>Test text.</DropCap>);
    expect(container.querySelector('p')).not.toBeNull();
  });

  it('accepts custom className', () => {
    const { container } = render(<DropCap className="mt-4">Test text.</DropCap>);
    const p = container.querySelector('p');
    expect(p?.className).toContain('mt-4');
  });
});
