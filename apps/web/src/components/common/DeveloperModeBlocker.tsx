'use client';

import { useEffect } from 'react';

export function DeveloperModeBlocker() {
  useEffect(() => {
    // Detect mobile or touch-capable devices
    const isMobileDevice = () => {
      if (typeof window === 'undefined') return false;
      return (
        window.matchMedia('(pointer: coarse)').matches ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0)
      );
    };

    // If on a mobile or touch device, do not block context menu to allow native copy, paste, and selection
    if (isMobileDevice()) {
      return;
    }

    // Disable right-click on desktop, but allow within inputs, textareas, contenteditable, or selected text
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Allow right-click for text inputs, textareas, contenteditable elements
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('input, textarea, [contenteditable="true"]')
      ) {
        return;
      }

      // Allow right-click if user has selected text to copy
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        return;
      }

      e.preventDefault();
    };

    // Disable keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
      }
      
      // Ctrl+Shift+I / Cmd+Option+I - DevTools
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
      }
      
      // Ctrl+Shift+J / Cmd+Option+J - DevTools Console
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
      }
      
      // Ctrl+U / Cmd+U - View Source
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
        e.preventDefault();
      }
      
      // Ctrl+Shift+C / Cmd+Option+C - Inspect Element
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return null;
}
