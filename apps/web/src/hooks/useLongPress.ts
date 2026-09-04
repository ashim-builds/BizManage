import { useCallback, useRef } from 'react';

interface UseLongPressOptions {
  /** How long to hold before triggering (ms). Default: 600 */
  delay?: number;
  /** Abort if the pointer moves more than this many px. Default: 10 */
  moveThreshold?: number;
}

interface LongPressHandlers {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onContextMenu: (e: React.MouseEvent | React.TouchEvent) => void;
}

/**
 * Fires `callback` when the user holds down on an element for `delay` ms.
 * Cancels if the pointer moves more than `moveThreshold` px (scroll gesture).
 * Suppresses the browser native context-menu so it doesn't conflict.
 */
export function useLongPress(
  callback: () => void,
  { delay = 600, moveThreshold = 10 }: UseLongPressOptions = {}
): LongPressHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPosRef.current = null;
    firedRef.current = false;
  }, []);

  const start = useCallback(
    (x: number, y: number) => {
      clear();
      startPosRef.current = { x, y };
      firedRef.current = false;
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        callback();
        // Small haptic pulse on supporting devices
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(30);
        }
      }, delay);
    },
    [callback, clear, delay]
  );

  const move = useCallback(
    (x: number, y: number) => {
      if (!startPosRef.current) return;
      const dx = Math.abs(x - startPosRef.current.x);
      const dy = Math.abs(y - startPosRef.current.y);
      if (dx > moveThreshold || dy > moveThreshold) {
        clear();
      }
    },
    [clear, moveThreshold]
  );

  return {
    onMouseDown: (e) => start(e.clientX, e.clientY),
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: (e) => {
      const t = e.touches[0];
      start(t.clientX, t.clientY);
    },
    onTouchEnd: clear,
    onTouchMove: (e) => {
      const t = e.touches[0];
      move(t.clientX, t.clientY);
    },
    onContextMenu: (e) => {
      // Only suppress context-menu if a long-press action was actually triggered
      if (firedRef.current) {
        e.preventDefault();
      }
    },
  };
}
