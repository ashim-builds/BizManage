'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { lockScroll, unlockScroll } from '@/lib/modalScrollLock';

export function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    lockScroll();
    return () => {
      unlockScroll();
    };
  }, []);

  if (!mounted) return null;

  return createPortal(children, document.body);
}
