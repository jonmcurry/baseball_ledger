/**
 * TypewriterText
 *
 * Character-by-character text reveal with blinking cursor.
 * Respects prefers-reduced-motion by showing full text immediately.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

export function TypewriterText({
  text,
  speed = 40,
  onComplete,
}: TypewriterTextProps) {
  const [visibleLength, setVisibleLength] = useState(0);
  const onCompleteRef = useRef(onComplete);

  const syncOnComplete = useCallback((fn: (() => void) | undefined) => {
    onCompleteRef.current = fn;
  }, []);

  useEffect(() => {
    syncOnComplete(onComplete);
  }, [onComplete, syncOnComplete]);

  // Animation effect: resets to 0 on text/speed changes and starts interval
  useEffect(() => {
    setVisibleLength(0); // eslint-disable-line react-hooks/set-state-in-effect -- intentional reset before starting animation
    let count = 0;
    const interval = setInterval(() => {
      count += 1;
      if (count >= text.length) {
        clearInterval(interval);
        setVisibleLength(text.length);
        onCompleteRef.current?.();
      } else {
        setVisibleLength(count);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  const visibleText = text.slice(0, visibleLength);

  return (
    <span role="status" aria-live="polite" className="font-headline">
      {visibleText}
      <span
        data-cursor=""
        className="inline-block w-[2px] h-[1em] bg-ink ml-0.5 align-text-bottom animate-pulse"
        aria-hidden="true"
      />
    </span>
  );
}
