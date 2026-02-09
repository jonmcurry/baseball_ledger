// @vitest-environment jsdom
/**
 * Tests for Pagination component
 *
 * Previous/Next page navigation with boundary handling.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from '@components/data-display/Pagination';

describe('Pagination', () => {
  it('renders current page and total pages', () => {
    render(
      <Pagination currentPage={3} totalPages={10} onPageChange={vi.fn()} />,
    );
    expect(screen.getByText(/3/)).toBeInTheDocument();
    expect(screen.getByText(/10/)).toBeInTheDocument();
  });

  it('has nav element with aria-label', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
  });

  it('renders Previous and Next buttons', () => {
    render(
      <Pagination currentPage={2} totalPages={5} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('disables Previous button on first page', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('disables Next button on last page', () => {
    render(
      <Pagination currentPage={5} totalPages={5} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('enables both buttons on middle page', () => {
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
  });

  it('calls onPageChange with page - 1 when Previous is clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />,
    );

    await user.click(screen.getByRole('button', { name: /previous/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange with page + 1 when Next is clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />,
    );

    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('disables all buttons when isDisabled is true', () => {
    render(
      <Pagination
        currentPage={3}
        totalPages={5}
        onPageChange={vi.fn()}
        isDisabled
      />,
    );
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('uses font-stat class for page numbers', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />,
    );
    const nav = screen.getByRole('navigation');
    expect(nav.querySelector('.font-stat')).toBeInTheDocument();
  });
});
