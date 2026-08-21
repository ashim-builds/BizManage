'use client';

import { useEffect } from 'react';

export function GlobalNumberInputFix() {
  useEffect(() => {
    // Prevent mouse wheel from changing values in number inputs
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
        target.blur();
      }
    };

    // Auto-select text in number inputs on focus (so default 0 is overwritten instead of appended to)
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
        (target as HTMLInputElement).select();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('focusin', handleFocusIn);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('focusin', handleFocusIn);
    };
  }, []);

  return null;
}
