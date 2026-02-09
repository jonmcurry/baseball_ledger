/**
 * StampAnimation
 *
 * REQ-SCH-009: "SEASON COMPLETED" stamp animation.
 * REQ-COMP-011: CSS animation patterns.
 *
 * Renders a dramatic stamp-slam effect when triggered. The stamp appears
 * large and rotated, then slams down to final position with a cubic-bezier
 * easing. Respects prefers-reduced-motion for accessibility.
 */

interface StampAnimationProps {
  text?: string;
  isVisible: boolean;
}

export function StampAnimation({ text = 'SEASON COMPLETED', isVisible }: StampAnimationProps) {
  if (!isVisible) return null;

  return (
    <div className="stamp-animation-container" role="status" aria-live="polite">
      <span className="stamp-animation-text">{text}</span>
    </div>
  );
}
