'use client';

import { useEffect } from 'react';

export function PWAInstaller() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => console.log('BizManage PWA Service Worker Registered:', reg.scope))
          .catch((err) => console.log('Service Worker Registration Failed:', err));
      });
    }
  }, []);

  return null;
}
