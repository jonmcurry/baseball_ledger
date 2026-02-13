// @vitest-environment jsdom
/**
 * Tests for ReplayControls component.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReplayControls } from '../../../../src/features/game-viewer/ReplayControls';
import type { ReplaySpeed } from '../../../../src/features/game-viewer/ReplayControls';

const defaultProps = {
  currentPlay: 10,
  totalPlays: 50,
  isPlaying: false,
  speed: '2x' as ReplaySpeed,
  onTogglePlay: vi.fn(),
  onSpeedChange: vi.fn(),
  onSkipToEnd: vi.fn(),
  onExit: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ReplayControls', () => {
  it('renders progress text', () => {
    render(<ReplayControls {...defaultProps} />);
    expect(screen.getByText('10 / 50')).toBeInTheDocument();
  });

  it('renders speed buttons', () => {
    render(<ReplayControls {...defaultProps} />);
    expect(screen.getByText('1x')).toBeInTheDocument();
    expect(screen.getByText('2x')).toBeInTheDocument();
    expect(screen.getByText('5x')).toBeInTheDocument();
    expect(screen.getByText('Max')).toBeInTheDocument();
  });

  it('calls onTogglePlay when play button clicked', async () => {
    const onTogglePlay = vi.fn();
    render(<ReplayControls {...defaultProps} onTogglePlay={onTogglePlay} />);
    await userEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(onTogglePlay).toHaveBeenCalledOnce();
  });

  it('shows pause label when playing', () => {
    render(<ReplayControls {...defaultProps} isPlaying={true} />);
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('shows restart label when complete', () => {
    render(<ReplayControls {...defaultProps} currentPlay={50} totalPlays={50} />);
    expect(screen.getByRole('button', { name: /restart/i })).toBeInTheDocument();
  });

  it('calls onSpeedChange when speed button clicked', async () => {
    const onSpeedChange = vi.fn();
    render(<ReplayControls {...defaultProps} onSpeedChange={onSpeedChange} />);
    await userEvent.click(screen.getByText('5x'));
    expect(onSpeedChange).toHaveBeenCalledWith('5x');
  });

  it('calls onSkipToEnd when skip clicked', async () => {
    const onSkipToEnd = vi.fn();
    render(<ReplayControls {...defaultProps} onSkipToEnd={onSkipToEnd} />);
    await userEvent.click(screen.getByText('Skip'));
    expect(onSkipToEnd).toHaveBeenCalledOnce();
  });

  it('calls onExit when exit clicked', async () => {
    const onExit = vi.fn();
    render(<ReplayControls {...defaultProps} onExit={onExit} />);
    await userEvent.click(screen.getByText('Exit'));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('renders progress bar with correct width', () => {
    const { container } = render(<ReplayControls {...defaultProps} currentPlay={25} totalPlays={50} />);
    const progressBar = container.querySelector('[style*="width"]');
    expect(progressBar).toBeTruthy();
    expect((progressBar as HTMLElement).style.width).toBe('50%');
  });

  it('has toolbar role', () => {
    render(<ReplayControls {...defaultProps} />);
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });
});
