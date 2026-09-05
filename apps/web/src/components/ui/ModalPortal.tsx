'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { lockScroll, unlockScroll } from '@/lib/modalScrollLock';

interface ModalPortalProps {
  children: React.ReactNode;
}

export function ModalPortal({ children }: ModalPortalProps) {
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
