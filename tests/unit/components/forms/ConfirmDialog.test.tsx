// @vitest-environment jsdom
/**
 * Tests for ConfirmDialog component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '@components/forms/ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Drop Player',
    message: 'Are you sure you want to drop this player?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('uses alertdialog role for destructive confirmations (REQ-COMP-012)', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(<ConfirmDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Drop Player')).not.toBeInTheDocument();
  });

  it('renders title and message when open', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Drop Player')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to drop this player?')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    await user.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel on Escape key', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('traps focus within dialog on Tab wrap', () => {
    render(<ConfirmDialog {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    const lastButton = buttons[buttons.length - 1];

    lastButton.focus();

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
    document.dispatchEvent(event);

    expect(document.activeElement).toBe(buttons[0]);
  });

  it('restores focus to trigger element on close', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Open';
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(<ConfirmDialog {...defaultProps} isOpen={true} />);

    const dialogButtons = screen.getAllByRole('button');
    expect(dialogButtons).toContain(document.activeElement);

    rerender(<ConfirmDialog {...defaultProps} isOpen={false} />);

    expect(document.activeElement).toBe(trigger);
    document.body.removeChild(trigger);
  });
});
