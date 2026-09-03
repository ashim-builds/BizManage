/**
 * Shared numeric input utility.
 *
 * Use this instead of type="number" across the entire app.
 *
 * Benefits:
 *  - No browser spinner arrows
 *  - No "e / + / -" weirdness from browser number inputs
 *  - Mobile shows numeric keypad (inputMode="decimal")
 *  - Only digits + one decimal point allowed
 *  - Auto-clears "0" on focus; restores "0" on blur if empty
 *
 * Usage (with react-hook-form):
 *   <input
 *     type="text"
 *     inputMode="decimal"
 *     onKeyDown={onNumericKeyDown}
 *     onFocus={onNumericFocus}
 *     onBlur={onNumericBlur}
 *     {...register('price', { valueAsNumber: true })}
 *   />
 */

import React from 'react';

/**
 * Blocks non-numeric keystrokes while allowing:
 *  - Digits 0-9
 *  - A single decimal point (.)
 *  - Navigation: Backspace, Delete, Tab, Escape, Enter, Arrow keys, Home, End
 *  - Clipboard shortcuts: Ctrl/Cmd + A, C, V, X, Z
 */
export function onNumericKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  const navigationKeys = [
    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Home', 'End',
  ];
  if (navigationKeys.includes(e.key)) return;
  if (e.ctrlKey || e.metaKey) return; // allow Ctrl+A, Ctrl+C, Ctrl+V, etc.
  if (e.key === '.' && !e.currentTarget.value.includes('.')) return; // one decimal
  if (!/^\d$/.test(e.key)) e.preventDefault();
}

/**
 * On focus: select all text so "0" (or any default) is immediately overwritten
 * when the user starts typing — no need to manually delete first.
 */
export function onNumericFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.select();
}

/**
 * On blur: if the field is left empty (or just a stray "."), restore "0"
 * and notify react-hook-form via a native change event.
 */
export function onNumericBlur(e: React.FocusEvent<HTMLInputElement>) {
  const val = e.target.value.trim();
  if (val === '' || val === '.') {
    // Write "0" back into the DOM element
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    nativeSetter?.call(e.target, '0');
    // Dispatch a change event so react-hook-form (and any other listeners) pick it up
    e.target.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

/**
 * Convenience spread for any <input> to make it numeric-only without type="number".
 * NOTE: when using react-hook-form, spread register() AFTER this so RHF's
 * onBlur is preserved for validation — then manually add onFocus={onNumericFocus}.
 *
 * @example
 * <input
 *   {...numericInputProps}
 *   onFocus={onNumericFocus}
 *   {...register('price', { valueAsNumber: true })}
 * />
 */
export const numericInputProps = {
  type: 'text' as const,
  inputMode: 'decimal' as const,
  onKeyDown: onNumericKeyDown,
  onFocus: onNumericFocus,
  autoComplete: 'off',
};
