'use client';

import { useEffect, useState } from 'react';
import { Download, X, Smartphone, CheckCircle2 } from 'lucide-react';

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // 1. Service Worker Registration
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => console.log('BizManage PWA Service Worker Registered:', reg.scope))
          .catch((err) => console.log('Service Worker Registration Failed:', err));
      });
    }

    // 2. Check if already installed / running in standalone mode
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      if (isStandalone) {
        return; // Already running as an installed mobile app
      }

      // Check if user dismissed banner recently
      const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
      if (dismissed) {
        return;
      }

      // Check if iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIPhoneOrIPad = /iphone|ipad|ipod/.test(userAgent);
      if (isIPhoneOrIPad) {
        setIsIOS(true);
        // Show iOS banner after a short delay on mobile
        const timer = setTimeout(() => setShowBanner(true), 3000);
        return () => clearTimeout(timer);
      }

      // 3. Android / Chrome beforeinstallprompt event
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowBanner(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
            <img src="/logo-transparent.png" alt="BizManage" className="w-8 h-8 object-contain" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 truncate">
              <span>BizManage App</span>
              <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.2 rounded font-normal">Fast</span>
            </h4>
            <p className="text-[11px] text-zinc-400 truncate">
              {isIOS ? 'Install on your iPhone Home Screen' : 'Install mobile app for 1-tap instant access'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-black stroke-[2.5]" />
            <span>Install</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Safari Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full space-y-4 text-white shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-white" />
                <h3 className="font-bold text-sm text-white">Install on iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="space-y-3 text-xs text-zinc-300">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-zinc-800 text-white font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                <span>Tap the <strong>Share</strong> button (box with an upward arrow ⎋) at the bottom of Safari.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-zinc-800 text-white font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                <span>Scroll down and select <strong>'Add to Home Screen' (+)</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-zinc-800 text-white font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                <span>Tap <strong>'Add'</strong> in the top-right corner. BizManage will now appear as an app on your home screen!</span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
