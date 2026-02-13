/**
 * TradeEvaluationPanel
 *
 * Displays trade evaluation: recommendation badge, reasoning, value diff,
 * and per-player value breakdowns for transparency.
 * Template-first pattern with optional AI enhancement (REQ-AI-007).
 *
 * Layer 7: Feature composition. Composes hook + presentational elements.
 */

import type { TradeEvaluationRequest, PlayerBreakdown } from '@lib/types/ai';
import { useTradeEvaluation } from '@hooks/useTradeEvaluation';

export interface TradeEvaluationPanelProps {
  readonly request: TradeEvaluationRequest | null;
}

const BADGE_COLORS: Record<string, string> = {
  accept: 'bg-green-700 text-ink',
  reject: 'bg-red-800 text-ink',
  counter: 'bg-amber-700 text-ink',
};

const STYLE_LABELS: Record<string, string> = {
  conservative: 'Conservative',
  aggressive: 'Aggressive',
  balanced: 'Balanced',
  analytical: 'Analytical',
};

function BreakdownRow({ player }: { readonly player: PlayerBreakdown }) {
  const hasAdjustment = player.premium !== 1.0 || player.needsBonus;
  return (
    <tr className="border-b border-sandstone/30 last:border-0">
      <td className="py-1 pr-2 font-stat text-xs text-ink">{player.name}</td>
      <td className="py-1 pr-2 text-xs text-muted">{player.position}</td>
      <td className="py-1 pr-2 font-stat text-xs text-right text-muted">
        {player.rawValue.toFixed(1)}
      </td>
      <td className="py-1 font-stat text-xs text-right text-ink">
        {hasAdjustment ? player.adjustedValue.toFixed(1) : '-'}
        {player.needsBonus && (
          <span className="ml-1 text-green-600" title="Fills a team need">N</span>
        )}
        {player.premium > 1.0 && (
          <span className="ml-1 text-ballpark" title={`${((player.premium - 1) * 100).toFixed(0)}% positional premium`}>P</span>
        )}
      </td>
    </tr>
  );
}

export function TradeEvaluationPanel({ request }: TradeEvaluationPanelProps) {
  const { recommendation, reasoning, valueDiff, source, playerBreakdowns, fetchAiEval } =
    useTradeEvaluation(request);

  if (!recommendation) return null;

  const badgeColor = BADGE_COLORS[recommendation] ?? 'bg-sandstone text-ink';
  const diffLabel = valueDiff >= 0 ? `+${(valueDiff * 100).toFixed(0)}%` : `${(valueDiff * 100).toFixed(0)}%`;
  const managerStyle = request?.managerStyle;

  const offered = playerBreakdowns?.filter((p) => p.side === 'offered') ?? [];
  const requested = playerBreakdowns?.filter((p) => p.side === 'requested') ?? [];

  return (
    <div className="rounded-card border border-sandstone bg-old-lace/50 px-gutter py-3">
      <div className="flex items-center justify-between">
        <h4 className="font-headline text-xs font-bold text-muted">Trade Evaluation</h4>
        {managerStyle && (
          <span className="rounded-button bg-navy/80 px-2 py-0.5 text-[10px] font-bold uppercase text-cream">
            {STYLE_LABELS[managerStyle] ?? managerStyle}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span
          className={`rounded-button px-2 py-0.5 text-xs font-bold uppercase ${badgeColor}`}
        >
          {recommendation}
        </span>
        <span className="font-stat text-xs text-muted">Value: {diffLabel}</span>
      </div>

      {reasoning && (
        <p className="mt-2 text-xs leading-relaxed text-muted">{reasoning}</p>
      )}

      {playerBreakdowns && playerBreakdowns.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {offered.length > 0 && (
            <div>
              <h5 className="mb-1 text-[10px] font-bold uppercase text-muted">Giving Up</h5>
              <table className="w-full">
                <tbody>
                  {offered.map((p) => (
                    <BreakdownRow key={p.name} player={p} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {requested.length > 0 && (
            <div>
              <h5 className="mb-1 text-[10px] font-bold uppercase text-muted">Receiving</h5>
              <table className="w-full">
                <tbody>
                  {requested.map((p) => (
                    <BreakdownRow key={p.name} player={p} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {source === 'template' && (
        <button
          type="button"
          className="mt-2 text-xs text-ballpark underline hover:text-ink"
          onClick={fetchAiEval}
        >
          Get AI Evaluation
        </button>
      )}
    </div>
  );
}

export default TradeEvaluationPanel;
