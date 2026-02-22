// @vitest-environment jsdom
/**
 * Tests for TabularData component
 */

import { render, screen } from '@testing-library/react';
import { TabularData } from '@components/typography/TabularData';

describe('TabularData', () => {
  it('renders a table element', () => {
    render(
      <TabularData>
        <thead><tr><th>Col</th></tr></thead>
      </TabularData>,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('applies stat-table class', () => {
    render(
      <TabularData>
        <thead><tr><th>Col</th></tr></thead>
      </TabularData>,
    );
    const table = screen.getByRole('table');
    expect(table.className).toContain('stat-table');
  });

  it('renders caption when provided', () => {
    render(
      <TabularData caption="Batting Leaders">
        <thead><tr><th>Player</th></tr></thead>
      </TabularData>,
    );
    const caption = screen.getByRole('table').querySelector('caption');
    expect(caption).not.toBeNull();
    expect(caption?.textContent).toBe('Batting Leaders');
  });

  it('does not render caption when not provided', () => {
    render(
      <TabularData>
        <thead><tr><th>Player</th></tr></thead>
      </TabularData>,
    );
    const caption = screen.getByRole('table').querySelector('caption');
    expect(caption).toBeNull();
  });

  it('caption has sr-only class for accessibility', () => {
    render(
      <TabularData caption="Stats">
        <thead><tr><th>Player</th></tr></thead>
      </TabularData>,
    );
    const caption = screen.getByRole('table').querySelector('caption');
    expect(caption?.className).toContain('sr-only');
  });

  it('renders children inside the table', () => {
    render(
      <TabularData>
        <tbody><tr><td>Babe Ruth</td></tr></tbody>
      </TabularData>,
    );
    expect(screen.getByText('Babe Ruth')).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(
      <TabularData className="max-w-3xl">
        <thead><tr><th>Col</th></tr></thead>
      </TabularData>,
    );
    const table = screen.getByRole('table');
    expect(table.className).toContain('max-w-3xl');
  });
});
