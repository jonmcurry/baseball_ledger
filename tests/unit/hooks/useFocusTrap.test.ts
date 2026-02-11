// @vitest-environment jsdom
/**
 * Tests for useFocusTrap hook
 *
 * REQ-COMP-012: WCAG 2.1 AA focus management -- focus trapping within modals.
 */

import { renderHook } from '@testing-library/react';
import { useFocusTrap } from '@hooks/useFocusTrap';

function createContainer(): HTMLDivElement {
  const container = document.createElement('div');
  const btn1 = document.createElement('button');
  btn1.textContent = 'First';
  const btn2 = document.createElement('button');
  btn2.textContent = 'Second';
  const btn3 = document.createElement('button');
  btn3.textContent = 'Third';
  container.appendChild(btn1);
  container.appendChild(btn2);
  container.appendChild(btn3);
  document.body.appendChild(container);
  return container;
}

describe('useFocusTrap', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('focuses first focusable element when opened', () => {
    const ref = { current: container };
    const onClose = vi.fn();

    renderHook(() => useFocusTrap(ref, true, onClose));

    expect(document.activeElement).toBe(container.querySelector('button'));
  });

  it('restores previous focus when closed', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    const ref = { current: container };
    const onClose = vi.fn();

    const { rerender } = renderHook(
      ({ isOpen }) => useFocusTrap(ref, isOpen, onClose),
      { initialProps: { isOpen: true } },
    );

    expect(document.activeElement).toBe(container.querySelector('button'));

    rerender({ isOpen: false });

    expect(document.activeElement).toBe(trigger);
    document.body.removeChild(trigger);
  });

  it('calls onClose when Escape is pressed', () => {
    const ref = { current: container };
    const onClose = vi.fn();

    renderHook(() => useFocusTrap(ref, true, onClose));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('wraps Tab from last to first focusable element', () => {
    const ref = { current: container };
    const onClose = vi.fn();
    const buttons = container.querySelectorAll('button');

    renderHook(() => useFocusTrap(ref, true, onClose));

    // Focus the last button
    (buttons[2] as HTMLButtonElement).focus();
    expect(document.activeElement).toBe(buttons[2]);

    // Press Tab on last element
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
    document.dispatchEvent(event);

    expect(document.activeElement).toBe(buttons[0]);
  });

  it('wraps Shift+Tab from first to last focusable element', () => {
    const ref = { current: container };
    const onClose = vi.fn();
    const buttons = container.querySelectorAll('button');

    renderHook(() => useFocusTrap(ref, true, onClose));

    // Focus is already on first button from the hook
    expect(document.activeElement).toBe(buttons[0]);

    // Press Shift+Tab on first element
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true });
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
    document.dispatchEvent(event);

    expect(document.activeElement).toBe(buttons[2]);
  });
});
