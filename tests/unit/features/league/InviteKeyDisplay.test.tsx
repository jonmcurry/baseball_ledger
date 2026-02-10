// @vitest-environment jsdom
/**
 * Tests for InviteKeyDisplay (REQ-LGE-003)
 *
 * Shows invite key with copy-to-clipboard button.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { InviteKeyDisplay } from '@features/league/InviteKeyDisplay';

describe('InviteKeyDisplay', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('displays the invite key', () => {
    render(<InviteKeyDisplay inviteKey="INV-ABC-123" />);
    expect(screen.getByText('INV-ABC-123')).toBeInTheDocument();
  });

  it('has a copy button', () => {
    render(<InviteKeyDisplay inviteKey="INV-ABC-123" />);
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('copies invite key to clipboard when copy button is clicked', async () => {
    render(<InviteKeyDisplay inviteKey="INV-ABC-123" />);
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('INV-ABC-123');
  });

  it('renders with stat font styling', () => {
    render(<InviteKeyDisplay inviteKey="INV-ABC-123" />);
    const keyEl = screen.getByText('INV-ABC-123');
    expect(keyEl.className).toContain('font-stat');
  });
});
