// @vitest-environment jsdom
/**
 * Tests for SimulationControls component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SimulationControls } from '@features/dashboard/SimulationControls';

describe('SimulationControls', () => {
  it('renders all four simulation buttons', () => {
    render(
      <SimulationControls isRunning={false} progressPct={0} onSimulate={vi.fn()} />,
    );
    expect(screen.getByText('Sim Day')).toBeInTheDocument();
    expect(screen.getByText('Sim Week')).toBeInTheDocument();
    expect(screen.getByText('Sim Month')).toBeInTheDocument();
    expect(screen.getByText('Sim Season')).toBeInTheDocument();
  });

  it('buttons are enabled when not running', () => {
    render(
      <SimulationControls isRunning={false} progressPct={0} onSimulate={vi.fn()} />,
    );
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).not.toBeDisabled();
    });
  });

  it('buttons are disabled when running', () => {
    render(
      <SimulationControls isRunning={true} progressPct={50} onSimulate={vi.fn()} />,
    );
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('calls onSimulate with "day" when Sim Day clicked', async () => {
    const user = userEvent.setup();
    const onSimulate = vi.fn();
    render(
      <SimulationControls isRunning={false} progressPct={0} onSimulate={onSimulate} />,
    );
    await user.click(screen.getByText('Sim Day'));
    expect(onSimulate).toHaveBeenCalledWith('day');
  });

  it('calls onSimulate with "week" when Sim Week clicked', async () => {
    const user = userEvent.setup();
    const onSimulate = vi.fn();
    render(
      <SimulationControls isRunning={false} progressPct={0} onSimulate={onSimulate} />,
    );
    await user.click(screen.getByText('Sim Week'));
    expect(onSimulate).toHaveBeenCalledWith('week');
  });

  it('calls onSimulate with "season" when Sim Season clicked', async () => {
    const user = userEvent.setup();
    const onSimulate = vi.fn();
    render(
      <SimulationControls isRunning={false} progressPct={0} onSimulate={onSimulate} />,
    );
    await user.click(screen.getByText('Sim Season'));
    expect(onSimulate).toHaveBeenCalledWith('season');
  });

  it('shows progress bar when running', () => {
    render(
      <SimulationControls isRunning={true} progressPct={65} onSimulate={vi.fn()} />,
    );
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute('aria-valuenow', '65');
  });

  it('hides progress bar when not running', () => {
    render(
      <SimulationControls isRunning={false} progressPct={0} onSimulate={vi.fn()} />,
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('displays progress percentage text', () => {
    render(
      <SimulationControls isRunning={true} progressPct={42} onSimulate={vi.fn()} />,
    );
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('locks to single-game mode during playoffs', () => {
    render(
      <SimulationControls isRunning={false} progressPct={0} onSimulate={vi.fn()} leagueStatus="playoffs" />,
    );
    expect(screen.getByText('Sim Day')).toBeInTheDocument();
    expect(screen.queryByText('Sim Week')).not.toBeInTheDocument();
    expect(screen.queryByText('Sim Month')).not.toBeInTheDocument();
    expect(screen.queryByText('Sim Season')).not.toBeInTheDocument();
  });

  it('shows playoff mode message during playoffs', () => {
    render(
      <SimulationControls isRunning={false} progressPct={0} onSimulate={vi.fn()} leagueStatus="playoffs" />,
    );
    expect(screen.getByText(/Playoff mode/)).toBeInTheDocument();
  });
});
